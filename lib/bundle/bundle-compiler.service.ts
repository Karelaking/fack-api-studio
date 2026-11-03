/**
 * Fack API - Bundle Compiler Service
 *
 * Flattens projects, endpoints, routes, scenarios, and mock states into
 * a self-contained runtime AST bundle for local execution and encryption.
 */

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  BUNDLE_MAGIC_HEADER,
  BUNDLE_SPEC_VERSION,
  type FackRuntimeBundle,
  type FackRuntimeEndpoint,
  type FackRuntimeRoute,
  type FackRuntimeScenario,
  type FackRuntimeMockState,
} from "./bundle.type";

function safeJsonParse<T>(
  value: string | undefined | null,
  defaultValue: T,
): T {
  if (!value) {
    return defaultValue;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

function normalizeCombinedPath(basePath: string, routePath: string): string {
  const cleanBase = basePath.trim().replace(/^\/+|\/+$/g, "");
  const cleanRoute = routePath.trim().replace(/^\/+|\/+$/g, "");

  if (!cleanBase && !cleanRoute) {
    return "/";
  }

  if (!cleanBase) {
    return `/${cleanRoute}`;
  }

  if (!cleanRoute) {
    return `/${cleanBase}`;
  }

  return `/${cleanBase}/${cleanRoute}`;
}

function inferCollectionName(path: string): string | undefined {
  const segments = path
    .split("/")
    .filter(
      (s) =>
        Boolean(s) &&
        !s.startsWith(":") &&
        !s.startsWith("*") &&
        s !== "api" &&
        s !== "v1" &&
        s !== "v2",
    );
  return segments.length > 0 ? segments[0] : undefined;
}

/**
 * Compiles a project into a self-contained FackRuntimeBundle.
 */
export async function compileProjectBundle(
  projectId: string,
): Promise<FackRuntimeBundle> {
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, projectId),
  });

  if (!project) {
    throw new Error(`Project with ID "${projectId}" not found.`);
  }

  const endpoints = await db
    .select()
    .from(schema.endpoints)
    .where(eq(schema.endpoints.projectId, projectId));

  const endpointIds = endpoints.map((ep) => ep.id);

  const rawRoutes =
    endpointIds.length > 0
      ? await db
          .select()
          .from(schema.routes)
          .where(inArray(schema.routes.endpointId, endpointIds))
      : [];

  const scenarios = await db
    .select()
    .from(schema.scenarios)
    .where(eq(schema.scenarios.projectId, projectId));

  const mockStates = await db
    .select()
    .from(schema.mockStates)
    .where(eq(schema.mockStates.projectId, projectId));

  const endpointMap = new Map<string, (typeof endpoints)[number]>();
  for (const ep of endpoints) {
    endpointMap.set(ep.id, ep);
  }

  const runtimeEndpoints: FackRuntimeEndpoint[] = endpoints.map((ep) => ({
    id: ep.id,
    name: ep.name,
    basePath: ep.basePath || "",
    description: ep.description || "",
  }));

  const runtimeRoutes: FackRuntimeRoute[] = rawRoutes.map((r) => {
    const ep = endpointMap.get(r.endpointId);
    const basePath = ep?.basePath || "";
    const fullPath = normalizeCombinedPath(basePath, r.path);

    return {
      id: r.id,
      endpointId: r.endpointId,
      method: r.method,
      path: r.path,
      fullPath,
      statusCode: r.statusCode || 200,
      responseSchema: safeJsonParse<Record<string, unknown>>(
        r.responseSchema,
        {},
      ),
      responseTemplate: r.responseTemplate || undefined,
      latencyMin: r.latencyMin ?? 0,
      latencyMax: r.latencyMax ?? 0,
      errorRate: r.errorRate ?? 0,
      customHeaders: safeJsonParse<Record<string, string>>(r.customHeaders, {}),
      isAuthRequired: Boolean(r.isAuthRequired),
      isEnabled: r.isEnabled !== false,
      collectionName: inferCollectionName(fullPath),
    };
  });

  const runtimeScenarios: FackRuntimeScenario[] = scenarios.map((s) => ({
    id: s.id,
    name: s.name,
    latencyMultiplier: s.latencyMultiplier ?? 1.0,
    forcedErrorRate: s.forcedErrorRate ?? 0,
  }));

  const runtimeMockStates: FackRuntimeMockState[] = mockStates.map((ms) => ({
    id: ms.id,
    collection: ms.collection,
    itemKey: ms.itemKey,
    data: safeJsonParse<Record<string, unknown>>(ms.data, {}),
  }));

  return {
    magic: BUNDLE_MAGIC_HEADER,
    version: BUNDLE_SPEC_VERSION,
    projectId: project.id,
    projectName: project.name,
    projectSlug: project.slug,
    exportedAt: new Date().toISOString(),
    activeScenarioId: project.activeScenarioId || undefined,
    endpoints: runtimeEndpoints,
    routes: runtimeRoutes,
    scenarios: runtimeScenarios,
    mockStates: runtimeMockStates,
  };
}
