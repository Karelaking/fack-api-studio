/**
 * Fack API — Trusted client IP resolution
 *
 * `X-Forwarded-For` is client-controlled unless a proxy overwrites or appends
 * it. Trusting it unconditionally lets a caller rotate the header and bypass
 * IP-based rate limits. This module only reads forwarding headers when
 * `TRUSTED_PROXY` explicitly configures the deployment:
 *
 *   TRUSTED_PROXY=vercel        # x-vercel-forwarded-for, then x-forwarded-for
 *   TRUSTED_PROXY=cloudflare    # cf-connecting-ip
 *   TRUSTED_PROXY=any           # first x-forwarded-for entry (explicit opt-in)
 *   TRUSTED_PROXY=10.0.0.0/8,192.168.0.0/16
 *
 * Anything else (including unset) ignores forwarding headers. IPv4 CIDR ranges
 * and exact IPv4/IPv6 addresses are supported; IPv6 CIDR ranges are not.
 */

import { isIP } from "node:net";

const FALLBACK_IP = "127.0.0.1";

type TrustedProxyConfig =
  | { mode: "none" }
  | { mode: "vercel" }
  | { mode: "cloudflare" }
  | { mode: "any" }
  | { mode: "list"; entries: string[] };

function parseTrustedProxyConfig(): TrustedProxyConfig {
  const raw = (process.env.TRUSTED_PROXY ?? "").trim().toLowerCase();

  if (!raw || raw === "none" || raw === "false" || raw === "0") {
    return { mode: "none" };
  }
  if (raw === "vercel") {
    return { mode: "vercel" };
  }
  if (raw === "cloudflare" || raw === "cf") {
    return { mode: "cloudflare" };
  }
  if (raw === "any" || raw === "true" || raw === "1") {
    return { mode: "any" };
  }

  const entries = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return entries.length > 0 ? { mode: "list", entries } : { mode: "none" };
}

function normalizeIp(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  let candidate = value.trim();
  if (!candidate) {
    return undefined;
  }

  // `[2001:db8::1]:443` and `[2001:db8::1]`
  if (candidate.startsWith("[")) {
    const closingBracket = candidate.indexOf("]");
    if (closingBracket > 0) {
      candidate = candidate.slice(1, closingBracket);
    }
  } else {
    // `203.0.113.5:443` (IPv4 with a port)
    const ipv4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(candidate);
    if (ipv4WithPort) {
      candidate = ipv4WithPort[1];
    }
  }

  // IPv4-mapped IPv6 (`::ffff:203.0.113.5`)
  if (candidate.toLowerCase().startsWith("::ffff:")) {
    candidate = candidate.slice(7);
  }

  return isIP(candidate) ? candidate.toLowerCase() : undefined;
}

function ipv4ToInt(ip: string): number | undefined {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return undefined;
  }

  let value = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      return undefined;
    }
    value = (value << 8) | octet;
  }
  return value >>> 0;
}

function matchesTrustedEntry(ip: string, entry: string): boolean {
  if (entry === ip) {
    return true;
  }

  if (!entry.includes("/")) {
    return false;
  }

  const [network, prefixRaw] = entry.split("/");
  const prefix = Number(prefixRaw);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const ipValue = ipv4ToInt(ip);
  const networkValue = ipv4ToInt(network);
  if (ipValue === undefined || networkValue === undefined) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipValue & mask) === (networkValue & mask);
}

function firstValidEntry(header: string | null): string | undefined {
  if (!header) {
    return undefined;
  }

  for (const entry of header.split(",")) {
    const ip = normalizeIp(entry);
    if (ip) {
      return ip;
    }
  }
  return undefined;
}

/**
 * Walks `X-Forwarded-For` from the nearest hop to the client and returns the
 * first address that is not itself a configured trusted proxy.
 */
function resolveFromTrustedChain(
  header: string | null,
  trustedEntries: string[],
): string | undefined {
  if (!header) {
    return undefined;
  }

  const chain: string[] = [];
  for (const entry of header.split(",")) {
    const ip = normalizeIp(entry);
    if (!ip) {
      // A malformed hop makes the whole chain untrustworthy.
      return undefined;
    }
    chain.push(ip);
  }

  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const ip = chain[index];
    const isTrusted = trustedEntries.some((entry) =>
      matchesTrustedEntry(ip, entry),
    );
    if (!isTrusted) {
      return ip;
    }
  }

  return chain[0];
}

export function getClientIp(request: Request): string {
  const config = parseTrustedProxyConfig();

  switch (config.mode) {
    case "vercel":
      return (
        firstValidEntry(request.headers.get("x-vercel-forwarded-for")) ??
        firstValidEntry(request.headers.get("x-forwarded-for")) ??
        FALLBACK_IP
      );
    case "cloudflare":
      return (
        normalizeIp(request.headers.get("cf-connecting-ip")) ?? FALLBACK_IP
      );
    case "any":
      return (
        firstValidEntry(request.headers.get("x-forwarded-for")) ?? FALLBACK_IP
      );
    case "list":
      return (
        resolveFromTrustedChain(
          request.headers.get("x-forwarded-for"),
          config.entries,
        ) ?? FALLBACK_IP
      );
    case "none":
    default:
      return FALLBACK_IP;
  }
}
