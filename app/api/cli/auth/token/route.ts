import { NextRequest, NextResponse } from "next/server";

import { exchangeDeviceCode } from "@/lib/cli/device-flow.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/cli/auth/token
 *
 * Polls a device-authorization request. Pending requests return 202 so the
 * terminal keeps waiting; an approved request is exchanged exactly once for the
 * long-lived CLI token.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { deviceCode?: unknown };

  try {
    body = (await request.json()) as { deviceCode?: unknown };
  } catch {
    return NextResponse.json(
      { status: "invalid", error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (typeof body.deviceCode !== "string" || body.deviceCode.length === 0) {
    return NextResponse.json(
      { status: "invalid", error: "Missing device code" },
      { status: 400 },
    );
  }

  try {
    const result = await exchangeDeviceCode(body.deviceCode);

    switch (result.status) {
      case "approved":
        return NextResponse.json({
          status: "approved",
          token: result.token,
          tokenPrefix: result.tokenPrefix,
          device: {
            name: result.deviceName,
            platform: result.platform,
          },
          user: { id: result.userId },
        });
      case "pending":
        return NextResponse.json({ status: "pending" }, { status: 202 });
      case "denied":
        return NextResponse.json(
          {
            status: "denied",
            error: "This terminal request was denied",
          },
          { status: 403 },
        );
      case "expired":
        return NextResponse.json(
          {
            status: "expired",
            error: "This login code expired. Run `fack login` again.",
          },
          { status: 410 },
        );
      default:
        return NextResponse.json(
          { status: "invalid", error: "Unknown device code" },
          { status: 400 },
        );
    }
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : String(error);
    console.error("[Fack CLI] Failed to exchange device code:", error);
    return NextResponse.json(
      {
        status: "error",
        error: "Failed to exchange device code",
        details,
      },
      { status: 500 },
    );
  }
}
