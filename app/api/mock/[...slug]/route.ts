import type { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { buildResponse, buildCorsPreflightResponse } from "@/lib/mock-engine";
import { processMockRequest } from "@/lib/mock-handler-core";
import { resolveProjectFromSlug } from "@/lib/services/project-resolver.service";
import { LoggerRegistry } from "@/lib/logger-registry";
import { getMockJwtSecret } from "@/lib/mock-jwt";
import { toStr } from "@/lib/utils/coerce";
import { getClientIp, rateLimiter } from "@/lib/security/rate-limiter.service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    slug: string[];
  }>;
}

const mockTrace = LoggerRegistry.getTrace("mock");

function createHandler(method: string) {
  return async function (request: NextRequest, context: RouteContext) {
    mockTrace.traceCall(method, request.nextUrl.pathname);
    const response = await handleMockRequest(request, context);
    mockTrace.traceSuccess(method, `Status: ${response.status}`);
    return response;
  };
}

export const GET = createHandler("GET");
export const POST = createHandler("POST");
export const PUT = createHandler("PUT");
export const DELETE = createHandler("DELETE");
export const PATCH = createHandler("PATCH");
export const OPTIONS = () => buildCorsPreflightResponse();

async function handleMockRequest(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  mockTrace.traceCall(
    "handleMockRequest",
    request.method,
    request.nextUrl.pathname,
  );
  const startTime = Date.now();

  try {
    const { slug } = await context.params;
    if (!slug || slug.length === 0) {
      mockTrace.traceSuccess("handleMockRequest (missing slug)", "400");
      return buildResponse(
        { error: true, message: "No path segments provided" },
        400,
      );
    }

    const resolution = await resolveProjectFromSlug(slug);
    if (!resolution) {
      const fullPath = slug.join("/");
      mockTrace.traceSuccess("handleMockRequest (project not found)", "404");
      return buildResponse(
        {
          error: true,
          message: `Project namespace matching path "/${fullPath}" not found`,
          hint: "Check that your namespace slug and endpoint paths are correctly configured.",
        },
        404,
      );
    }
    const { project, requestPath } = resolution;
    const clientIp = getClientIp(request);

    // ── System Auth Endpoint Interception ──────────────────────────────
    if (requestPath === "/_auth/token" && request.method === "POST") {
      const authLimit = rateLimiter.check(`mock_auth:${clientIp}`, 60, 60);
      if (!authLimit.isAllowed) {
        return buildResponse(
          {
            error: true,
            statusCode: 429,
            message:
              "Too Many Requests: Token minting rate limit exceeded. Please retry in a moment.",
            retryAfter: authLimit.resetInSeconds,
          },
          429,
          {
            "Retry-After": String(authLimit.resetInSeconds),
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(authLimit.resetInSeconds),
          },
        );
      }

      // Shares the exact same resolution as the verify side so minted tokens
      // validate; requires JWT_SECRET in production.
      const secret = getMockJwtSecret(project.id);

      let body: Record<string, unknown> = {};
      try {
        body = await request.json();
      } catch {}

      const payload = {
        sub: toStr(body.userId) || "mock_user_123",
        email: toStr(body.email) || "user@example.com",
        role: toStr(body.role) || "user",
        ...body,
      };

      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer(`fack-api:${project.slug}`)
        .setExpirationTime("1h")
        .sign(secret);

      return buildResponse(
        { token, type: "Bearer", expiresIn: 3600, payload },
        200,
      );
    }

    // ── General Mock Request Rate Limiting ────────────────────────────
    const requestLimit = rateLimiter.check(`mock_req:${clientIp}`, 1200, 60);
    if (!requestLimit.isAllowed) {
      return buildResponse(
        {
          error: true,
          statusCode: 429,
          message:
            "Too Many Requests: Mock endpoint rate limit exceeded. Please retry in a moment.",
          retryAfter: requestLimit.resetInSeconds,
        },
        429,
        {
          "Retry-After": String(requestLimit.resetInSeconds),
          "X-RateLimit-Limit": "1200",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(requestLimit.resetInSeconds),
        },
      );
    }

    const response = await processMockRequest({
      project,
      requestPath,
      request,
      startTime,
    });
    mockTrace.traceSuccess(
      "handleMockRequest (processed)",
      `Status: ${response.status}`,
    );
    return response;
  } catch (error) {
    mockTrace.traceError("handleMockRequest", error);
    return buildResponse(
      { error: true, message: "Internal mock server error" },
      500,
    );
  }
}
