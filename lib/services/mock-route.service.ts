import { eq } from "drizzle-orm";
import { db } from "@/db";
import { endpoints } from "@/db/schema";
import {
  getCachedRoutes,
  setCachedRoutes,
  type CachedRoute,
} from "@/lib/cache";
import { findMatchingRoute, type RouteMatchResult } from "@/lib/route-matcher";
import { LoggerRegistry } from "@/lib/logger-registry";

const routeServiceTrace = LoggerRegistry.getTrace("mock-route");

function normalizePath(path: string): string {
  const normalized = ("/" + path).replace(/\/+/g, "/").replace(/\/$/, "");
  return normalized || "/";
}

/**
 * The enabled subset for a route snapshot is derived once per snapshot.
 *
 * `getProjectMockRoutes` returns a stable array until the project is edited, so
 * keying this WeakMap by that array keeps the filter out of the request path.
 * Deriving it with `.filter()` on every request also produced a brand-new array
 * each time, which silently defeated the compiled-matcher cache.
 */
const enabledRoutesCache = new WeakMap<CachedRoute[], CachedRoute[]>();

function getEnabledRoutes(routes: CachedRoute[]): CachedRoute[] {
  let enabled = enabledRoutesCache.get(routes);
  if (!enabled) {
    enabled = routes.filter((route) => route.isEnabled);
    enabledRoutesCache.set(routes, enabled);
  }
  return enabled;
}

export async function getProjectMockRoutes(
  projectId: string,
): Promise<CachedRoute[]> {
  const cachedRoutes = getCachedRoutes(projectId);
  if (cachedRoutes) {
    return cachedRoutes;
  }

  const projectEndpoints = await db.query.endpoints.findMany({
    where: eq(endpoints.projectId, projectId),
    with: {
      routes: {
        with: { webhooks: true },
      },
    },
  });

  const routes = projectEndpoints.flatMap((endpoint) =>
    endpoint.routes.map((route) => ({
      ...route,
      endpoint: {
        id: endpoint.id,
        basePath: endpoint.basePath,
        name: endpoint.name,
      },
      path: normalizePath(endpoint.basePath + route.path),
    })),
  );

  setCachedRoutes(projectId, routes);
  return routes;
}

export async function matchProjectMockRoute(
  projectId: string,
  method: string,
  requestPath: string,
): Promise<RouteMatchResult | null> {
  const routes = await getProjectMockRoutes(projectId);
  const match = findMatchingRoute(
    getEnabledRoutes(routes),
    method,
    requestPath,
  );
  routeServiceTrace.traceSuccess(
    "matchProjectMockRoute",
    match ? `${method} ${requestPath}` : "no match",
  );
  return match;
}
