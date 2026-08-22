/**
 * Site genelinde kullanılan içerik tipleri.
 * submitcms `oda` / `hizmet` içerik tiplerinin kayıtları bu şekle çevrilir
 * (bkz. src/lib/cms/mappers.ts).
 */

export type Room = {
  slug: string;
  name: string;
  summary: string;
  description: string[];
  price: number;
  currency: string;
  capacity: number;
  size: number;
  bed: string;
  view: string;
  image: string;
  gallery: string[];
  amenities: string[];
  featured: boolean;
};

export type Service = {
  slug: string;
  name: string;
  summary: string;
  description: string[];
  image: string;
  hours: string;
  location: string;
  highlights: string[];
  featured: boolean;
};

export type SiteInfo = {
  name: string;
  tagline: string;
  intro: string[];
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  district: string;
  mapUrl: string;
  instagram: string;
  checkIn: string;
  checkOut: string;
};


/** `delivery.menu(code)` → çözülmüş menü ağacı. */
export type NavItem = {
  label: string;
  href: string;
  external: boolean;
  target: "_self" | "_blank";
  children: NavItem[];
};

/** `delivery.banners()` → ana sayfa duyuru şeridi. */
export type Banner = {
  id: string;
  title: string;
  alt: string;
  image: string;
  href: string;
};

/** `delivery.gallery(slug)` → galeri şeridi karesi. */
export type GalleryImage = {
  src: string;
  alt: string;
};

/** `delivery.reservations.availability()` yanıtı. */
export type Availability = {
  available: boolean;
  /** `full`, `outside_season`, `too_soon`… — makine okunur gerekçe. */
  reason: string | null;
  message: string | null;
  /** Kaç gece/gün/saat sayıldı. */
  units: number;
  price: number;
  currency: string;
  breakdown: Array<{ date: string; price: number }>;
};

/** `delivery.reservations.calendar()` — gün gün müsaitlik. Kalan adet dönmez. */
export type CalendarDay = {
  date: string;
  available: boolean;
  price: number;
};

/** `delivery.reservations.book()` yanıtı. */
export type BookingResult = {
  code: string;
  status: string;
  startsAt: string;
  endsAt: string;
  quantity: number;
  price: number;
  currency: string;
};

export const CONTENT_TYPES = {
  room: "oda",
  service: "hizmet",
  /** Tek kayıtlı ayar tipi: iletişim, saatler, hikâye metni. */
  site: "site",
} as const;

/** Panelde açılan menülerin kodları. Yoksa koddaki varsayılan menü kullanılır. */
export const MENU_CODES = {
  header: "ana-menu",
  footer: "alt-menu",
} as const;

/** Ana sayfadaki galeri şeridinin panel slug'ı. */
export const GALLERY_SLUG = "anasayfa";

/** `site` kaydının slug'ı — tek kayıtlı tip. */
export const SITE_RECORD_SLUG = "genel";
