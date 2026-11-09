/**
 * Fixed-window in-memory rate limiter for application endpoints.
 * Single-instance only — see docs/SECURITY.md (residual risk) for multi-instance deploys.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
let lastSweep = Date.now();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (now - lastSweep > 60_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    lastSweep = now;
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { ok: false, remaining: 0, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  return { ok: true, remaining: limit - bucket.count, retryAfterSec: 0 };
}

export function resetRateLimits() {
  buckets.clear();
}
