/**
 * Fack API — Cross-Site Request Forgery (CSRF) & Origin Defense Service
 *
 * Employs `@csrf-armor/nextjs` and `@csrf-armor/core` to validate origins,
 * prevent cross-site form/fetch forgery, and isolate system mutating endpoints.
 */

import { NextRequest, NextResponse } from "next/server";
import { createCsrfMiddleware } from "@csrf-armor/nextjs";

export interface CsrfValidationResult {
  success: boolean;
  reason?: string;
  response?: NextResponse;
}

/**
 * Validates whether a requested host is a recognized, trusted system domain.
 * Guards against Host header poisoning and unvetted cross-origin calls.
 */
export function isTrustedHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase();
  if (!hostname) {
    return false;
  }

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  ) {
    return true;
  }

  // Explicit project domains and recognized deployment prefixes
  if (
    hostname === "lotusapi-studio.vercel.app" ||
    hostname === "fackapi.studio" ||
    hostname.endsWith(".fackapi.studio") ||
    (hostname.startsWith("fack-api") && hostname.endsWith(".vercel.app"))
  ) {
    return true;
  }

  const vercelProdUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.toLowerCase();
  if (
    vercelProdUrl &&
    (hostname === vercelProdUrl || hostname.endsWith(`.${vercelProdUrl}`))
  ) {
    return true;
  }

  const vercelUrl = (
    process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL
  )?.toLowerCase();
  if (
    vercelUrl &&
    (hostname === vercelUrl || hostname.endsWith(`.${vercelUrl}`))
  ) {
    return true;
  }

  const appDomain = (
    process.env.APP_DOMAIN || process.env.NEXT_PUBLIC_APP_DOMAIN
  )?.toLowerCase();
  if (
    appDomain &&
    (hostname === appDomain || hostname.endsWith(`.${appDomain}`))
  ) {
    return true;
  }

  return false;
}

/**
 * Returns the set of origins trusted for browser mutations.
 */
export function getTrustedOrigins(host?: string): string[] {
  const origins = new Set<string>([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://fackapi.studio",
    "https://lotusapi-studio.vercel.app",
  ]);

  const appDomain =
    process.env.APP_DOMAIN || process.env.NEXT_PUBLIC_APP_DOMAIN;
  if (appDomain) {
    origins.add(`https://${appDomain}`);
    origins.add(`http://${appDomain}`);
  }

  const vercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProdUrl) {
    origins.add(`https://${vercelProdUrl}`);
  }

  const vercelUrl =
    process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) {
    origins.add(`https://${vercelUrl}`);
  }

  if (host && isTrustedHost(host)) {
    origins.add(`http://${host}`);
    origins.add(`https://${host}`);
  }

  return Array.from(origins);
}

/**
 * Safe paths excluded from browser CSRF token/origin checks.
 * Mock APIs and token-authenticated CLI operations are verified via their own credentials.
 */
export const CSRF_EXCLUDED_PATH_PREFIXES = [
  "/api/mock",
  "/api/cli/auth/device",
  "/api/cli/auth/token",
  "/api/cli/auth/revoke",
  "/api/cli/projects",
  "/api/cli/me",
];

/**
 * Checks whether a path should bypass browser CSRF verification.
 */
export function isCsrfExcludedPath(pathname: string): boolean {
  return CSRF_EXCLUDED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Evaluates CSRF protection using `@csrf-armor/nextjs` for incoming requests.
 *
 * @param request - Next.js incoming request
 * @param response - Next.js continuation response
 */
export async function evaluateCsrf(
  request: NextRequest,
  response: NextResponse = NextResponse.next(),
): Promise<CsrfValidationResult> {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host") || request.nextUrl.host;

  // 1. Bypass excluded paths (Mock APIs and CLI authenticated endpoints)
  if (isCsrfExcludedPath(pathname)) {
    return { success: true, response };
  }

  // 2. Token-authenticated project bundle exports bypass ambient cookie CSRF checks
  if (
    pathname.includes("/bundle") &&
    (request.headers.get("authorization") ||
      request.headers.get("x-fack-project-key"))
  ) {
    return { success: true, response };
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // 3. Fallback for internal same-origin calls where browser origin/referer are absent (e.g. testing)
  if (!origin && !referer && isTrustedHost(host)) {
    return { success: true, response };
  }

  // 4. Apply @csrf-armor/nextjs origin-check strategy
  const allowedOrigins = getTrustedOrigins(host);
  const csrfMiddleware = createCsrfMiddleware({
    strategy: "origin-check",
    allowedOrigins,
    excludePaths: CSRF_EXCLUDED_PATH_PREFIXES,
  });

  const result = await csrfMiddleware(request, response);
  if (!result.success) {
    return {
      success: false,
      reason: result.reason || "CSRF origin validation failed",
      response,
    };
  }

  return {
    success: true,
    response: result.response,
  };
}
