import { NextResponse } from "next/server";
import { bookReservation, submitTicket } from "@/lib/cms";
import { buildTicketPayload } from "@/lib/cms/ticket";
import { reservationSchema } from "@/lib/schemas";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { notifySafe } from "@/lib/sistemtakip";
import { nightsBetween } from "@/lib/utils";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

/**
 * Rezervasyon talebi iki hattan biriyle kaydedilir:
 *
 * 1. **Rezervasyon hattı** — oda seçilmişse ve o kayıt panelde rezervasyona
 *    açılmışsa `delivery.reservations.book()`. Takvimde yer tutar, çakışmayı
 *    submitcms reddeder, misafire referans kodu döner.
 * 2. **Ticket hattı** — oda seçilmemişse ("fark etmez") ya da kayıt
 *    rezervasyona açılmamışsa `delivery.submitTicket()`. Talep gelen kutusuna
 *    düşer, takvimde yer tutmaz.
 *
 * Hangisinin çalıştığı yanıtta `mode` ile bildirilir.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const { limited, retryAfter } = rateLimit(`rezervasyon:${ip}`, MAX_PER_WINDOW, WINDOW_MS);

  if (limited) {
    notifySafe(
      "warn",
      "Rezervasyon formu rate limit",
      `IP: ${ip} — ${MAX_PER_WINDOW}/dk sınırı aşıldı`,
    );
    return NextResponse.json(
      { message: "Çok fazla istek gönderdiniz, biraz sonra tekrar deneyin.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "İstek gövdesi okunamadı.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const parsed = reservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Formda eksik ya da hatalı alanlar var.",
        code: "VALIDATION_ERROR",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const nights = nightsBetween(data.checkIn, data.checkOut);

  const summary = [
    `${data.name} · ${data.phone} · ${data.email}`,
    `${data.checkIn} → ${data.checkOut} (${nights} gece)`,
    `${data.adults} yetişkin, ${data.children} çocuk`,
    `Oda: ${data.room || "belirtilmedi"}`,
  ];

  // ── 1. Rezervasyon hattı ──────────────────────────────────────────────────
  if (data.room) {
    const outcome = await bookReservation(data.room, {
      starts_at: data.checkIn,
      ends_at: data.checkOut,
      guest_name: data.name,
      guest_email: data.email,
      guest_phone: data.phone,
      guests: data.adults + data.children,
      quantity: 1,
      ...(data.note ? { note: data.note } : {}),
    });

    if (outcome.ok) {
      notifySafe(
        "confirm",
        "Yeni rezervasyon",
        [
          ...summary,
          `Referans: ${outcome.booking.code} (${outcome.booking.status})`,
          "Kayıt: submitcms rezervasyon takvimi",
        ].join("\n"),
      );

      return NextResponse.json(
        {
          data: {
            received: true,
            mode: "reservation",
            nights,
            code: outcome.booking.code,
            status: outcome.booking.status,
            price: outcome.booking.price,
            currency: outcome.booking.currency,
          },
        },
        { status: 201 },
      );
    }

    // Kural ihlali: tarih dolu, sezon dışı, çok erken… Ticket'a düşürmek
    // yanlış olur — misafir "gitti" sanır, oysa oda gerçekten müsait değil.
    if (outcome.kind === "rejected") {
      return NextResponse.json(
        {
          message:
            outcome.message ||
            "Seçtiğiniz tarihler bu oda için müsait değil. Başka bir tarih deneyin.",
          code: "NOT_AVAILABLE",
          reason: outcome.reason,
        },
        { status: 409 },
      );
    }

    // `unavailable`: oda rezervasyona açılmamış ya da modül kapalı.
    // Talebi kaybetmemek için ticket hattına düşülür.
  }

  // ── 2. Ticket hattı ───────────────────────────────────────────────────────
  const payload = buildTicketPayload(
    {
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: `Rezervasyon talebi — ${data.name}`,
      message: data.note || "",
      consent: data.consent,
    },
    {
      tip: "rezervasyon",
      veri: {
        giris: data.checkIn,
        cikis: data.checkOut,
        gece: nights,
        yetiskin: data.adults,
        cocuk: data.children,
        oda: data.room || "belirtilmedi",
      },
    },
  );

  const result = await submitTicket(payload);

  if (result === null) {
    notifySafe(
      "error",
      "Form kaydedilemedi — submitcms yapılandırılmamış",
      "SUBMITCMS_TOKEN tanımlı değil; gönderilen form hiçbir yere yazılmadı.",
    );
    return NextResponse.json(
      { message: "Talebiniz şu anda kaydedilemedi. Lütfen telefonla ulaşın.", code: "CMS_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  if (result === false) {
    return NextResponse.json(
      {
        message: "Talebiniz şu anda kaydedilemedi. Lütfen telefonla ulaşın.",
        code: "CMS_UNAVAILABLE",
      },
      { status: 502 },
    );
  }

  notifySafe(
    "confirm",
    "Yeni rezervasyon talebi",
    [...summary, "Kayıt: submitcms talep kutusu (ticket)"].join("\n"),
  );

  return NextResponse.json(
    { data: { received: true, mode: "request", nights } },
    { status: 201 },
  );
}
