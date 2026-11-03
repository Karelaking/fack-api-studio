/**
 * Fack API — Sliding-Window Rate Limiter Service
 *
 * Lightweight in-memory rate limiter designed for edge/serverless runtimes.
 * Automatically evicts stale buckets to guarantee zero memory leakage.
 */

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
  private readonly buckets = new Map<string, RateLimitBucket>();
  private lastCleanup = Date.now();

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
    this.cleanupIfNeeded(now);

    const bucket = this.buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + windowSeconds * 1000,
      });
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
    const resetInSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    return {
      allowed: true,
      remaining: limit - bucket.count,
      resetInSeconds: Math.max(resetInSeconds, 1),
    };
  }

  /**
   * Periodically sweeps expired buckets to keep memory usage bounded.
   */
  private cleanupIfNeeded(now: number): void {
    if (now - this.lastCleanup < 60_000) return;
    this.lastCleanup = now;

    for (const [key, bucket] of this.buckets.entries()) {
      if (now >= bucket.resetAt) {
        this.buckets.delete(key);
      }
    }
  }

  /** Clears all buckets (useful in test setup). */
  public reset(): void {
    this.buckets.clear();
    this.lastCleanup = Date.now();
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
