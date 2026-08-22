import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { SubmitError, type TicketPayload } from "submitcms";
import {
  CONTENT_TYPES,
  SITE_RECORD_SLUG,
  type Availability,
  type Banner,
  type BookingResult,
  type CalendarDay,
  type GalleryImage,
  type NavItem,
  type Room,
  type Service,
  type SiteInfo,
} from "@/lib/content";
import {
  fallbackGallery,
  fallbackRooms,
  fallbackServices,
  fallbackSite,
} from "@/data/fallback";
import { getCms, isCmsConfigured, reportCmsError } from "./client";
import {
  toBanners,
  toGalleryImages,
  toNavItems,
  toRoom,
  toService,
  toSiteInfo,
  toSiteRecord,
} from "./mappers";

export { isCmsConfigured };

const PER_PAGE = 50;

/**
 * İçerik önbelleği (saniye).
 *
 * SDK **axios** kullanıyor, `fetch` değil — yani Next'in fetch önbelleği bu
 * çağrılara hiç uygulanmaz. `react.cache` de yalnızca tek bir istek içinde
 * tekrarı önler. Bu ikisi olmadan `/rezervasyon` gibi dinamik sayfalar (arama
 * parametresi okudukları için `revalidate` onlara işlemez) her ziyarette
 * submitcms'e yeniden gider; uç bozuksa her ziyaret bir hata daha üretir.
 *
 * `unstable_cache` istekler arasında tutar. Next 16 bunun yerine `use cache`
 * öneriyor ama o `cacheComponents` bayrağını ve tüm dinamik API'lerin Suspense
 * altına alınmasını istiyor — ayrı bir taşıma işi.
 */
const CONTENT_TTL = 300;

/** Tek çağrıyla tüm içerik önbelleğini düşürmek için: `revalidateTag(CACHE_TAG)`. */
export const CACHE_TAG = "submitcms";

/**
 * Bir okuma çağrısını istekler arasında önbelleğe alır.
 *
 * Hata da önbelleğe girer (`null` olarak): amaç budur. Bozuk bir uç önbelleğe
 * girmezse her istek yeniden denenir ve her istek yeni bir bildirim üretir —
 * şikâyet konusu olan "sürekli çalışıyor" davranışı tam olarak budur. Böylece
 * arıza sürerken submitcms'e TTL başına bir istek gider, uç düzeldiğinde
 * içerik en geç TTL kadar sonra kendiliğinden döner.
 */
function cached<A extends unknown[], T>(
  key: string,
  run: (...args: A) => Promise<T | null>,
): (...args: A) => Promise<T | null> {
  return unstable_cache(run, ["submitcms", key], {
    revalidate: CONTENT_TTL,
    tags: [CACHE_TAG],
  });
}

const loadRooms = cached("oda:list", async (): Promise<Room[] | null> => {
  const sdk = getCms();
  if (!sdk) return null;

  try {
    const response = await sdk.delivery.records(CONTENT_TYPES.room, {
      per_page: PER_PAGE,
      locale: "tr",
    });
    const records = response.data ?? [];
    return records.length ? records.map(toRoom) : null;
  } catch (err) {
    reportCmsError("odalar listelenemedi", err);
    return null;
  }
});

export const getRooms = cache(
  async (): Promise<Room[]> => (await loadRooms()) ?? fallbackRooms,
);

const loadRoom = cached(
  "oda:item",
  async (slug: string): Promise<Room | null> => {
    const sdk = getCms();
    if (!sdk) return null;

    try {
      const response = await sdk.delivery.record(CONTENT_TYPES.room, slug, {
        locale: "tr",
      });
      return response.data ? toRoom(response.data) : null;
    } catch (err) {
      reportCmsError(`oda alınamadı: ${slug}`, err);
      return null;
    }
  },
);

export const getRoom = cache(async (slug: string): Promise<Room | null> => {
  const room = await loadRoom(slug);
  if (room) return room;

  // Tekil uç yoksa/boşsa listeden ara — demo modunda tek yol budur.
  const rooms = await getRooms();
  return rooms.find((item) => item.slug === slug) ?? null;
});

