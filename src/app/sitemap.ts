import type { MetadataRoute } from "next";
import { getRooms, getServices } from "@/lib/cms";

export const revalidate = 3600;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [rooms, services] = await Promise.all([getRooms(), getServices()]);

  const staticRoutes = ["", "/odalar", "/hizmetler", "/rezervasyon", "/iletisim"].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  return [
    ...staticRoutes,
    ...rooms.map((room) => ({
      url: `${siteUrl}/odalar/${room.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...services.map((service) => ({
      url: `${siteUrl}/hizmetler/${service.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
