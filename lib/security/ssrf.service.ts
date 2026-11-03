/**
 * Fack API — Server-Side Request Forgery (SSRF) Protection Service
 *
 * Validates external outbound URLs (webhooks, callbacks, proxy targets)
 * against cloud metadata services, private networks, and internal loopbacks.
 */

import net from "node:net";

export class SsrfSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfSecurityError";
  }
}

/**
 * Blocked hostnames associated with cloud instance metadata services and internal orchestration.
 */
const FORBIDDEN_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata.internal",
  "instance-data",
  "169.254.169.254",
  "fd00:ec2::254",
]);

/**
 * Checks whether an IPv4 address belongs to a reserved, loopback, or private range.
 */
function isRestrictedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => parseInt(part, 10));
  if (
    parts.length !== 4 ||
    parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)
  ) {
    return true; // Malformed IPv4 is unsafe
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local / Cloud Metadata)
  if (a === 169 && b === 254) return true;

  // 10.0.0.0/8 (Private RFC 1918)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private RFC 1918)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private RFC 1918)
  if (a === 192 && b === 168) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224) return true;

  return false;
}

/**
 * Checks whether an IPv6 address is loopback, unique local, or link-local.
 */
function isRestrictedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;

  // IPv6 link-local (fe80::/10)
  if (
    lower.startsWith("fe80:") ||
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  ) {
    return true;
  }

  // IPv6 Unique Local Address (fc00::/7)
  if (lower.startsWith("fc") || lower.startsWith("fd")) {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:127.0.0.1, etc.)
  if (lower.startsWith("::ffff:")) {
    const mappedIpv4 = lower.slice(7);
    if (net.isIPv4(mappedIpv4)) {
      return isRestrictedIpv4(mappedIpv4);
    }
  }

  return false;
}

/**
 * Validates an outbound URL to prevent SSRF attacks.
 *
 * @param candidateUrl - The target URL to test.
 * @param isLocalTier - When true (Tier 1 local developer mode), allows localhost/loopback destinations.
 */
export function validateWebhookUrl(
  candidateUrl: string,
  isLocalTier = false,
): { safe: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(candidateUrl);
  } catch {
    return { safe: false, reason: "Invalid target URL format." };
  }

  // 1. Only allow HTTP and HTTPS schemes
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      safe: false,
      reason: `Disallowed protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // 2. Disallow cloud metadata and internal orchestration hostnames unconditionally
  if (
    FORBIDDEN_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  ) {
    return {
      safe: false,
      reason:
        "Access to cloud instance metadata and internal endpoints is forbidden.",
    };
  }

  // 3. Localhost handling
  const isLoopbackHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost");

  if (isLoopbackHost) {
    if (isLocalTier) {
      return { safe: true };
    }
    return {
      safe: false,
      reason:
        "Requests to localhost and loopback interfaces are blocked in hosted deployments.",
    };
  }

  // 4. IP Range validation if hostname is a direct IP address
  const ipFamily = net.isIP(hostname);
  if (ipFamily === 4) {
    if (isRestrictedIpv4(hostname)) {
      if (isLocalTier && hostname.startsWith("127.")) {
        return { safe: true };
      }
      return {
        safe: false,
        reason:
          "Destination IP belongs to a private, loopback, or cloud metadata range.",
      };
    }
  } else if (ipFamily === 6) {
    if (isRestrictedIpv6(hostname)) {
      if (isLocalTier && hostname === "::1") {
        return { safe: true };
      }
      return {
        safe: false,
        reason: "Destination IPv6 belongs to a restricted local range.",
      };
    }
  }

  return { safe: true };
}

/**
 * Asserts that an outbound URL is safe to dispatch.
 * Throws SsrfSecurityError if unsafe.
 */
export function assertSafeWebhookUrl(
  candidateUrl: string,
  isLocalTier = false,
): void {
  const result = validateWebhookUrl(candidateUrl, isLocalTier);
  if (!result.safe) {
    throw new SsrfSecurityError(
      result.reason || "Destination URL failed SSRF security verification.",
    );
  }
}
