import type { SubmitRecord } from "submitcms";
import type {
  Banner,
  GalleryImage,
  NavItem,
  Room,
  Service,
  SiteInfo,
} from "@/lib/content";
import { fallbackSite } from "@/data/fallback";

type Data = Record<string, unknown>;

/**
 * Alan kodları panelde serbestçe adlandırılabildiği için okuyucular birkaç
 * yaygın karşılığı sırayla dener; hiçbiri yoksa varsayılana düşer.
 */
function pick(data: Data, keys: string[]): unknown {
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function str(data: Data, keys: string[], fallback = ""): string {
  const value = pick(data, keys);
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function num(data: Data, keys: string[], fallback = 0): number {
  const value = pick(data, keys);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.,-]/g, "").replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function bool(data: Data, keys: string[], fallback = false): boolean {
  const value = pick(data, keys);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["1", "true", "evet", "yes"].includes(value.toLowerCase());
  return fallback;
}

/** Medya alanı: düz URL, `{url}` / `{src}` / `{path}` nesnesi ya da dizi. */
function mediaUrl(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return mediaUrl(value[0]);
  if (value && typeof value === "object") {
    const media = value as Record<string, unknown>;
    for (const key of ["url", "src", "path", "full", "original"]) {
      const candidate = media[key];
      if (typeof candidate === "string" && candidate) return candidate;
    }
  }
  return "";
}

function image(data: Data, keys: string[], fallback = ""): string {
  return mediaUrl(pick(data, keys)) || fallback;
}

/** `image` ile aynı; aşağıdaki mapper'larda okunurluk için ayrı ad. */
const image_ = image;

function gallery(data: Data, keys: string[], fallback: string[] = []): string[] {
  const value = pick(data, keys);
  if (Array.isArray(value)) {
    const urls = value.map(mediaUrl).filter(Boolean);
    if (urls.length) return urls;
  }
  return fallback;
}

/** Liste alanı: dizi, virgül/satır ayrılmış metin ya da `{label}` nesneleri. */
function list(data: Data, keys: string[], fallback: string[] = []): string[] {
  const value = pick(data, keys);

  if (Array.isArray(value)) {
    const items = value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const entry = item as Record<string, unknown>;
          for (const key of ["label", "name", "title", "value", "baslik", "ad"]) {
            if (typeof entry[key] === "string") return (entry[key] as string).trim();
          }
        }
        return "";
      })
      .filter(Boolean);
    if (items.length) return items;
  }

  if (typeof value === "string") {
    const items = value
      .split(/[\n,;•]/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (items.length) return items;
  }

  return fallback;
}

/** Zengin metni paragraflara böler; basit HTML etiketlerini temizler. */
function paragraphs(data: Data, keys: string[], fallback: string[] = []): string[] {
  const value = pick(data, keys);
  if (typeof value !== "string") return fallback;

  const items = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .split(/\n{2,}|\r\n{2,}/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return items.length ? items : fallback;
}

function slugify(value: string): string {
  const map: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
  };
  return value
    .toLowerCase()
    .replace(/[çğıöşü]/g, (char) => map[char] ?? char)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function toRoom(record: SubmitRecord): Room {
  const data = record.data ?? {};
  const name = str(data, ["ad", "baslik", "isim", "name", "title"], "Oda");

  return {
    slug: record.slug ?? slugify(name),
    name,
    summary: str(data, ["ozet", "kisa_aciklama", "summary", "excerpt"]),
    description: paragraphs(data, ["aciklama", "icerik", "description", "body"]),
    price: num(data, ["fiyat", "gecelik_fiyat", "price"], record.commerce?.price ?? 0),
    currency: str(data, ["para_birimi", "currency"], record.commerce?.currency ?? "TRY"),
    capacity: num(data, ["kapasite", "kisi", "capacity", "guests"], 2),
    size: num(data, ["alan", "metrekare", "size", "area"], 0),
    bed: str(data, ["yatak", "yatak_tipi", "bed"]),
    view: str(data, ["manzara", "view"]),
    image: image(data, ["gorsel", "kapak", "kapak_gorseli", "image", "cover"]),
    gallery: gallery(data, ["galeri", "gorseller", "gallery", "images"]),
    amenities: list(data, ["olanaklar", "ozellikler", "amenities", "features"]),
    featured: bool(data, ["one_cikan", "vitrin", "featured"]),
  };
}

export function toService(record: SubmitRecord): Service {
  const data = record.data ?? {};
  const name = str(data, ["ad", "baslik", "isim", "name", "title"], "Hizmet");

  return {
    slug: record.slug ?? slugify(name),
    name,
    summary: str(data, ["ozet", "kisa_aciklama", "summary", "excerpt"]),
    description: paragraphs(data, ["aciklama", "icerik", "description", "body"]),
    image: image(data, ["gorsel", "kapak", "kapak_gorseli", "image", "cover"]),
    hours: str(data, ["saatler", "calisma_saatleri", "hours", "schedule"]),
    location: str(data, ["konum", "yer", "location"]),
    highlights: list(data, ["detaylar", "ozellikler", "highlights", "features"]),
    featured: bool(data, ["one_cikan", "vitrin", "featured"]),
  };
}

/**
 * `delivery.init()` yanıtındaki site bilgisi. Alan adları kuruluma göre
 * değiştiği için eksik kalanlar demo içerikten tamamlanır.
 */
export function toSiteInfo(payload: Record<string, unknown> | undefined): SiteInfo {
  if (!payload) return fallbackSite;

  const site = ((payload.site ?? payload.environment ?? payload) as Data) ?? {};
  const contact = ((site.iletisim ?? site.contact ?? site) as Data) ?? {};

  return {
    name: str(site, ["ad", "isim", "name", "title", "site_name"], fallbackSite.name),
    tagline: str(site, ["slogan", "tagline", "subtitle"], fallbackSite.tagline),
    intro: paragraphs(site, ["hakkinda", "aciklama", "description", "about"], fallbackSite.intro),
    phone: str(contact, ["telefon", "phone", "tel"], fallbackSite.phone),
    whatsapp: str(contact, ["whatsapp", "wp"], fallbackSite.whatsapp),
    email: str(contact, ["eposta", "email", "mail"], fallbackSite.email),
    address: str(contact, ["adres", "address"], fallbackSite.address),
    district: str(contact, ["ilce", "sehir", "city", "district"], fallbackSite.district),
    mapUrl: str(contact, ["harita", "map_url", "maps"], fallbackSite.mapUrl),
    instagram: str(contact, ["instagram"], fallbackSite.instagram),
    checkIn: str(site, ["giris_saati", "check_in"], fallbackSite.checkIn),
    checkOut: str(site, ["cikis_saati", "check_out"], fallbackSite.checkOut),
  };
}

// ── Menü ────────────────────────────────────────────────────────────────────

/**
 * `delivery.menu(code)` → `{ items: [{ label, url, target, children }] }`.
 * Backend bağlantı hedefini çözer; burada yalnız kabuk normalize edilir.
 */
export function toNavItems(payload: unknown, depth = 0): NavItem[] {
  const raw = Array.isArray(payload)
    ? payload
    : ((payload as Data | undefined)?.items as unknown);

  if (!Array.isArray(raw) || depth > 2) return [];

  return raw
    .map((entry): NavItem | null => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Data;

      const label = str(item, ["label", "title", "ad", "name"]);
      const href = str(item, ["url", "href", "route", "link"]);
      if (!label || !href) return null;

      const target = item.target === "_blank" ? "_blank" : "_self";

      return {
        label,
        href,
        external: /^https?:\/\//i.test(href),
        target,
        children: toNavItems(item.children, depth + 1),
      };
    })
    .filter((item): item is NavItem => item !== null);
}

