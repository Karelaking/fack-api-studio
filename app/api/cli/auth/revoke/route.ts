import { NextRequest, NextResponse } from "next/server";

import {
  readBearerToken,
  revokeCurrentCliToken,
} from "@/lib/cli/token.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/cli/auth/revoke
 *
 * Revokes the device backing the bearer token. `fack logout` calls this before
 * deleting the local credential, so a copied token cannot outlive the session.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = readBearerToken(request);

  if (!token) {
    return NextResponse.json(
      { error: "A CLI token is required" },
      { status: 401 },
    );
  }

  try {
    const revoked = await revokeCurrentCliToken(token);
    return NextResponse.json({ success: true, revoked });
  } catch (error: unknown) {
    console.error("[Fack CLI] Failed to revoke token:", error);
    return NextResponse.json(
      { error: "Failed to revoke CLI token" },
      { status: 500 },
    );
  }
}
