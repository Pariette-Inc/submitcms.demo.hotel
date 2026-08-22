"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Field, inputClass } from "@/components/form-field";
import { Button } from "@/components/ui";
import { reservationSchema } from "@/lib/schemas";
import { formatDate, formatPrice, isoDate, nightsBetween } from "@/lib/utils";

/**
 * `POST /api/musaitlik` yanıtı. `known: false` "oda panelde rezervasyona
 * açılmamış" demektir — o durumda hiçbir şey gösterilmez; "dolu" demek olmaz.
 */
type Availability =
  | { known: false }
  | {
      known: true;
      available: boolean;
      reason: string | null;
      message: string | null;
      units: number;
      price: number;
      currency: string;
      breakdown: Array<{ date: string; price: number }>;
    };

/** Rezervasyon başarılıysa referans kodu buradan sonuç sayfasına taşınır. */
export const BOOKING_STORAGE_KEY = "pariette:son-rezervasyon";

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
  const [availability, setAvailability] = useState<{
    key: string;
    value: Availability;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  const nights = nightsBetween(values.checkIn, values.checkOut);
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.slug === values.room),
    [rooms, values.room],
  );
  const estimate = selectedRoom && nights > 0 ? selectedRoom.price * nights : 0;

  const { room, checkIn, checkOut } = values;
  /** Sorgunun kimliği: sonuç yalnız kendi anahtarıyla eşleşirse gösterilir. */
  const queryKey = `${room}|${checkIn}|${checkOut}`;

  /**
   * Oda ve tarihler tamamlandığında submitcms'e müsaitlik sorulur
   * (`delivery.reservations.availability` → `/api/musaitlik`). Yazmadan önce
   * sorulduğu için misafir "gönder"e basıp reddedilmez.
   */
  useEffect(() => {
    if (!room || nights <= 0) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setChecking(true);
      try {
        const response = await fetch("/api/musaitlik", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room, checkIn, checkOut }),
          signal: controller.signal,
        });

        if (!response.ok) return;

        const body = (await response.json()) as { data?: Availability };
        if (body.data) setAvailability({ key: queryKey, value: body.data });
      } catch {
        // İptal ya da ağ hatası: sessiz kal, form yine de gönderilebilir.
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [room, checkIn, checkOut, nights, queryKey]);

  // Eski bir sorgunun sonucu yeni tarihlerde gösterilmez.
  const current = availability?.key === queryKey ? availability.value : null;
  const live = current?.known ? current : null;

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
        | {
            data?: {
              mode?: "reservation" | "request";
              code?: string;
              status?: string;
              nights?: number;
            };
          }
        | null;

      // Referans kodu query string'e yazılmaz; sonuç sayfası sessionStorage'dan okur.
      if (body?.data?.mode === "reservation" && body.data.code) {
        try {
          window.sessionStorage.setItem(
            BOOKING_STORAGE_KEY,
            JSON.stringify({
              code: body.data.code,
              status: body.data.status ?? "pending",
              checkIn: parsed.data.checkIn,
              checkOut: parsed.data.checkOut,
              nights: body.data.nights ?? nights,
            }),
          );
        } catch {
          // Gizli sekmede sessionStorage yazılamayabilir; kod yalnız e-postada kalır.
        }
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
        {live ? (
          <div
            className={
              live.available
                ? "border border-pine/30 bg-pine/5 px-4 py-4"
                : "border border-[#a4442f]/30 bg-[#a4442f]/5 px-4 py-4"
            }
          >
            <p className="label text-mute">
              {live.available ? "Bu tarihler müsait" : "Bu tarihler müsait değil"}
            </p>
            {live.message ? (
              <p className="mt-2 text-[13px] leading-relaxed text-ink/80">{live.message}</p>
            ) : null}

            {live.available ? (
              <>
                <div className="mt-4 flex items-baseline justify-between gap-6">
                  <span className="text-[13px] text-mute">
                    {live.units} gece · güncel fiyat
                  </span>
                  <span className="display text-[28px]">
                    {formatPrice(live.price, live.currency)}
                  </span>
                </div>

                {live.breakdown.length > 1 ? (
                  <ul className="mt-4 flex flex-col gap-1 border-t border-line pt-3">
                    {live.breakdown.map((night) => (
                      <li
                        key={night.date}
                        className="flex justify-between gap-4 text-[12px] text-mute"
                      >
                        <span>{formatDate(night.date)}</span>
                        <span className="tabular-nums">
                          {formatPrice(night.price, live.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}
          </div>
        ) : estimate > 0 ? (
          <div className="flex items-baseline justify-between gap-6">
            <span className="label text-mute">
              {checking ? "Müsaitlik sorgulanıyor…" : "Tahmini toplam"}
            </span>
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

        <Button
          type="submit"
          disabled={pending || live?.available === false}
          className="w-full sm:w-fit"
        >
          {pending
            ? "Gönderiliyor…"
            : live?.available
              ? "Odayı Ayır"
              : "Talebi Gönder"}
        </Button>

        <p className="text-[12px] leading-relaxed text-mute">
          {live?.available
            ? "Ödeme alınmaz. Onaylandığında referans kodunuzla birlikte e-posta gönderiyoruz."
            : "Bu bir ön talep formudur; ödeme alınmaz. Talebinizi aldıktan sonra en geç 12 saat içinde uygunluk ve fiyat teyidiyle dönüyoruz."}
        </p>
      </div>
    </form>
  );
}
