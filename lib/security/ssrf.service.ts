/**
 * Fack API — Server-Side Request Forgery (SSRF) Protection Service
 *
 * Validates external outbound URLs (webhooks, callbacks, proxy targets)
 * against cloud metadata services, private networks, and internal loopbacks.
 * Leverages `ipaddr.js` for battle-tested IP parsing and range validation.
 */

import dns from "node:dns";
import ipaddr from "ipaddr.js";

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
 * Reserved, loopback, and private address ranges per RFC 1918, RFC 3927, RFC 4193, and RFC 6598.
 */
const RESTRICTED_IP_RANGES = new Set([
  "loopback",
  "private",
  "linkLocal",
  "carrierGradeNat",
  "broadcast",
  "multicast",
  "reserved",
  "unspecified",
  "uniqueLocal",
]);

/**
 * Inspects whether an IP address belongs to a reserved, loopback, or private range using `ipaddr.js`.
 */
function inspectIpAddress(ipString: string): {
  isRestricted: boolean;
  isLoopback: boolean;
} {
  if (!ipaddr.isValid(ipString)) {
    return { isRestricted: true, isLoopback: false };
  }

  const parsed = ipaddr.parse(ipString);
  const normalized =
    parsed.kind() === "ipv6" && (parsed as ipaddr.IPv6).isIPv4MappedAddress()
      ? (parsed as ipaddr.IPv6).toIPv4Address()
      : parsed;

  const range = normalized.range();
  const isLoopback = range === "loopback";

  return {
    isRestricted: RESTRICTED_IP_RANGES.has(range),
    isLoopback,
  };
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

  // 4. IP Range validation if hostname is a direct IP address or embeds an IP (e.g. nip.io/sslip.io)
  const directIp = ipaddr.isValid(hostname) ? hostname : null;
  const embeddedIpv4Match = hostname.match(
    /(?:^|\.)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?:\.|$)/,
  );
  const candidateIp =
    directIp || (embeddedIpv4Match ? embeddedIpv4Match[1] : null);

  if (candidateIp && ipaddr.isValid(candidateIp)) {
    const { isRestricted, isLoopback } = inspectIpAddress(candidateIp);
    if (isRestricted) {
      if (isLocalTier && isLoopback) {
        return { safe: true };
      }
      return {
        safe: false,
        reason:
          "Destination IP belongs to a private, loopback, or cloud metadata range.",
      };
    }
  }

  return { safe: true };
}

/**
 * Validates an outbound URL to prevent SSRF attacks, including asynchronous DNS resolution
 * to guard against DNS rebinding and wildcard DNS mapping to internal/cloud metadata.
 */
export async function validateWebhookUrlAsync(
  candidateUrl: string,
  isLocalTier = false,
): Promise<{ safe: boolean; reason?: string }> {
  const syncCheck = validateWebhookUrl(candidateUrl, isLocalTier);
  if (!syncCheck.safe) {
    return syncCheck;
  }

  try {
    const parsed = new URL(candidateUrl);
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

    if (ipaddr.isValid(hostname)) {
      return { safe: true };
    }

    const lookupResults = await dns.promises.lookup(hostname, { all: true });
    for (const entry of lookupResults) {
      if (ipaddr.isValid(entry.address)) {
        const { isRestricted, isLoopback } = inspectIpAddress(entry.address);
        if (isRestricted) {
          if (isLocalTier && isLoopback) {
            continue;
          }
          return {
            safe: false,
            reason: `Destination hostname resolved to restricted IP address (${entry.address}).`,
          };
        }
      }
    }
  } catch {
    return {
      safe: false,
      reason: "Destination hostname could not be resolved via DNS.",
    };
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

/**
 * Asserts asynchronously that an outbound URL is safe to dispatch with full DNS validation.
 * Throws SsrfSecurityError if unsafe.
 */
export async function assertSafeWebhookUrlAsync(
  candidateUrl: string,
  isLocalTier = false,
): Promise<void> {
  const result = await validateWebhookUrlAsync(candidateUrl, isLocalTier);
  if (!result.safe) {
    throw new SsrfSecurityError(
      result.reason || "Destination URL failed SSRF security verification.",
    );
  }
}
