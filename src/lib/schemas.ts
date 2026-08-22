import { z } from "zod";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const dateField = (label: string) =>
  z
    .string()
    .regex(isoDatePattern, `${label} geçerli bir tarih olmalı`)
    .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00`).getTime()), {
      message: `${label} geçerli bir tarih olmalı`,
    });

const phoneField = z
  .string()
  .trim()
  .regex(/^[0-9+()\s-]{10,20}$/, "Telefon numarası geçerli değil");

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const reservationSchema = z
  .object({
    checkIn: dateField("Giriş tarihi"),
    checkOut: dateField("Çıkış tarihi"),
    adults: z.coerce.number().int().min(1, "En az 1 yetişkin").max(6),
    children: z.coerce.number().int().min(0).max(4),
    room: optionalText(80),
    name: z.string().trim().min(3, "Ad soyad en az 3 karakter").max(80),
    email: z.email("Geçerli bir e-posta girin").max(120),
    phone: phoneField,
    note: optionalText(1000),
    consent: z.literal(true, {
      message: "Devam etmek için aydınlatma metnini onaylayın",
    }),
  })
  .refine(
    (value) =>
      new Date(`${value.checkOut}T00:00:00`).getTime() >
      new Date(`${value.checkIn}T00:00:00`).getTime(),
    { message: "Çıkış tarihi girişten sonra olmalı", path: ["checkOut"] },
  )
  .refine(
    (value) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(`${value.checkIn}T00:00:00`).getTime() >= today.getTime();
    },
    { message: "Giriş tarihi bugünden önce olamaz", path: ["checkIn"] },
  );

export type ReservationInput = z.infer<typeof reservationSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(3, "Ad soyad en az 3 karakter").max(80),
  email: z.email("Geçerli bir e-posta girin").max(120),
  phone: phoneField.optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Konu en az 3 karakter").max(120),
  message: z
    .string()
    .trim()
    .min(10, "Mesaj en az 10 karakter")
    .max(2000, "Mesaj en fazla 2000 karakter"),
  consent: z.literal(true, {
    message: "Devam etmek için aydınlatma metnini onaylayın",
  }),
});

export type ContactInput = z.infer<typeof contactSchema>;

/**
 * `POST /api/musaitlik` gövdesi. Kişisel veri taşımaz; yalnız oda ve tarih.
 * Rezervasyon formundaki alanların aynısı olduğu için aynı doğrulayıcılar.
 */
export const availabilityQuerySchema = z
  .object({
    room: z.string().trim().min(1, "Oda seçin").max(120),
    checkIn: dateField("Giriş tarihi"),
    checkOut: dateField("Çıkış tarihi"),
    quantity: z.coerce.number().int().min(1).max(5).optional(),
  })
  .refine(
    (value) =>
      new Date(`${value.checkOut}T00:00:00`).getTime() >
      new Date(`${value.checkIn}T00:00:00`).getTime(),
    { message: "Çıkış tarihi girişten sonra olmalı", path: ["checkOut"] },
  );

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