const loadServices = cached("hizmet:list", async (): Promise<Service[] | null> => {
  const sdk = getCms();
  if (!sdk) return null;

  try {
    const response = await sdk.delivery.records(CONTENT_TYPES.service, {
      per_page: PER_PAGE,
      locale: "tr",
    });
    const records = response.data ?? [];
    return records.length ? records.map(toService) : null;
  } catch (err) {
    reportCmsError("hizmetler listelenemedi", err);
    return null;
  }
});

export const getServices = cache(
  async (): Promise<Service[]> => (await loadServices()) ?? fallbackServices,
);

const loadService = cached(
  "hizmet:item",
  async (slug: string): Promise<Service | null> => {
    const sdk = getCms();
    if (!sdk) return null;

    try {
      const response = await sdk.delivery.record(CONTENT_TYPES.service, slug, {
        locale: "tr",
      });
      return response.data ? toService(response.data) : null;
    } catch (err) {
      reportCmsError(`hizmet alınamadı: ${slug}`, err);
      return null;
    }
  },
);

export const getService = cache(async (slug: string): Promise<Service | null> => {
  const service = await loadService(slug);
  if (service) return service;

  const services = await getServices();
  return services.find((item) => item.slug === slug) ?? null;
});

/**
 * Site bilgisi iki kaynaktan birleşir:
 *
 * 1. `delivery.init()` — environment satırı (`title`, `url`, `locale`).
 *    Telefon/adres orada YOKTUR, o tabloda böyle sütunlar yok.
 * 2. `site` içerik tipindeki tek kayıt — iletişim, saatler, hikâye metni.
 *
 * İkincisi birincinin üstüne yazar; ikisi de yoksa demo içerik kullanılır.
 */
const loadSiteInfo = cached("site", async (): Promise<SiteInfo | null> => {
  const sdk = getCms();
  if (!sdk) return null;

  let base = fallbackSite;
  let touched = false;

  try {
    const response = await sdk.delivery.init();
    base = toSiteInfo(response.data);
    touched = true;
  } catch (err) {
    reportCmsError("site bilgisi alınamadı", err);
  }

  try {
    const response = await sdk.delivery.record(
      CONTENT_TYPES.site,
      SITE_RECORD_SLUG,
      { locale: "tr" },
    );
    if (response.data) return toSiteRecord(response.data, base);
  } catch (err) {
    // `site` tipi açılmamışsa 404 normaldir; reportCmsError bunu bildirime
    // çevirmez, yalnız log'a yazar.
    reportCmsError("site kaydı alınamadı", err);
  }

  return touched ? base : null;
});

export const getSiteInfo = cache(
  async (): Promise<SiteInfo> => (await loadSiteInfo()) ?? fallbackSite,
);

/**
 * Ziyaretçi formlarını submitcms'e iletir (`delivery.submitTicket` →
 * `POST /api/public/ticket-submit`).
 * Bu uç site token'ıyla çalışır, oturum istemez.
 *
 * Önbelleğe ALINMAZ: yazma tarafıdır.
 *
 * Dönen `false` "kaydedilemedi" demektir; çağıran uç 502 döner.
 * submitcms yapılandırılmamışsa `null` döner — demo modu.
 */
export async function submitTicket(
  payload: TicketPayload,
): Promise<boolean | null> {
  const sdk = getCms();
  if (!sdk) return null;

  try {
    const response = await sdk.delivery.submitTicket(payload);

    if (response?.status === true) return true;

    if (response?.status === false) {
      reportCmsError(
        "form kaydı reddedildi",
        new Error(response.message ?? "status: false"),
      );
      return false;
    }

    // Beklenmedik zarf: başarı sayıp sessizce kaybetmektense hata olarak işle.
    reportCmsError(
      "form kaydı için beklenmedik yanıt",
      new Error(`anahtarlar: ${Object.keys(response ?? {}).join(", ") || "yok"}`),
    );
    return false;
  } catch (err) {
    reportCmsError("form kaydı iletilemedi", err);
    return false;
  }
}

// ── Gezinme, banner, galeri ─────────────────────────────────────────────────

/**
 * Panelde tanımlı menü (`delivery.menu(code)`). Menü yoksa 404 döner; o durumda
 * çağıran koddaki varsayılan gezinmeye düşer.
 */
