import { headers } from "next/headers";

type Bucket = { hits: number[] };
const g = globalThis as unknown as { __malikaRl?: Map<string, Bucket> };
const buckets = (g.__malikaRl ??= new Map<string, Bucket>());

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Sliding-window limiter. In-memory, so it is per server instance — fine for a single node and as a
 * safety net; swap the store for Redis when the app runs on several instances (Phase 11 hardens this).
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const id = `${key}:${await clientIp()}`;
  const now = Date.now();
  const bucket = buckets.get(id) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    buckets.set(id, bucket);
    return false;
  }
  bucket.hits.push(now);
  buckets.set(id, bucket);
  if (buckets.size > 5000) for (const [k, b] of buckets) if (!b.hits.some((t) => now - t < windowMs)) buckets.delete(k);
  return true;
}
