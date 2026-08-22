import { NextResponse } from "next/server";
import { checkAvailability } from "@/lib/cms";
import { availabilityQuerySchema } from "@/lib/schemas";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * `POST /api/musaitlik` — gövde: `{ room, checkIn, checkOut, quantity? }`
 *
 * `delivery.reservations.availability()` proxy'si. Site token'ı sunucuda
 * kaldığı için istemci doğrudan submitcms'e gidemez.
 *
 * Yanıt bilerek dardır: kalan kapasite DÖNMEZ (uç de dönmüyor), yalnız
 * müsait olup olmadığı, gece sayısı ve fiyat.
 */
export async function POST(request: Request) {
  const { limited, retryAfter } = rateLimit(
    `musaitlik:${clientIp(request)}`,
    30,
    60_000,
  );

  if (limited) {
    return NextResponse.json(
      { message: "Çok fazla sorgu gönderdiniz.", code: "RATE_LIMITED" },
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

  const parsed = availabilityQuerySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Tarihler geçerli değil.",
        code: "VALIDATION_ERROR",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const { room, checkIn, checkOut, quantity } = parsed.data;

  const availability = await checkAvailability(room, {
    starts_at: checkIn,
    ends_at: checkOut,
    ...(quantity ? { quantity } : {}),
  });

  // `null` = "bilinmiyor". Oda panelde rezervasyona açılmamış olabilir; bunu
  // "dolu" diye göstermek yanlış olur, istemci sorguyu gizler.
  if (!availability) {
    return NextResponse.json({ data: { known: false } }, { status: 200 });
  }

  return NextResponse.json({ data: { known: true, ...availability } });
}
