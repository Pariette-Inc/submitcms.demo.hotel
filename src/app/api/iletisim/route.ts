import { NextResponse } from "next/server";
import { submitTicket } from "@/lib/cms";
import { buildTicketPayload } from "@/lib/cms/ticket";
import { contactSchema } from "@/lib/schemas";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { notifySafe } from "@/lib/sistemtakip";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

export async function POST(request: Request) {
  const ip = clientIp(request);
  const { limited, retryAfter } = rateLimit(`iletisim:${ip}`, MAX_PER_WINDOW, WINDOW_MS);

  if (limited) {
    notifySafe(
      "warn",
      "İletişim formu rate limit",
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

  const parsed = contactSchema.safeParse(body);
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

  const payload = buildTicketPayload(
    {
      name: data.name,
      email: data.email,
      phone: data.phone || "",
      subject: data.subject,
      message: data.message,
      consent: data.consent,
    },
    { tip: "iletisim" },
  );

  const result = await submitTicket(payload);

  if (result === null) {
    notifySafe(
      "error",
      "Form kaydedilemedi — submitcms yapılandırılmamış",
      "SUBMITCMS_TOKEN tanımlı değil; gönderilen form hiçbir yere yazılmadı.",
    );
    return NextResponse.json(
      { message: "Mesajınız şu anda iletilemedi. Lütfen telefonla ulaşın.", code: "CMS_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  if (result === false) {
    return NextResponse.json(
      {
        message: "Mesajınız şu anda iletilemedi. Lütfen telefonla ulaşın.",
        code: "CMS_UNAVAILABLE",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ data: { received: true, stored: result !== null } }, { status: 201 });
}