const loadNavigation = cached(
  "menu",
  async (code: string): Promise<NavItem[] | null> => {
    const sdk = getCms();
    if (!sdk) return null;

    try {
      const response = await sdk.delivery.menu(code);
      const items = toNavItems(response.data);
      return items.length ? items : null;
    } catch (err) {
      // Menü açılmamışsa 404 normaldir; bildirim gitmez.
      reportCmsError(`menü alınamadı: ${code}`, err);
      return null;
    }
  },
);

/**
 * Panelde tanımlı menü (`delivery.menu(code)`). Menü yoksa boş liste döner ve
 * çağıran koddaki varsayılan gezinmeye düşer.
 */
export const getNavigation = cache(
  async (code: string): Promise<NavItem[]> => (await loadNavigation(code)) ?? [],
);

const loadBanners = cached("banners", async (): Promise<Banner[] | null> => {
  const sdk = getCms();
  if (!sdk) return null;

  try {
    const response = await sdk.delivery.banners();
    const banners = toBanners(response.data);
    return banners.length ? banners : null;
  } catch (err) {
    reportCmsError("bannerlar alınamadı", err);
    return null;
  }
});

export const getBanners = cache(
  async (): Promise<Banner[]> => (await loadBanners()) ?? [],
);

const loadGallery = cached(
  "gallery",
  async (slug: string): Promise<GalleryImage[] | null> => {
    const sdk = getCms();
    if (!sdk) return null;

    try {
      const response = await sdk.delivery.gallery(slug);
      const images = toGalleryImages(response.data);
      return images.length ? images : null;
    } catch (err) {
      reportCmsError(`galeri alınamadı: ${slug}`, err);
      return null;
    }
  },
);

/** Galeri şeridi. Panelde galeri yoksa demo kareleri kullanılır. */
export const getGallery = cache(async (slug: string): Promise<GalleryImage[]> => {
  const images = await loadGallery(slug);
  return images ?? fallbackGallery.map((src) => ({ src, alt: "" }));
});

// ── İlgili içerik ───────────────────────────────────────────────────────────

/** "Bunlar da ilginizi çekebilir" — `delivery.alsoRead()`. */
const loadAlsoRead = cached(
  "also-read",
  async (typeCode: string, slug: string) => {
    const sdk = getCms();
    if (!sdk) return null;

    try {
      const response = await sdk.delivery.alsoRead(typeCode, slug);
      const records = response.data ?? [];
      return records.length ? records : null;
    } catch (err) {
      reportCmsError(`ilgili içerik alınamadı: ${typeCode}/${slug}`, err);
      return null;
    }
  },
);

/** "Bunlar da ilginizi çekebilir" — `delivery.alsoRead()`. */
export const getRelatedRooms = cache(async (slug: string): Promise<Room[]> => {
  const records = await loadAlsoRead(CONTENT_TYPES.room, slug);
  if (records) return records.map(toRoom);

  // Uç yoksa/boşsa: aynı listeden kendisi dışındakiler.
  const rooms = await getRooms();
  return rooms.filter((room) => room.slug !== slug).slice(0, 3);
});

export const getRelatedServices = cache(async (slug: string): Promise<Service[]> => {
  const records = await loadAlsoRead(CONTENT_TYPES.service, slug);
  if (records) return records.map(toService);

  const services = await getServices();
  return services.filter((service) => service.slug !== slug).slice(0, 3);
});

// ── Görüntülenme ────────────────────────────────────────────────────────────

/**
 * Okuma/görüntülenme bildirimi (`delivery.ping`). Sayaç panelde tutulur;
 * hata yutulur — ziyaretçiye yansıtılacak bir şey değil.
 */
export async function pingRecord(
  typeCode: string,
  slug: string,
  duration = 0,
): Promise<boolean> {
  const sdk = getCms();
  if (!sdk) return false;

  try {
    await sdk.delivery.ping(typeCode, slug, duration);
    return true;
  } catch {
    return false;
  }
}

// ── Rezervasyon (ziyaretçi tarafı) ──────────────────────────────────────────

/**
 * `delivery.reservations.availability()` — oturum istemez, kalan kapasiteyi
 * DÖNMEZ. `null`: submitcms yapılandırılmamış ya da uç yanıt vermedi.
 */
