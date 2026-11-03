import { NextRequest, NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/auth";
import { requireCliActor } from "@/lib/cli/token.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/cli/me
 *
 * Identifies the terminal to `fack whoami`. Local deployments report the
 * shared system workspace so the CLI works without a login.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const actor = await requireCliActor(request);

    return NextResponse.json({
      authenticated: true,
      mode: actor.source,
      user: { id: actor.userId },
      device: actor.device
        ? {
            id: actor.device.id,
            name: actor.device.name,
            platform: actor.device.platform,
            createdAt: actor.device.createdAt.toISOString(),
            lastUsedAt: actor.device.lastUsedAt?.toISOString() ?? null,
          }
        : null,
    });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("[Fack CLI] Failed to resolve current terminal:", error);
    return NextResponse.json(
      { error: "Failed to resolve current terminal" },
      { status: 500 },
    );
  }
}
