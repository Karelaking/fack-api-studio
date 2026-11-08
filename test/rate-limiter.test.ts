import { describe, expect, it, beforeEach } from "vite-plus/test";
import { rateLimiter } from "@/lib/security/rate-limiter.service";

describe("rate-limiter.service", () => {
  beforeEach(() => {
    rateLimiter.reset();
  });

  it("should allow requests within limit and decrement remaining", () => {
    const first = rateLimiter.check("user_1", 3, 60);
    expect(first.isAllowed).toBe(true);
    expect(first.remaining).toBe(2);

    const second = rateLimiter.check("user_1", 3, 60);
    expect(second.isAllowed).toBe(true);
    expect(second.remaining).toBe(1);

    const third = rateLimiter.check("user_1", 3, 60);
    expect(third.isAllowed).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("should reject requests exceeding the limit", () => {
    rateLimiter.check("user_blocked", 2, 60);
    rateLimiter.check("user_blocked", 2, 60);

    const fourth = rateLimiter.check("user_blocked", 2, 60);
    expect(fourth.isAllowed).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.resetInSeconds).toBeGreaterThan(0);
  });

  it("should isolate limits across different keys", () => {
    rateLimiter.check("user_a", 1, 60);
    expect(rateLimiter.check("user_a", 1, 60).isAllowed).toBe(false);

    expect(rateLimiter.check("user_b", 1, 60).isAllowed).toBe(true);
  });
});
