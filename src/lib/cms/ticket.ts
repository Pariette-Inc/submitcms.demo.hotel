import type { TicketPayload } from "submitcms";

/**
 * İletişim/rezervasyon formlarının submitcms ticket gövdesine çevrilmesi.
 *
 * Alan adları `submitcms@1.0.1` içindeki `TicketPayload` ile sabit: uç
 * `type, subject, user, name, email, gdpr, advertising, drp` alanlarını zorunlu
 * tutuyor (eksik gönderimde 422 + `errors` döner).
 */

export type TicketValues = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  /** Formdaki KVKK onayı. */
  consent: boolean;
};

/** Panelde tanımlı talep türü. Farklıysa env ile değiştirilir. */
const TICKET_TYPE = process.env.SUBMITCMS_TICKET_TYPE?.trim() || "iletisim";

/**
 * Misafir gönderimlerinde de `user` zorunlu olduğu için, kurulumda ayrı bir
 * değer verilmediyse gönderenin e-postası kimlik olarak kullanılır.
 */
const TICKET_USER = process.env.SUBMITCMS_TICKET_USER?.trim();

export function buildTicketPayload(
  values: TicketValues,
  extra: Record<string, unknown> = {},
): TicketPayload {
  return {
    type: TICKET_TYPE,
    subject: values.subject,
    message: values.message,
    user: TICKET_USER || values.email,
    name: values.name,
    email: values.email,
    ...(values.phone ? { phone: values.phone } : {}),
    // Onay alanları: sunucu üçünü de bekler. Reklam izni formda sorulmuyor,
    // bu yüzden açıkça false gider.
    gdpr: values.consent,
    advertising: false,
    drp: values.consent,
    ...extra,
  };
}
