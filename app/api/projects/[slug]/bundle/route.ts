import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { assertProjectOwnedBy, requireUserId } from "@/lib/auth";
import { authenticateCliToken, isCliToken } from "@/lib/cli/token.service";
import { compileProjectBundle } from "@/lib/bundle/bundle-compiler.service";
import {
  encryptBundle,
  generateProjectSecretKey,
  validateProjectSecretKey,
} from "@/lib/bundle/bundle-crypto.service";

/**
 * GET /api/projects/[slug]/bundle
 *
 * Downloads an AES-256-GCM encrypted runtime bundle (.fack.enc).
 * Accepts authentication via:
 * 1. CLI bearer token issued by `fack login`.
 * 2. CLI Project Secret Key: Bearer token or ?key=<key> query param.
 * 3. Web Studio Session: Clerk user authentication.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  try {
    const { slug: projectSlug } = await context.params;

    const project = await db.query.projects.findFirst({
      where: or(eq(projects.slug, projectSlug), eq(projects.id, projectSlug)),
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found", projectSlug },
        { status: 404 },
      );
    }

    const projectSecretKey = generateProjectSecretKey(project.id);

    // Check for CLI key authentication first
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : undefined;
    const queryKey = request.nextUrl.searchParams.get("key")?.trim();
    const providedKey = bearerToken || queryKey;

    let isAuthenticated = false;
    let viaCliToken = false;

    if (providedKey) {
      if (isCliToken(providedKey)) {
        const cliAuth = await authenticateCliToken(providedKey);

        if (!cliAuth) {
          return NextResponse.json(
            {
              error: "CLI token is invalid, revoked, or expired",
              message: "Run `fack login` to authorize this terminal again.",
            },
            { status: 401 },
          );
        }

        try {
          assertProjectOwnedBy(project, cliAuth.userId);
        } catch {
          return NextResponse.json(
            { error: "You do not have access to this project" },
            { status: 403 },
          );
        }

        isAuthenticated = true;
        viaCliToken = true;
      } else if (validateProjectSecretKey(project.id, providedKey)) {
        isAuthenticated = true;
      } else {
        return NextResponse.json(
          { error: "Invalid project secret key or CLI token" },
          { status: 401 },
        );
      }
    } else {
      // Fall back to web session authentication
      try {
        const userId = await requireUserId();
        assertProjectOwnedBy(project, userId);
        isAuthenticated = true;
      } catch {
        return NextResponse.json(
          {
            error: "Authentication required",
            message:
              "Provide a valid project secret key via Bearer token / ?key= or sign in to the studio.",
          },
          { status: 401 },
        );
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bundle = await compileProjectBundle(project.id);
    const encryptedBytes = encryptBundle(bundle, projectSecretKey);

    const filename = `${project.slug}.fack.enc`;

    return new Response(new Uint8Array(encryptedBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Fack-Project-Id": project.id,
        "X-Fack-Project-Slug": project.slug,
        "X-Fack-Project-Name": encodeURIComponent(project.name),
        "X-Fack-Version": "1",
        // Token-authenticated terminals receive the deterministic
        // project key so `fack pull` can provision `.env` without the
        // developer copying a secret out of the dashboard.
        ...(viaCliToken ? { "X-Fack-Project-Key": projectSecretKey } : {}),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    console.error("Bundle generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate project bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
