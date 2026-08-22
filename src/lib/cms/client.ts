import "server-only";
import { SubmitCms, SubmitError } from "submitcms";
import { notifySafe } from "@/lib/sistemtakip";

// Birincil ad SUBMITCMS_TOKEN; submitcms'in kendi README örneği SUBMIT_TOKEN
// kullandığı için o da kabul edilir.
const token =
  process.env.SUBMITCMS_TOKEN?.trim() || process.env.SUBMIT_TOKEN?.trim();
const mode = process.env.SUBMITCMS_MODE === "test" ? "test" : "production";
const baseUrl = process.env.SUBMITCMS_API_URL?.trim() || undefined;

let sdk: SubmitCms | null = null;

if (!token) {
  console.warn(
    "[submitcms] SUBMITCMS_TOKEN tanımlı değil — içerik demo verisinden geliyor, " +
      "form gönderimleri hiçbir yere kaydedilmez.",
  );
}

/** submitcms yapılandırılmış mı — değilse site demo içerikle çalışır. */
export function isCmsConfigured(): boolean {
  return Boolean(token);
}

/**
 * Site token'ıyla çalışan SDK örneği. Yalnızca `delivery` ve `tracking`
 * modülleri kullanılır; ikisi de oturum istemez.
 */
export function getCms(): SubmitCms | null {
  if (!token) return null;

  sdk ??= new SubmitCms({
    mode,
    token,
    baseUrl,
    locale: "tr",
    timeout: 10_000,
    retry: { maxRetries: 2 },
  });

  return sdk;
}

/**
 * Aynı arıza için bildirim aralığı. submitcms bir tipi döndürmüyorsa her sayfa
 * isteği aynı hatayı üretir; kısıt olmadan SistemTakip'e dakikada onlarca
 * "odalar listelenemedi" düşer.
 */
const NOTIFY_COOLDOWN_MS = 15 * 60_000;

const lastNotifiedAt = new Map<string, number>();

function shouldNotify(context: string): boolean {
  const now = Date.now();
  const previous = lastNotifiedAt.get(context);

  if (previous !== undefined && now - previous < NOTIFY_COOLDOWN_MS) return false;

  lastNotifiedAt.set(context, now);
  return true;
}

/** `404` = içerik tipi/kayıt panelde henüz açılmamış. Arıza değil, eksik kurulum. */
export function isNotFound(err: unknown): boolean {
  return err instanceof SubmitError && err.code === 404;
}

function describe(err: unknown): string {
  if (err instanceof SubmitError) {
    return [
      `${err.code} — ${err.message}`,
      // 422'de hangi alanın reddedildiği yalnızca burada görünür.
      err.errors ? `alanlar: ${JSON.stringify(err.errors)}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Hatayı bildirir ve çağıranın demo içeriğe düşmesine izin verir.
 *
 * İki şeyi bilerek ayırıyoruz:
 *
 * - **404** — tip ya da kayıt panelde yok. Bu bir arıza değil, tamamlanmamış
 *   kurulumdur; sunucu log'una bir kez yazılır, bildirim gönderilmez.
 * - **Diğerleri** — gerçek arıza. Bildirim gider ama aynı bağlam için en çok
 *   15 dakikada bir; yoksa tek bir bozuk uç bildirim kanalını doldurur.
 */
export function reportCmsError(context: string, err: unknown): void {
  const detail = describe(err);

  if (isNotFound(err)) {
    // Kurulum eksiği: gürültü yapma, ama sessizce de yutma.
    if (shouldNotify(`404:${context}`)) {
      console.warn(
        `[submitcms] ${context}: panelde bulunamadı (404) — demo içerik gösteriliyor. ` +
          "İçerik tipi ve kayıtlar için: node scripts/submitcms-import.mjs site oda hizmet",
      );
    }
    return;
  }

  console.error(`[submitcms] ${context}: ${detail}`);

  if (shouldNotify(context)) {
    notifySafe("error", `submitcms: ${context}`, detail);
  }
}
