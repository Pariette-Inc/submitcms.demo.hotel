"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Field, inputClass } from "@/components/form-field";
import { Button } from "@/components/ui";
import { reservationSchema } from "@/lib/schemas";
import { formatPrice, isoDate, nightsBetween } from "@/lib/utils";

export type RoomOption = {
  slug: string;
  name: string;
  price: number;
  currency: string;
  capacity: number;
};

type Values = {
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  room: string;
  name: string;
  email: string;
  phone: string;
  note: string;
  consent: boolean;
};

type Errors = Partial<Record<keyof Values | "form", string>>;

export function ReservationForm({
  rooms,
  defaults,
}: {
  rooms: RoomOption[];
  defaults: { checkIn: string; checkOut: string; adults: string; room: string };
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>({
    checkIn: defaults.checkIn,
    checkOut: defaults.checkOut,
    adults: defaults.adults,
    children: "0",
    room: defaults.room,
    name: "",
    email: "",
    phone: "",
    note: "",
    consent: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  const nights = nightsBetween(values.checkIn, values.checkOut);
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.slug === values.room),
    [rooms, values.room],
  );
  const estimate = selectedRoom && nights > 0 ? selectedRoom.price * nights : 0;

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      ...values,
      adults: Number(values.adults),
      children: Number(values.children),
    };

    const parsed = reservationSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, messages]) => [key, messages?.[0]]),
        ) as Errors,
      );
      return;
    }

    setPending(true);
    setErrors({});

    try {
      const response = await fetch("/api/rezervasyon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { message?: string; errors?: Record<string, string[]> }
          | null;

        if (body?.errors) {
          setErrors(
            Object.fromEntries(
              Object.entries(body.errors).map(([key, messages]) => [key, messages?.[0]]),
            ) as Errors,
          );
        }

        setErrors((current) => ({
          ...current,
          form: body?.message ?? "Talebiniz gönderilemedi. Lütfen tekrar deneyin.",
        }));
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | { data?: { stored?: boolean } }
        | null;

      if (body?.data?.stored === false) {
        setErrors({ form: "Talebiniz kaydedilemedi. Lütfen telefonla ulaşın." });
        return;
      }

      router.push("/rezervasyon/basarili");
    } catch {
      setErrors({ form: "Bağlantı kurulamadı. Lütfen tekrar deneyin." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10">
      <fieldset className="flex flex-col gap-6" disabled={pending}>
        <legend className="label mb-4 text-pine">01 — Tarih ve kişi</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Giriş tarihi" htmlFor="checkIn" error={errors.checkIn}>
            <input
              id="checkIn"
              type="date"
              min={isoDate(0)}
              value={values.checkIn}
              onChange={(event) => set("checkIn", event.target.value)}
              className={inputClass}
              required
            />
          </Field>

          <Field
            label="Çıkış tarihi"
            htmlFor="checkOut"
            error={errors.checkOut}
            hint={nights > 0 ? `${nights} gece` : undefined}
          >
            <input
              id="checkOut"
              type="date"
              min={values.checkIn}
              value={values.checkOut}
              onChange={(event) => set("checkOut", event.target.value)}
              className={inputClass}
              required
            />
          </Field>

          <Field label="Yetişkin" htmlFor="adults" error={errors.adults}>
            <select
              id="adults"
              value={values.adults}
              onChange={(event) => set("adults", event.target.value)}
              className={inputClass}
            >
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Çocuk" htmlFor="children" error={errors.children}>
            <select
              id="children"
              value={values.children}
              onChange={(event) => set("children", event.target.value)}
              className={inputClass}
            >
              {[0, 1, 2, 3, 4].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Oda" htmlFor="room" error={errors.room} hint="Kararsızsanız boş bırakın, birlikte seçelim.">
          <select
            id="room"
            value={values.room}
            onChange={(event) => set("room", event.target.value)}
            className={inputClass}
          >
            <option value="">Fark etmez / önerin</option>
            {rooms.map((room) => (
              <option key={room.slug} value={room.slug}>
                {room.name} — {room.capacity} kişi
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-6" disabled={pending}>
        <legend className="label mb-4 text-pine">02 — İletişim</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Ad soyad" htmlFor="name" error={errors.name} className="sm:col-span-2">
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              className={inputClass}
              required
            />
          </Field>

          <Field label="E-posta" htmlFor="email" error={errors.email}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(event) => set("email", event.target.value)}
              className={inputClass}
              required
            />
          </Field>

          <Field label="Telefon" htmlFor="phone" error={errors.phone}>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+90 5xx xxx xx xx"
              value={values.phone}
              onChange={(event) => set("phone", event.target.value)}
              className={inputClass}
              required
            />
          </Field>
        </div>

        <Field
          label="Not"
          htmlFor="note"
          error={errors.note}
          hint="Geç giriş, bal ayı, çocuk yatağı, alerji — ne varsa yazın."
        >
          <textarea
            id="note"
            rows={4}
            value={values.note}
            onChange={(event) => set("note", event.target.value)}
            className={`${inputClass} resize-none`}
          />
        </Field>

        <label className="flex items-start gap-3 text-[13px] leading-relaxed text-mute">
          <input
            type="checkbox"
            checked={values.consent}
            onChange={(event) => set("consent", event.target.checked)}
            className="mt-1 h-4 w-4 accent-[#38513f]"
          />
          <span>
            Kişisel verilerimin rezervasyon talebimin değerlendirilmesi amacıyla işlenmesini
            kabul ediyorum.
          </span>
        </label>
        {errors.consent ? <p className="-mt-4 text-[12px] text-[#a4442f]">{errors.consent}</p> : null}
      </fieldset>

      <div className="flex flex-col gap-5 border-t border-line pt-8">
        {estimate > 0 ? (
          <div className="flex items-baseline justify-between gap-6">
            <span className="label text-mute">Tahmini toplam</span>
            <span className="display text-[28px]">
              {formatPrice(estimate, selectedRoom?.currency ?? "TRY")}
            </span>
          </div>
        ) : null}

        {errors.form ? (
          <p className="border border-[#a4442f]/30 bg-[#a4442f]/5 px-4 py-3 text-[13px] text-[#a4442f]">
            {errors.form}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full sm:w-fit">
          {pending ? "Gönderiliyor…" : "Talebi Gönder"}
        </Button>

        <p className="text-[12px] leading-relaxed text-mute">
          Bu bir ön talep formudur; ödeme alınmaz. Talebinizi aldıktan sonra en geç 12 saat
          içinde uygunluk ve fiyat teyidiyle dönüyoruz.
        </p>
      </div>
    </form>
  );
}
