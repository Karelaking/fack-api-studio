import { NextRequest, NextResponse } from "next/server";

import { startDeviceAuthorization } from "@/lib/cli/device-flow.service";
import { getClientIp, rateLimiter } from "@/lib/security/rate-limiter.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/cli/auth/device
 *
 * Starts a device-authorization handshake for `fack login`. The response carries
 * the secret device code the terminal polls with and the short user code the
 * developer types into the browser.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const rate = rateLimiter.check(`device_flow:${ip}`, 15, 60);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Too many login attempts. Please slow down.",
        details: `Rate limit exceeded. Try again in ${rate.resetInSeconds} seconds.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.resetInSeconds),
        },
      },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      deviceName?: unknown;
      platform?: unknown;
    };

    const authorization = await startDeviceAuthorization({
      deviceName:
        typeof body.deviceName === "string" ? body.deviceName : undefined,
      platform: typeof body.platform === "string" ? body.platform : undefined,
    });

    const authorizePath = `/cli/authorize?code=${encodeURIComponent(
      authorization.userCode,
    )}`;

    return NextResponse.json({
      ...authorization,
      verificationUri: "/cli/authorize",
      verificationUriComplete: authorizePath,
    });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : String(error);
    console.error("[Fack CLI] Failed to start device authorization:", error);
    return NextResponse.json(
      {
        error: "Failed to start device authorization",
        details,
      },
      { status: 500 },
    );
  }
}
