/**
 * Fack API — Sliding-Window Rate Limiter Service
 *
 * Uses a shared Redis counter when `REDIS_URL` or the Upstash REST variables
 * are configured, so every instance enforces the same limit. Without a shared
 * store it falls back to the bounded in-process LRU implementation.
 */

import { LRUCache } from "lru-cache";
import {
  deleteSharedPrefix,
  incrementSharedCounter,
  sharedKeys,
} from "@/lib/cache/shared-store";
import { getClientIp } from "./client-ip";

export { getClientIp };

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  isAllowed: boolean;
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
        isAllowed: true,
        remaining: limit - 1,
        resetInSeconds: windowSeconds,
      };
    }

    if (bucket.count >= limit) {
      const resetInSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      return {
        isAllowed: false,
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
      isAllowed: true,
      remaining: limit - bucket.count,
      resetInSeconds: Math.max(resetInSeconds, 1),
    };
  }

  /** Clears all buckets (useful in test setup). */
  public reset(): void {
    this.cache.clear();
  }
}

class RateLimiter {
  private readonly local = new InMemoryRateLimiter();

  /**
   * Checks and consumes a token from the rate limit bucket.
   *
   * Redis `INCR` + `EXPIRE` run in one Lua script, so concurrent instances see
   * the same counter. If Redis is unreachable the check degrades to the local
   * bucket instead of rejecting the request.
   */
  public async check(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const shared = await incrementSharedCounter(
      sharedKeys.rateLimit(key),
      windowSeconds,
    );

    if (shared) {
      return {
        isAllowed: shared.count <= limit,
        remaining: Math.max(limit - shared.count, 0),
        resetInSeconds: Math.max(shared.ttlSeconds, 1),
      };
    }

    return this.local.check(key, limit, windowSeconds);
  }

  /** Clears local and shared buckets (useful in test setup). */
  public async reset(): Promise<void> {
    this.local.reset();
    await deleteSharedPrefix("ratelimit:");
  }
}

// Global singleton instance
export const rateLimiter = new RateLimiter();
