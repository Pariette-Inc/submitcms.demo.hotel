/**
 * İletişim/destek formu (submitcms `delivery.ticketForm` + `delivery.submitTicket`).
 *
 * Alan adları panelde tanımlıdır ve SDK payload'ı olduğu gibi geçirir. Bu yüzden
 * gönderim öncesi şema çekilir ve bizim form değerlerimiz şemadaki alan kodlarına
 * eşlenir. Şema alınamazsa (demo modu ya da servis hatası) varsayılan Türkçe
 * anahtarlarla gönderilir.
 */

export type TicketField = {
  code: string;
  label: string;
  type: string;
  required: boolean;
  options?: Array<{ value: string; label: string }>;
};

/** Formda topladığımız kanonik değerler. */
export type TicketValues = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
};

type CanonicalKey = keyof TicketValues;

/** Şema yokken kullanılan varsayılan alan adları. */
const DEFAULT_KEYS: Record<CanonicalKey, string> = {
  name: "ad",
  email: "eposta",
  phone: "telefon",
  subject: "konu",
  message: "mesaj",
};

/** Panelde karşılaşılabilecek alan kodu/etiket varyasyonları. */
const ALIASES: Record<CanonicalKey, string[]> = {
  name: ["adsoyad", "ad", "isim", "name", "fullname", "gonderen"],
  email: ["eposta", "email", "mail", "epostaadresi"],
  phone: ["telefon", "tel", "phone", "gsm", "cep", "ceptelefonu"],
  subject: ["konu", "baslik", "subject", "title"],
  message: ["mesaj", "icerik", "aciklama", "message", "body", "content", "detay", "yorum"],
};

function normalizeKey(value: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i" };
  return value
    .toLowerCase()
    .replace(/[çğıöşüİ]/g, (char) => map[char] ?? char)
    .replace(/[^a-z0-9]/g, "");
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  }
  if (value && typeof value === "object") {
    // { ad: {...}, eposta: {...} } biçimindeki şemalar
    return Object.entries(value as Record<string, unknown>).map(([code, definition]) =>
      definition && typeof definition === "object"
        ? { code, ...(definition as Record<string, unknown>) }
        : { code, label: String(definition ?? code) },
    );
  }
  return [];
}

/** `ticketForm()` yanıtını alan listesine indirger; şekli kuruluma göre değişebilir. */
export function normalizeTicketForm(payload: unknown): TicketField[] {
  if (!payload || typeof payload !== "object") return [];

  const root = payload as Record<string, unknown>;
  const candidate =
    root.fields ?? root.form ?? root.inputs ?? root.alanlar ?? root.data ?? root;

  return asRecordArray(candidate)
    .map((entry): TicketField | null => {
      const code = String(entry.code ?? entry.name ?? entry.key ?? entry.field ?? "").trim();
      if (!code) return null;

      const options = Array.isArray(entry.options)
        ? entry.options
            .map((option) => {
              if (typeof option === "string") return { value: option, label: option };
              if (option && typeof option === "object") {
                const item = option as Record<string, unknown>;
                const value = String(item.value ?? item.key ?? item.label ?? "");
                return value ? { value, label: String(item.label ?? value) } : null;
              }
              return null;
            })
            .filter((option): option is { value: string; label: string } => Boolean(option))
        : undefined;

      return {
        code,
        label: String(entry.label ?? entry.title ?? code),
        type: String(entry.type ?? "text"),
        required: entry.required === true || entry.required === 1 || entry.zorunlu === true,
        options,
      };
    })
    .filter((field): field is TicketField => field !== null);
}

function findField(fields: TicketField[], key: CanonicalKey): TicketField | undefined {
  const aliases = ALIASES[key];
  return fields.find((field) => {
    const code = normalizeKey(field.code);
    const label = normalizeKey(field.label);
    return aliases.some((alias) => code === alias || label === alias)
      || aliases.some((alias) => code.includes(alias) || label.includes(alias));
  });
}

export type TicketPayloadResult = {
  payload: Record<string, unknown>;
  /** Şemada zorunlu olup eşleyemediğimiz alanlar — sunucu log'una düşer. */
  unmatchedRequired: string[];
};

/**
 * Form değerlerini şemadaki alan kodlarına eşler. `extra` içindeki anahtarlar
 * (örn. rezervasyon detayları) olduğu gibi eklenir.
 */
export function buildTicketPayload(
  values: TicketValues,
  fields: TicketField[] | null,
  extra: Record<string, unknown> = {},
): TicketPayloadResult {
  const payload: Record<string, unknown> = { ...extra };

  if (!fields || fields.length === 0) {
    for (const [key, fallbackKey] of Object.entries(DEFAULT_KEYS) as Array<[CanonicalKey, string]>) {
      const value = values[key];
      if (value !== undefined && value !== "") payload[fallbackKey] = value;
    }
    return { payload, unmatchedRequired: [] };
  }

  const used = new Set<string>();
  const leftovers: string[] = [];
  const labels: Record<CanonicalKey, string> = {
    name: "Ad soyad",
    email: "E-posta",
    phone: "Telefon",
    subject: "Konu",
    message: "Mesaj",
  };

  for (const key of Object.keys(DEFAULT_KEYS) as CanonicalKey[]) {
    const value = values[key];
    if (value === undefined || value === "") continue;

    const field = findField(fields, key);
    if (field && !used.has(field.code)) {
      used.add(field.code);
      payload[field.code] = value;
      continue;
    }

    // Şemada karşılığı yok: uydurma anahtar göndermek yerine mesaja iliştir.
    leftovers.push(`${labels[key]}: ${value}`);
  }

  if (leftovers.length) {
    const messageField = findField(fields, "message");
    if (messageField && typeof payload[messageField.code] === "string") {
      payload[messageField.code] = `${payload[messageField.code]}\n\n${leftovers.join("\n")}`;
    } else if (messageField) {
      payload[messageField.code] = leftovers.join("\n");
    } else {
      payload[DEFAULT_KEYS.message] = leftovers.join("\n");
    }
  }

  const unmatchedRequired = fields
    .filter((field) => field.required && !(field.code in payload))
    .map((field) => field.code);

  return { payload, unmatchedRequired };
}
