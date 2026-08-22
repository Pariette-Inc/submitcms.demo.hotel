#!/usr/bin/env node
/**
 * submitcms içe aktarma — içerik tipi + kayıtlar.
 *
 *   node scripts/submitcms-import.mjs hizmet
 *   node scripts/submitcms-import.mjs site oda hizmet
 *   node scripts/submitcms-import.mjs hizmet --dry-run
 *
 * İçerik tipinin dışındaki panel parçaları ayrı bayraklarla kurulur:
 *
 *   --menus          ana-menu / alt-menu (sdk.menus)
 *   --reservations   `oda` kayıtlarını rezervasyona açar (sdk.reservations.settings)
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
const withMenus = argv.includes('--menus')
const withReservations = argv.includes('--reservations')
const codes = argv.filter((arg) => !arg.startsWith('--'))

if (codes.length === 0 && !withMenus && !withReservations) {
  console.error(
    'Kullanım: node scripts/submitcms-import.mjs <tip-kodu…> [--menus] [--reservations] [--dry-run]',
  )
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

// ── Menüler ─────────────────────────────────────────────────────────────────

/**
 * Site gezinmesi. `delivery.menu(code)` bunları çözülmüş ağaç olarak döner;
 * menü yoksa site koddaki varsayılan gezinmeye düşer (bkz. src/app/layout.tsx).
 *
 * DİKKAT — `sdk.menus.create/update` burada KULLANILMIYOR. SDK 1.1.0 gövdeyi
 * `{ code, label, items }` diye kuruyor, `POST/PUT /api/menus` ise
 * `{ code, name, tree }` doğruluyor: SDK ile çağırınca 422 dönüyor
 * ("name alanı gerekli", ağaç da yazılmıyor). Uç sözleşmesi doğru olan, bu
 * yüzden istek `sdk.client` üzerinden elle kuruluyor. SDK düzeltilince
 * buradaki iki çağrı `sdk.menus.*` ile değiştirilebilir.
 */
const MENUS = [
  {
    code: 'ana-menu',
    label: 'Ana menü',
    items: [
      { type: 'url', label: 'Odalar', url: '/odalar' },
      { type: 'url', label: 'Hizmetler', url: '/hizmetler' },
      { type: 'url', label: 'İletişim', url: '/iletisim' },
    ],
  },
  {
    code: 'alt-menu',
    label: 'Alt menü',
    items: [
      { type: 'url', label: 'Odalar', url: '/odalar' },
      { type: 'url', label: 'Hizmetler', url: '/hizmetler' },
      { type: 'url', label: 'Rezervasyon', url: '/rezervasyon' },
      { type: 'url', label: 'İletişim', url: '/iletisim' },
    ],
  },
]

async function ensureMenus() {
  for (const menu of MENUS) {
    if (dryRun) {
      log(`   [dry-run] menü: ${menu.code} (${menu.items.length} bağlantı)`)
      continue
    }

    try {
      let exists = false
      try {
        const current = await sdk.menus.get(menu.code)
        exists = Boolean(current?.data)
      } catch (err) {
        if (!(err instanceof SubmitError) || err.code !== 404) throw err
      }

      if (exists) {
        await sdk.client.put(`/api/menus/${menu.code}`, {
          name: menu.label,
          tree: menu.items,
        })
        log(`   ↻ ${menu.code}`)
      } else {
        await sdk.client.post('/api/menus', {
          code: menu.code,
          name: menu.label,
          tree: menu.items,
        })
        log(`   + ${menu.code}`)
      }

      const published = await sdk.delivery.menu(menu.code)
      const items = published?.data?.items ?? []
      log(`     delivery doğrulaması: ${items.length} bağlantı`)
    } catch (err) {
      fail(`menü ${menu.code}`, err)
    }
  }
}

// ── Rezervasyon ─────────────────────────────────────────────────────────────

/**
 * Bir kaydı rezervasyona AÇAN çağrı `settings.save()`'dir; ayarı olmayan
 * kayıtta müsaitlik `not_reservable` döner ve site talebi ticket'a düşürür.
 *
 * `auto_confirm: false` bilerek: talep `pending` gelir, personel onaylar.
 * `reservations` modülü kapalıysa uç 403 döner — o zaman panelden açılmalı.
 */
async function openReservations() {
  let rooms = []
  try {
    const response = await sdk.records.list('oda', { per_page: 100, locale: 'tr' })
    rooms = response.data ?? []
  } catch (err) {
    fail('oda kayıtları okunamadı', err)
    return
  }

  if (!rooms.length) {
    log('   ! önce `oda` kayıtlarını aktarın (node scripts/submitcms-import.mjs oda)')
    return
  }

  for (const room of rooms) {
    const price = Number(room.data?.fiyat ?? room.commerce?.price ?? 0)
    const payload = {
      capacity: 1,
      unit: 'night',
      min_units: 1,
      lead_time_hours: 6,
      auto_confirm: false,
      base_price: price,
      currency: 'TRY',
      active: true,
    }

    if (dryRun) {
      log(`   [dry-run] rezervasyona açılacaktı: ${room.slug} (${price} TRY/gece)`)
      continue
    }

    try {
      await sdk.reservations.settings.save(room.id, payload)
      log(`   ✓ ${room.slug} — ${price} TRY/gece, kapasite 1, onay bekler`)
    } catch (err) {
      fail(`rezervasyon ayarı ${room.slug}`, err)
      if (err instanceof SubmitError && err.code === 403) {
        log('     `reservations` modülü kapalı görünüyor; panelden açılması gerekiyor.')
        return
      }
    }
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

if (withMenus) {
  log(`\n▸ menüler${dryRun ? ' (dry-run)' : ''}`)
  await ensureMenus()
}

if (withReservations) {
  log(`\n▸ rezervasyon ayarları${dryRun ? ' (dry-run)' : ''}`)
  await openReservations()
}

log('\nBitti.')
