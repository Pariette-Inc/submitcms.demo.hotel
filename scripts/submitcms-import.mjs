#!/usr/bin/env node
/**
 * submitcms içe aktarma — içerik tipi + kayıtlar.
 *
 *   node scripts/submitcms-import.mjs hizmet
 *   node scripts/submitcms-import.mjs hizmet oda
 *   node scripts/submitcms-import.mjs hizmet --dry-run
 *
 * Kaynak: submitcms/content-types/<kod>.json ve submitcms/records/<kod>.json
 *
 * Yazma tarafı oturum ister (delivery değil). Kimlik .env.local'den okunur:
 *   SUBMITCMS_TOKEN, SUBMITCMS_CONSOLE_EMAIL, SUBMITCMS_CONSOLE_PASSWORD
 *
 * Tekrar çalıştırmak güvenlidir: var olan tip yeniden oluşturulmaz, aynı
 * slug'a sahip kayıt güncellenir.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SubmitCms, SubmitError } from 'submitcms'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── .env.local ──────────────────────────────────────────────────────────────
for (const file of ['.env.local', '.env']) {
  const path = join(ROOT, file)
  if (!existsSync(path)) continue
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (!match) continue
    const value = match[2].replace(/^['"]|['"]$/g, '')
    if (value && !process.env[match[1]]) process.env[match[1]] = value
  }
}

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const codes = argv.filter((arg) => !arg.startsWith('--'))

if (codes.length === 0) {
  console.error('Kullanım: node scripts/submitcms-import.mjs <tip-kodu…> [--dry-run]')
  process.exit(1)
}

const { SUBMITCMS_TOKEN, SUBMITCMS_CONSOLE_EMAIL, SUBMITCMS_CONSOLE_PASSWORD } = process.env

if (!SUBMITCMS_TOKEN) {
  console.error('SUBMITCMS_TOKEN yok — .env.local içine ekleyin.')
  process.exit(1)
}

const sdk = new SubmitCms({
  mode: process.env.SUBMITCMS_MODE === 'test' ? 'test' : 'production',
  token: SUBMITCMS_TOKEN,
  baseUrl: process.env.SUBMITCMS_API_URL || undefined,
  locale: 'tr',
  timeout: 20_000,
})

const log = (...args) => console.log(...args)
const fail = (context, err) => {
  if (err instanceof SubmitError) {
    log(`   ✗ ${context}: ${err.code} — ${err.message}`)
    if (err.errors) log('     alanlar:', JSON.stringify(err.errors))
  } else {
    log(`   ✗ ${context}: ${err?.message ?? err}`)
  }
}

/** Şablondaki alan tanımını SDK'nın FieldDefinition biçimine çevirir. */
function toFieldDefinition(field, supportedTypes) {
  const type = supportedTypes && !supportedTypes.includes(field.type) ? null : field.type
  return {
    definition: {
      code: field.key,
      label: field.label,
      type: field.type,
      ...(field.required ? { required: true } : {}),
      ...(field.options ? { options: field.options } : {}),
      ...(field.help || field.width || field.indexed
        ? { settings: { help: field.help, width: field.width, indexed: field.indexed } }
        : {}),
    },
    unsupported: type === null ? field.type : null,
  }
}

async function ensureContentType(code, supportedTypes) {
  const template = JSON.parse(
    readFileSync(join(ROOT, 'submitcms/content-types', `${code}.json`), 'utf8'),
  )

  try {
    const existing = await sdk.contentTypes.get(code)
    if (existing?.data) {
      log(`   • tip zaten var (id ${existing.data.id}, sürüm ${existing.data.version}) — atlandı`)
      return existing.data
    }
  } catch (err) {
    if (!(err instanceof SubmitError) || err.code !== 404) throw err
  }

  const mapped = template.schema.fields.map((field) => toFieldDefinition(field, supportedTypes))
  const unsupported = mapped.filter((item) => item.unsupported)

  if (unsupported.length) {
    log(`   ! panelin tanımadığı alan tipleri: ${unsupported.map((i) => i.unsupported).join(', ')}`)
    log(`     desteklenenler: ${supportedTypes?.join(', ') ?? 'alınamadı'}`)
    log('     şablondaki "type" değerlerini bunlardan biriyle değiştirip tekrar çalıştırın.')
    return null
  }

  const payload = {
    code: template.code,
    label: template.name,
    kind: template.kind ?? 'content',
    fields: mapped.map((item) => item.definition),
    options: template.options ?? {},
  }

  if (dryRun) {
    log(`   [dry-run] tip oluşturulacaktı: ${payload.code} (${payload.fields.length} alan)`)
    return { id: 0, code: payload.code }
  }

  const created = await sdk.contentTypes.create(payload)
  log(`   ✓ tip oluşturuldu: ${payload.code} (${payload.fields.length} alan)`)
  return created.data
}

