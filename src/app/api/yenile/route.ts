import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CACHE_TAG } from "@/lib/cms";

export const runtime = "nodejs";

/**
 * `POST /api/yenile` — içerik önbelleğini elle düşürür.
 *
 * submitcms okumaları 5 dakika önbellekte tutulur (`src/lib/cms/index.ts` →
 * `CONTENT_TTL`); panelde yapılan değişiklik o kadar gecikmeyle görünür. Acele
 * eden kurulumlar bu ucu panelin webhook'una bağlayabilir.
 *
 * Önbellek `.next/cache` içinde **dağıtımlar arası** kalıcıdır: bozuk bir uç
 * yüzünden `null` önbelleğe girdiyse yeniden derlemek onu temizlemez. Uç
 * düzeldikten sonra beklemek istemiyorsanız buraya bir istek atın.
 *
 * `SUBMITCMS_REVALIDATE_SECRET` tanımlı değilse uç kapalıdır (404) — sırsız
 * bırakıp herkesin önbelleği düşürmesine izin vermek DoS kapısıdır.
 */
export async function POST(request: Request) {
  const secret = process.env.SUBMITCMS_REVALIDATE_SECRET?.trim();

  if (!secret) {
    return NextResponse.json(
      { message: "Bu uç yapılandırılmamış.", code: "NOT_CONFIGURED" },
      { status: 404 },
    );
  }

  const provided =
    request.headers.get("x-revalidate-secret")?.trim() ||
    new URL(request.url).searchParams.get("secret")?.trim();

  if (provided !== secret) {
    return NextResponse.json(
      { message: "Yetkisiz.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  // `{ expire: 0 }` = sonraki istekte taze veri çekilsin. Varsayılan "max"
  // profili bayat içeriği bir tur daha servis eder; bozuk bir önbellek girdisini
  // temizlemek için çağrıldığında istenen bu değil.
  revalidateTag(CACHE_TAG, { expire: 0 });

  return NextResponse.json({ data: { revalidated: true, tag: CACHE_TAG } });
}