export async function checkAvailability(
  slug: string,
  params: { starts_at: string; ends_at: string; quantity?: number },
): Promise<Availability | null> {
  const sdk = getCms();
  if (!sdk) return null;

  try {
    const response = await sdk.delivery.reservations.availability(
      CONTENT_TYPES.room,
      slug,
      params,
    );
    const data = response.data;
    if (!data) return null;

    return {
      available: Boolean(data.available),
      reason: data.reason ?? null,
      message: data.message ?? null,
      units: Number(data.units ?? 0),
      price: Number(data.price ?? 0),
      currency: data.currency || "TRY",
      breakdown: Array.isArray(data.breakdown) ? data.breakdown : [],
    };
  } catch (err) {
    // Rezervasyon modülü kapalıysa 403/404 gelir: "bilinmiyor" demek doğru
    // cevap, "dolu" demek değil.
    if (!(err instanceof SubmitError && [403, 404].includes(err.code))) {
      reportCmsError(`müsaitlik sorgulanamadı: ${slug}`, err);
    }
    return null;
  }
}

/** Gün gün müsaitlik takvimi. En çok 120 gün. */
export async function getCalendar(
  slug: string,
  params: { from: string; to: string },
): Promise<CalendarDay[] | null> {
  const sdk = getCms();
  if (!sdk) return null;

  try {
    const response = await sdk.delivery.reservations.calendar(
      CONTENT_TYPES.room,
      slug,
      params,
    );
    const days = response.data ?? [];
    return days.map((day) => ({
      date: String(day.date),
      available: Boolean(day.available),
      price: Number(day.price ?? 0),
    }));
  } catch (err) {
    if (!(err instanceof SubmitError && [403, 404].includes(err.code))) {
      reportCmsError(`takvim alınamadı: ${slug}`, err);
    }
    return null;
  }
}

export type BookingOutcome =
  | { ok: true; booking: BookingResult }
  /** Uç kuralı reddetti (dolu, sezon dışı, çok erken…). */
  | { ok: false; kind: "rejected"; message: string; reason: string | null }
  /** Kayıt rezervasyona açılmamış ya da modül kapalı — ticket hattına düşülür. */
  | { ok: false; kind: "unavailable"; message: string };

/**
 * Rezervasyon talebi (`delivery.reservations.book()`).
 *
 * `unavailable` dönmesi hata değildir: oda panelde rezervasyona açılmamış
 * olabilir. Çağıran uç bu durumda talebi ticket olarak kaydeder.
 */
export async function bookReservation(
  slug: string,
  payload: {
    starts_at: string;
    ends_at: string;
    guest_name: string;
    guest_email: string;
    quantity?: number;
    guests?: number;
    guest_phone?: string;
    note?: string;
  },
): Promise<BookingOutcome> {
  const sdk = getCms();
  if (!sdk) return { ok: false, kind: "unavailable", message: "CMS yapılandırılmamış" };

  try {
    const response = await sdk.delivery.reservations.book(
      CONTENT_TYPES.room,
      slug,
      payload,
    );
    const data = response.data;

    if (!data?.code) {
      return {
        ok: false,
        kind: "unavailable",
        message: "Rezervasyon ucundan beklenmedik yanıt geldi",
      };
    }

    return {
      ok: true,
      booking: {
        code: String(data.code),
        status: String(data.status ?? "pending"),
        startsAt: String(data.starts_at ?? payload.starts_at),
        endsAt: String(data.ends_at ?? payload.ends_at),
        quantity: Number(data.quantity ?? 1),
        price: Number(data.price ?? 0),
        currency: data.currency || "TRY",
      },
    };
  } catch (err) {
    if (err instanceof SubmitError) {
      // 422 = kural ihlali; ziyaretçiye gerekçeyi söyleyebiliriz.
      if (err.code === 422) {
        return {
          ok: false,
          kind: "rejected",
          message: err.message,
          reason: readReason(err),
        };
      }

      // 403/404 = modül kapalı ya da kayıt rezervasyona açılmamış.
      if (err.code === 403 || err.code === 404) {
        return { ok: false, kind: "unavailable", message: err.message };
      }
    }

    reportCmsError(`rezervasyon yazılamadı: ${slug}`, err);
    return { ok: false, kind: "unavailable", message: "Rezervasyon ucu yanıt vermedi" };
  }
}

/** 422 gövdesindeki makine okunur gerekçe (`full`, `outside_season`…). */
function readReason(err: SubmitError): string | null {
  return err.errors?.reason?.[0] ?? null;
}
