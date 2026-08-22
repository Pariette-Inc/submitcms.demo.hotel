import { NextResponse } from "next/server";
import { pingRecord } from "@/lib/cms";
import { CONTENT_TYPES } from "@/lib/content";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ALLOWED: string[] = [CONTENT_TYPES.room, CONTENT_TYPES.service];

/**
 * `POST /api/goruntuleme` — `delivery.ping()` proxy'si.
 *
 * Sayfa kapanırken `navigator.sendBeacon` ile çağrılır; yanıt kimsenin
 * umurunda değildir, bu yüzden her durumda 202 döner.
 */
export async function POST(request: Request) {
  const { limited } = rateLimit(`ping:${clientIp(request)}`, 60, 60_000);
  if (limited) return new NextResponse(null, { status: 202 });

  let body: { tip?: unknown; slug?: unknown; sure?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new NextResponse(null, { status: 202 });
  }

  const type = typeof body.tip === "string" ? body.tip : "";
  const slug = typeof body.slug === "string" ? body.slug : "";
  const duration = Number(body.sure);

  if (!ALLOWED.includes(type) || !slug) {
    return new NextResponse(null, { status: 202 });
  }

  await pingRecord(
    type,
    slug,
    Number.isFinite(duration) ? Math.min(Math.max(duration, 0), 3600) : 0,
  );

  return new NextResponse(null, { status: 202 });
}
