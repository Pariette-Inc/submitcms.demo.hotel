import { NextResponse } from "next/server";
import { submitTicket } from "@/lib/cms";
import { buildTicketPayload } from "@/lib/cms/ticket";
import { reservationSchema } from "@/lib/schemas";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { notifySafe } from "@/lib/sistemtakip";
import { nightsBetween } from "@/lib/utils";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

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
    [
      `${data.name} · ${data.phone} · ${data.email}`,
      `${data.checkIn} → ${data.checkOut} (${nights} gece)`,
      `${data.adults} yetişkin, ${data.children} çocuk`,
      `Oda: ${data.room || "belirtilmedi"}`,
      result === null ? "Kayıt: demo modu (submitcms token'ı yok)" : "Kayıt: submitcms",
    ].join("\n"),
  );

  return NextResponse.json(
    { data: { received: true, nights, stored: result !== null } },
    { status: 201 },
  );
}
