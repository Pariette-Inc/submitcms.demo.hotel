/**
 * Süreç içi kayan pencere rate limit'i. Tek instance'lık demo kurulumu için
 * yeterli; çok instance'lı production'da Redis'e taşınmalı
 * (skill: SecurityShield → `ratelimit:<ip>`).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export type RateLimitResult = { limited: boolean; retryAfter: number };

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5_000) sweep(now);
    return { limited: false, retryAfter: 0 };
  }

  bucket.count += 1;
  const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
  return { limited: bucket.count > max, retryAfter };
}

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
