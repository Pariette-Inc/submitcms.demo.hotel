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

/** Hatayı bildirir ve çağıranın demo içeriğe düşmesine izin verir. */
export function reportCmsError(context: string, err: unknown): void {
  const detail =
    err instanceof SubmitError
      ? `${err.code} — ${err.message}`
      : err instanceof Error
        ? err.message
        : String(err);

  notifySafe("error", `submitcms: ${context}`, detail);
}
