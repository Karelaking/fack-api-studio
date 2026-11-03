import { NextRequest, NextResponse } from "next/server";
import { desc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { endpoints, projects, routes } from "@/db/schema";
import { authErrorResponse, isProjectOwnedBy } from "@/lib/auth";
import { requireCliActor } from "@/lib/cli/token.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/cli/projects
 *
 * Lists the projects the terminal may pull. The CLI uses this to auto-select a
 * workspace when `fack pull` or `fack init` runs without a slug.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const actor = await requireCliActor(request);

    const rows = await db.query.projects.findMany({
      orderBy: [desc(projects.updatedAt)],
      columns: {
        id: true,
        name: true,
        slug: true,
        description: true,
        userId: true,
        updatedAt: true,
      },
    });

    const visible = rows.filter((project) =>
      isProjectOwnedBy(project, actor.userId),
    );

    if (visible.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    const projectIds = visible.map((project) => project.id);

    const projectEndpoints = await db
      .select({
        id: endpoints.id,
        projectId: endpoints.projectId,
      })
      .from(endpoints)
      .where(inArray(endpoints.projectId, projectIds));

    const endpointToProject = new Map(
      projectEndpoints.map((endpoint) => [endpoint.id, endpoint.projectId]),
    );

    const endpointIds = projectEndpoints.map((endpoint) => endpoint.id);

    const projectRoutes =
      endpointIds.length > 0
        ? await db
            .select({ endpointId: routes.endpointId })
            .from(routes)
            .where(inArray(routes.endpointId, endpointIds))
        : [];

    const endpointCounts = new Map<string, number>();
    for (const endpoint of projectEndpoints) {
      endpointCounts.set(
        endpoint.projectId,
        (endpointCounts.get(endpoint.projectId) ?? 0) + 1,
      );
    }

    const routeCounts = new Map<string, number>();
    for (const route of projectRoutes) {
      const projectId = endpointToProject.get(route.endpointId);
      if (!projectId) continue;
      routeCounts.set(projectId, (routeCounts.get(projectId) ?? 0) + 1);
    }

    return NextResponse.json({
      projects: visible.map((project) => ({
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        endpointCount: endpointCounts.get(project.id) ?? 0,
        routeCount: routeCounts.get(project.id) ?? 0,
        updatedAt: project.updatedAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("[Fack CLI] Failed to list projects:", error);
    return NextResponse.json(
      { error: "Failed to list projects" },
      { status: 500 },
    );
  }
}
