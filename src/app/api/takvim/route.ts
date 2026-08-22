import { NextResponse } from "next/server";
import { getCalendar } from "@/lib/cms";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isoDate } from "@/lib/utils";

export const runtime = "nodejs";

const MAX_DAYS = 120;

/**
 * `GET /api/takvim?oda=<slug>&from=&to=`
 *
 * `delivery.reservations.calendar()` proxy'si — gün gün müsaitlik ve fiyat.
 * Kalan adet dönmez; ziyaretçi rakibin envanterini okumamalı.
 */
export async function GET(request: Request) {
  const { limited, retryAfter } = rateLimit(
    `takvim:${clientIp(request)}`,
    30,
    60_000,
  );

  if (limited) {
    return NextResponse.json(
      { message: "Çok fazla sorgu gönderdiniz.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const url = new URL(request.url);
  const room = url.searchParams.get("oda")?.trim();

  if (!room) {
    return NextResponse.json(
      { message: "Oda belirtilmedi.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const from = url.searchParams.get("from")?.trim() || isoDate(0);
  const to = url.searchParams.get("to")?.trim() || isoDate(60);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json(
      { message: "Tarih biçimi YYYY-AA-GG olmalı.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const span =
    (new Date(`${to}T00:00:00`).getTime() -
      new Date(`${from}T00:00:00`).getTime()) /
    86_400_000;

  if (span <= 0 || span > MAX_DAYS) {
    return NextResponse.json(
      { message: `Aralık 1—${MAX_DAYS} gün olmalı.`, code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const days = await getCalendar(room, { from, to });

  if (!days) {
    return NextResponse.json({ data: { known: false, days: [] } });
  }

  return NextResponse.json({ data: { known: true, days } });
}
