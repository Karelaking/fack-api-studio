/**
 * Fack API — Sliding-Window Rate Limiter Service
 *
 * Employs `lru-cache` for bounded, high-performance in-memory rate limiting.
 * Automatically evicts stale buckets and bounds total memory consumption.
 */

import { LRUCache } from "lru-cache";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

class InMemoryRateLimiter {
  private readonly cache = new LRUCache<string, RateLimitBucket>({
    max: 50_000,
  });

  /**
   * Checks and consumes a token from the rate limit bucket.
   *
   * @param key - The rate limit key (e.g. IP address or action identifier).
   * @param limit - Maximum requests allowed within the window.
   * @param windowSeconds - The window duration in seconds.
   */
  public check(
    key: string,
    limit: number,
    windowSeconds: number,
  ): RateLimitResult {
    const now = Date.now();
    const bucket = this.cache.get(key);

    if (!bucket || now >= bucket.resetAt) {
      const resetAt = now + windowSeconds * 1000;
      this.cache.set(key, { count: 1, resetAt }, { ttl: windowSeconds * 1000 });
      return {
        allowed: true,
        remaining: limit - 1,
        resetInSeconds: windowSeconds,
      };
    }

    if (bucket.count >= limit) {
      const resetInSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: Math.max(resetInSeconds, 1),
      };
    }

    bucket.count += 1;
    this.cache.set(key, bucket, {
      ttl: Math.max(bucket.resetAt - now, 1000),
    });
    const resetInSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    return {
      allowed: true,
      remaining: limit - bucket.count,
      resetInSeconds: Math.max(resetInSeconds, 1),
    };
  }

  /** Clears all buckets (useful in test setup). */
  public reset(): void {
    this.cache.clear();
  }
}

// Global singleton instance
export const rateLimiter = new InMemoryRateLimiter();

/**
 * Extracts a client IP from Next.js request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
