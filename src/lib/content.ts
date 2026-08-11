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

export const CONTENT_TYPES = {
  room: "oda",
  service: "hizmet",
} as const;
