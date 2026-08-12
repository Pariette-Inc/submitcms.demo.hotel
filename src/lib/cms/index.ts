import "server-only";
import { cache } from "react";
import type { TicketPayload } from "submitcms";
import { CONTENT_TYPES, type Room, type Service, type SiteInfo } from "@/lib/content";
import { fallbackRooms, fallbackServices, fallbackSite } from "@/data/fallback";
import { getCms, isCmsConfigured, reportCmsError } from "./client";
import { toRoom, toService, toSiteInfo } from "./mappers";

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

export const getSiteInfo = cache(async (): Promise<SiteInfo> => {
  const sdk = getCms();
  if (!sdk) return fallbackSite;

  try {
    const response = await sdk.delivery.init();
    return toSiteInfo(response.data);
  } catch (err) {
    reportCmsError("site bilgisi alınamadı", err);
    return fallbackSite;
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
