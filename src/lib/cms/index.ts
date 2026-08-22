import "server-only";
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

export const getRooms = cache(async (): Promise<Room[]> => {
  const sdk = getCms();
  if (!sdk) return fallbackRooms;

  try {
    const response = await sdk.delivery.records(CONTENT_TYPES.room, {
      per_page: PER_PAGE,
      locale: "tr",
    });
    const records = response.data ?? [];
    return records.length ? records.map(toRoom) : fallbackRooms;
  } catch (err) {
    reportCmsError("odalar listelenemedi", err);
    return fallbackRooms;
  }
});

export const getRoom = cache(async (slug: string): Promise<Room | null> => {
  const sdk = getCms();

  if (sdk) {
    try {
      const response = await sdk.delivery.record(CONTENT_TYPES.room, slug, {
        locale: "tr",
      });
      if (response.data) return toRoom(response.data);
    } catch (err) {
      reportCmsError(`oda alınamadı: ${slug}`, err);
    }
  }

  const rooms = await getRooms();
  return rooms.find((room) => room.slug === slug) ?? null;
});

export const getServices = cache(async (): Promise<Service[]> => {
  const sdk = getCms();
  if (!sdk) return fallbackServices;

  try {
    const response = await sdk.delivery.records(CONTENT_TYPES.service, {
      per_page: PER_PAGE,
      locale: "tr",
    });
    const records = response.data ?? [];
    return records.length ? records.map(toService) : fallbackServices;
  } catch (err) {
    reportCmsError("hizmetler listelenemedi", err);
    return fallbackServices;
  }
});

export const getService = cache(async (slug: string): Promise<Service | null> => {
  const sdk = getCms();

  if (sdk) {
    try {
      const response = await sdk.delivery.record(CONTENT_TYPES.service, slug, {
        locale: "tr",
      });
      if (response.data) return toService(response.data);
    } catch (err) {
      reportCmsError(`hizmet alınamadı: ${slug}`, err);
    }
  }

  const services = await getServices();
  return services.find((service) => service.slug === slug) ?? null;
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
export const getSiteInfo = cache(async (): Promise<SiteInfo> => {
  const sdk = getCms();
  if (!sdk) return fallbackSite;

  let base = fallbackSite;

  try {
    const response = await sdk.delivery.init();
    base = toSiteInfo(response.data);
  } catch (err) {
    reportCmsError("site bilgisi alınamadı", err);
  }

  try {
    const response = await sdk.delivery.record(
      CONTENT_TYPES.site,
      SITE_RECORD_SLUG,
      { locale: "tr" },
    );
    return toSiteRecord(response.data, base);
  } catch (err) {
    // `site` tipi açılmamışsa 404 normaldir.
    if (!(err instanceof SubmitError && err.code === 404)) {
      reportCmsError("site kaydı alınamadı", err);
    }
    return base;
  }
});

/**
 * Ziyaretçi formlarını submitcms'e iletir (`delivery.submitTicket` →
 * `POST /api/public/ticket-submit`).
 * Bu uç site token'ıyla çalışır, oturum istemez.
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
export const getNavigation = cache(
  async (code: string): Promise<NavItem[]> => {
    const sdk = getCms();
    if (!sdk) return [];

    try {
      const response = await sdk.delivery.menu(code);
      return toNavItems(response.data);
    } catch (err) {
      // Menü açılmamışsa 404 normaldir — gürültü yapma, sessizce boş dön.
      if (err instanceof SubmitError && err.code === 404) return [];
      reportCmsError(`menü alınamadı: ${code}`, err);
      return [];
    }
  },
);

export const getBanners = cache(async (): Promise<Banner[]> => {
  const sdk = getCms();
  if (!sdk) return [];

  try {
    const response = await sdk.delivery.banners();
    return toBanners(response.data);
  } catch (err) {
    if (err instanceof SubmitError && err.code === 404) return [];
    reportCmsError("bannerlar alınamadı", err);
    return [];
  }
});

/** Galeri şeridi. Panelde galeri yoksa demo kareleri kullanılır. */
export const getGallery = cache(
  async (slug: string): Promise<GalleryImage[]> => {
    const sdk = getCms();
    const fallback = fallbackGallery.map((src) => ({ src, alt: "" }));
    if (!sdk) return fallback;

    try {
      const response = await sdk.delivery.gallery(slug);
      const images = toGalleryImages(response.data);
      return images.length ? images : fallback;
    } catch (err) {
      if (!(err instanceof SubmitError && err.code === 404)) {
        reportCmsError(`galeri alınamadı: ${slug}`, err);
      }
      return fallback;
    }
  },
);

// ── İlgili içerik ───────────────────────────────────────────────────────────

/** "Bunlar da ilginizi çekebilir" — `delivery.alsoRead()`. */
export const getRelatedRooms = cache(
  async (slug: string): Promise<Room[]> => {
    const records = await alsoRead(CONTENT_TYPES.room, slug);
    if (records) return records.map(toRoom);

    // CMS yoksa/boşsa: aynı listeden kendisi dışındakiler.
    const rooms = await getRooms();
    return rooms.filter((room) => room.slug !== slug).slice(0, 3);
  },
);

export const getRelatedServices = cache(
  async (slug: string): Promise<Service[]> => {
    const records = await alsoRead(CONTENT_TYPES.service, slug);
    if (records) return records.map(toService);

    const services = await getServices();
    return services.filter((service) => service.slug !== slug).slice(0, 3);
  },
);

async function alsoRead(typeCode: string, slug: string) {
  const sdk = getCms();
  if (!sdk) return null;

  try {
    const response = await sdk.delivery.alsoRead(typeCode, slug);
    const records = response.data ?? [];
    return records.length ? records : null;
  } catch (err) {
    if (!(err instanceof SubmitError && err.code === 404)) {
      reportCmsError(`ilgili içerik alınamadı: ${typeCode}/${slug}`, err);
    }
    return null;
  }
}

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