async function importRecords(code) {
  const file = JSON.parse(
    readFileSync(join(ROOT, 'submitcms/records', `${code}.json`), 'utf8'),
  )

  const existingBySlug = new Map()
  try {
    const current = await sdk.records.list(code, { per_page: 100, locale: file.locale })
    for (const record of current.data ?? []) existingBySlug.set(record.slug, record.id)
  } catch (err) {
    if (!(err instanceof SubmitError) || err.code !== 404) fail('mevcut kayıtlar okunamadı', err)
  }

  let created = 0
  let updated = 0

  for (const record of file.records) {
    const payload = {
      data: record.data,
      slug: record.slug,
      status: file.status ?? 'published',
      locale: file.locale ?? 'tr',
      ...(record.seo ? { seo: record.seo } : {}),
      ...(record.commerce ? { commerce: record.commerce } : {}),
    }

    const existingId = existingBySlug.get(record.slug)

    if (dryRun) {
      log(`   [dry-run] ${existingId ? 'güncellenecek' : 'oluşturulacak'}: ${record.slug}`)
      continue
    }

    try {
      if (existingId) {
        await sdk.records.update(code, existingId, payload)
        updated += 1
        log(`   ↻ ${record.slug}`)
      } else {
        await sdk.records.create(code, payload)
        created += 1
        log(`   + ${record.slug}`)
      }
    } catch (err) {
      fail(record.slug, err)
    }
  }

  if (!dryRun) log(`   ${created} yeni, ${updated} güncellendi`)
}

async function verify(code) {
  try {
    const response = await sdk.delivery.records(code, { per_page: 100, locale: 'tr' })
    const records = response.data ?? []
    log(`   ✓ delivery doğrulaması: ${records.length} yayımlanmış kayıt`)
    for (const record of records.slice(0, 3)) {
      const title = record.data?.ad ?? record.data?.baslik ?? '(başlık yok)'
      log(`     - ${record.slug}: ${title}`)
    }
  } catch (err) {
    fail('delivery doğrulaması', err)
  }
}

// ── Akış ────────────────────────────────────────────────────────────────────
if (!SUBMITCMS_CONSOLE_EMAIL || !SUBMITCMS_CONSOLE_PASSWORD) {
  console.error(
    'Panel oturumu gerekiyor. .env.local içine ekleyin:\n' +
      '  SUBMITCMS_CONSOLE_EMAIL=...\n  SUBMITCMS_CONSOLE_PASSWORD=...',
  )
  process.exit(1)
}

try {
  await sdk.auth.console({
    email: SUBMITCMS_CONSOLE_EMAIL,
    password: SUBMITCMS_CONSOLE_PASSWORD,
  })
  log('✓ panel oturumu açıldı')
} catch (err) {
  fail('panel girişi', err)
  process.exit(1)
}

let supportedTypes = null
try {
  const response = await sdk.schema.fieldTypes()
  supportedTypes = (response.data ?? []).map((item) => item.type)
  log(`✓ desteklenen alan tipleri: ${supportedTypes.join(', ')}`)
} catch (err) {
  fail('alan tipleri alınamadı (kontrol atlanacak)', err)
}

for (const code of codes) {
  log(`\n▸ ${code}${dryRun ? ' (dry-run)' : ''}`)
  try {
    const type = await ensureContentType(code, supportedTypes)
    if (!type) continue
    await importRecords(code)
    if (!dryRun) await verify(code)
  } catch (err) {
    fail(code, err)
  }
}

log('\nBitti.')