// ── Banner ──────────────────────────────────────────────────────────────────

/**
 * `delivery.banners()` → `banners` tablosu satırları
 * (`title, alt, photo, url, outlink, route, home, status`).
 */
export function toBanners(payload: unknown): Banner[] {
  const rows = Array.isArray(payload)
    ? payload
    : ((payload as Data | undefined)?.data as unknown);

  if (!Array.isArray(rows)) return [];

  return rows
    .map((entry, index): Banner | null => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Data;

      // status 0 olanlar panelde yayından kaldırılmıştır.
      if (row.status !== undefined && !bool(row, ["status"], true)) return null;

      const image = image_(row, ["photo", "gorsel", "image", "url"]);
      if (!image) return null;

      return {
        id: str(row, ["id"], String(index)),
        title: str(row, ["title", "baslik"]),
        alt: str(row, ["alt", "aciklama"]),
        image,
        href: str(row, ["outlink", "route", "link"]),
      };
    })
    .filter((item): item is Banner => item !== null);
}

// ── Galeri ──────────────────────────────────────────────────────────────────

/** `delivery.gallery(slug)` → `{ ...galeri, items: [{ image, description }] }`. */
export function toGalleryImages(payload: unknown): GalleryImage[] {
  const root = (payload ?? {}) as Data;
  const rows = Array.isArray(root.items)
    ? root.items
    : Array.isArray(root.images)
      ? root.images
      : Array.isArray(payload)
        ? payload
        : [];

  return rows
    .map((entry): GalleryImage | null => {
      if (typeof entry === "string") return { src: entry, alt: "" };
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Data;

      const src = image_(row, ["image", "url", "src", "photo", "gorsel"]);
      if (!src) return null;

      return { src, alt: str(row, ["alt", "title", "description", "aciklama"]) };
    })
    .filter((item): item is GalleryImage => item !== null);
}

// ── Site bilgisi (`site` içerik tipi) ───────────────────────────────────────

/**
 * `delivery.init()` yalnızca environment satırını döner (`title`, `url`,
 * `locale`) — telefon/adres orada yoktur. İletişim bilgileri panelde tek
 * kayıtlı `site` içerik tipinden okunur; ikisi burada birleştirilir.
 */
export function toSiteRecord(
  record: SubmitRecord | undefined,
  base: SiteInfo,
): SiteInfo {
  if (!record) return base;
  const data = record.data ?? {};

  return {
    name: str(data, ["ad", "isim", "name", "baslik"], base.name),
    tagline: str(data, ["slogan", "tagline", "ozet"], base.tagline),
    intro: paragraphs(data, ["hakkinda", "hikaye", "aciklama"], base.intro),
    phone: str(data, ["telefon", "phone", "tel"], base.phone),
    whatsapp: str(data, ["whatsapp", "wp"], base.whatsapp),
    email: str(data, ["eposta", "email", "mail"], base.email),
    address: str(data, ["adres", "address"], base.address),
    district: str(data, ["ilce", "sehir", "city"], base.district),
    mapUrl: str(data, ["harita", "map_url", "maps"], base.mapUrl),
    instagram: str(data, ["instagram"], base.instagram),
    checkIn: str(data, ["giris_saati", "check_in"], base.checkIn),
    checkOut: str(data, ["cikis_saati", "check_out"], base.checkOut),
  };
}
