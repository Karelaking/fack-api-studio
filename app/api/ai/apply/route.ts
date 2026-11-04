/**
 * Fack AI API Architect — Apply Proposal HTTP Handler
 *
 * POST /api/ai/apply
 *
 * Thin interface adapter: validates authentication, verifies project access,
 * and delegates execution to the applyAiProposal domain service.
 */

import { NextRequest, NextResponse } from "next/server";
import { applyAiProposal } from "@/lib/ai/apply.service";
import { authErrorResponse, requireProjectAccess } from "@/lib/auth";
import type { ApplyApiRequest } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as ApplyApiRequest;
    const { projectId, proposalId, expectedVersion, resolutions } = body;

    if (!projectId || !proposalId || expectedVersion === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "projectId, proposalId, and expectedVersion are required",
        },
        { status: 400 },
      );
    }

    await requireProjectAccess(projectId);

    const result = await applyAiProposal({
      projectId,
      proposalId,
      expectedVersion,
      resolutions,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("[Fack AI] Failed to apply API changes:", error);
    const message =
      error instanceof Error ? error.message : "Failed to apply API changes";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
