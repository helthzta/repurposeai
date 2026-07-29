/**
 * In-memory fixed-window rate limiter, keyed per route scope + identity
 * (an authenticated user/API-key id when known, the caller's IP otherwise).
 *
 * Single-process only — fine for the current single-instance deployment (see
 * architecture.md's open hosting question). If this ever runs behind more than
 * one server process, swap the Map below for a Postgres- or Redis-backed store
 * so limits are shared across instances.
 */

import { ApiError } from "@/lib/auth";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function clientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Opportunistic cleanup so long-lived processes don't accumulate unbounded
// entries from many distinct IPs/users over time.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

/**
 * Throws ApiError(429) once `limit` requests have been seen for this
 * scope+identity within `windowMs`. Call after auth so `identity` can be a
 * stable user/API-key id; omit it to fall back to the request's IP.
 */
export function rateLimit(
  req: Request,
  scope: string,
  { limit, windowMs, identity }: { limit: number; windowMs: number; identity?: string },
) {
  const now = Date.now();
  sweep(now);

  const key = `${scope}:${identity ?? clientIp(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= limit) {
    throw new ApiError(429, "Too many requests — please slow down and try again shortly.");
  }

  bucket.count += 1;
}
