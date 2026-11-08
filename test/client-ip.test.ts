import { afterEach, describe, expect, it } from "vite-plus/test";
import { getClientIp } from "@/lib/security/client-ip";

const originalTrustedProxy = process.env.TRUSTED_PROXY;

function requestWith(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/mock/demo", { headers });
}

afterEach(() => {
  if (originalTrustedProxy === undefined) {
    delete process.env.TRUSTED_PROXY;
  } else {
    process.env.TRUSTED_PROXY = originalTrustedProxy;
  }
});

describe("getClientIp", () => {
  it("ignores forwarding headers by default", () => {
    delete process.env.TRUSTED_PROXY;
    const request = requestWith({ "x-forwarded-for": "203.0.113.9" });
    expect(getClientIp(request)).toBe("127.0.0.1");
  });

  it("uses x-vercel-forwarded-for when TRUSTED_PROXY=vercel", () => {
    process.env.TRUSTED_PROXY = "vercel";
    const request = requestWith({
      "x-vercel-forwarded-for": "203.0.113.10",
      "x-forwarded-for": "198.51.100.1",
    });
    expect(getClientIp(request)).toBe("203.0.113.10");
  });

  it("uses cf-connecting-ip when TRUSTED_PROXY=cloudflare", () => {
    process.env.TRUSTED_PROXY = "cloudflare";
    const request = requestWith({
      "cf-connecting-ip": "203.0.113.11",
      "x-forwarded-for": "198.51.100.1",
    });
    expect(getClientIp(request)).toBe("203.0.113.11");
  });

  it("takes the first entry when TRUSTED_PROXY=any", () => {
    process.env.TRUSTED_PROXY = "any";
    const request = requestWith({
      "x-forwarded-for": "203.0.113.12, 10.0.0.1",
    });
    expect(getClientIp(request)).toBe("203.0.113.12");
  });

  it("walks past trusted proxies to the nearest untrusted hop", () => {
    process.env.TRUSTED_PROXY = "10.0.0.0/8,192.168.0.0/16";
    const request = requestWith({
      "x-forwarded-for": "203.0.113.13, 10.1.2.3, 192.168.1.4",
    });
    expect(getClientIp(request)).toBe("203.0.113.13");
  });

  it("does not let a forged left entry win over the real hop", () => {
    process.env.TRUSTED_PROXY = "10.0.0.0/8";
    // A client sent "1.2.3.4"; nginx appended the real peer 203.0.113.14.
    const request = requestWith({
      "x-forwarded-for": "1.2.3.4, 203.0.113.14",
    });
    expect(getClientIp(request)).toBe("203.0.113.14");
  });

  it("normalizes IPv4 addresses with ports", () => {
    process.env.TRUSTED_PROXY = "any";
    const request = requestWith({ "x-forwarded-for": "203.0.113.15:443" });
    expect(getClientIp(request)).toBe("203.0.113.15");
  });

  it("falls back when a trusted chain contains a malformed hop", () => {
    process.env.TRUSTED_PROXY = "10.0.0.0/8";
    const request = requestWith({
      "x-forwarded-for": "not-an-ip, 10.0.0.1",
    });
    expect(getClientIp(request)).toBe("127.0.0.1");
  });
});
