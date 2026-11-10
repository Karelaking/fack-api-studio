"use server";

import { cache } from "react";
import { db } from "@/db";
import { routes, endpoints, type Route, type Endpoint } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateId } from "@/lib/utils";
import {
  clearProjectCache,
  clearRouteCache,
  getCachedProjectRoutes,
  setCachedProjectRoutes,
} from "@/lib/cache";
import {
  requireEndpointAccess,
  requireProjectAccess,
  requireRouteAccess,
} from "@/lib/auth";
import { markProjectDirty } from "@/lib/file-manager/dirty-tracker";
import {
  createRouteSchema,
  updateRouteSchema,
  type CreateRouteInput,
  type UpdateRouteInput,
} from "@/lib/validators";
import { LoggerRegistry } from "@/lib/logger-registry";
import {
  getEffectiveRoutePath,
  validateRoutePath,
  validateRouteSchemaBindings,
  detectParameterRenames,
  remapSchemaParameters,
  syncRoutePathSchema,
} from "@/lib/services/route-param.service";
import {
  generateRandomFapiValue,
  generateRandomFapiParams,
} from "@/lib/services/fapi-random.service";

const routesTrace = LoggerRegistry.getTrace("db-routes");

/**
 * Retrieves all routes belonging to a specific endpoint group.
 */
export const getRoutes = cache(async function getRoutes(
  endpointId: string,
): Promise<Route[]> {
  routesTrace.traceCall("getRoutes", endpointId);
  await requireEndpointAccess(endpointId);
  try {
    const list = await db.query.routes.findMany({
      where: eq(routes.endpointId, endpointId),
      orderBy: (routes, { asc }) => [asc(routes.path)],
    });
    routesTrace.traceSuccess("getRoutes", `${list.length} routes`);
    return list;
  } catch (error) {
    routesTrace.traceError("getRoutes", error);
    throw error;
  }
});

/**
 * Retrieves a single route by its unique ID.
 */
export const getRouteById = cache(async function getRouteById(
  id: string,
): Promise<Route | undefined> {
  routesTrace.traceCall("getRouteById", id);
  await requireRouteAccess(id);
  try {
    const existingRoute = await db.query.routes.findFirst({
      where: eq(routes.id, id),
    });
    routesTrace.traceSuccess(
      "getRouteById",
      existingRoute
        ? `${existingRoute.method} ${existingRoute.path}`
        : "undefined",
    );
    return existingRoute;
  } catch (error) {
    routesTrace.traceError("getRouteById", error);
    throw error;
  }
});

/**
 * Retrieves all routes scoped to a specific project, preventing multi-tenant data leaks.
 */
export const getRoutesByProjectId = cache(async function getRoutesByProjectId(
  projectId: string,
): Promise<(Route & { endpoint: Endpoint })[]> {
  routesTrace.traceCall("getRoutesByProjectId", projectId);
  await requireProjectAccess(projectId);

  const cached = getCachedProjectRoutes(projectId);
  if (cached) {
    routesTrace.traceSuccess(
      "getRoutesByProjectId (LRU cache hit)",
      `${cached.length} routes`,
    );
    return cached;
  }

  try {
    const projectEndpoints = await db.query.endpoints.findMany({
      where: eq(endpoints.projectId, projectId),
      columns: { id: true },
    });

    if (projectEndpoints.length === 0) {
      routesTrace.traceSuccess(
        "getRoutesByProjectId",
        "0 routes (no endpoints)",
      );
      return [];
    }

    const endpointIds = projectEndpoints.map((ep) => ep.id);
    const list = await db.query.routes.findMany({
      where: inArray(routes.endpointId, endpointIds),
      with: {
        endpoint: true,
      },
      orderBy: (routes, { asc }) => [asc(routes.path)],
    });

    setCachedProjectRoutes(
      projectId,
      list as (Route & { endpoint: Endpoint })[],
    );
    routesTrace.traceSuccess(
      "getRoutesByProjectId (DB fetched)",
      `${list.length} routes`,
    );
    return list as (Route & { endpoint: Endpoint })[];
  } catch (error) {
    routesTrace.traceError("getRoutesByProjectId", error);
    throw error;
  }
});

/**
 * Creates a new route under a designated endpoint.
 */
export async function createRoute(input: CreateRouteInput): Promise<Route> {
  routesTrace.traceCall(
    "createRoute",
    input.endpointId,
    input.method,
    input.path,
  );
  await requireEndpointAccess(input.endpointId);
  try {
    const parsed = createRouteSchema.parse(input);

    const parentEndpoint = await db.query.endpoints.findFirst({
      where: eq(endpoints.id, parsed.endpointId),
      columns: { projectId: true, basePath: true },
    });

    const effectivePath = getEffectiveRoutePath(
      parentEndpoint?.basePath ?? "",
      parsed.path,
    );

    const pathValidation = validateRoutePath(effectivePath);
    if (!pathValidation.isValid) {
      throw new Error(pathValidation.errors.join(" "));
    }

    if (parsed.responseSchema) {
      try {
        let schemaObj: unknown = JSON.parse(parsed.responseSchema);
        const declaredParamNames = pathValidation.parameters.map((p) => p.name);
        const synced = syncRoutePathSchema(schemaObj, declaredParamNames);
        schemaObj = synced.schema;
        parsed.responseSchema = JSON.stringify(schemaObj);

        const bindingValidation = validateRouteSchemaBindings(
          schemaObj,
          declaredParamNames,
        );
        if (!bindingValidation.isValid) {
          throw new Error(bindingValidation.errors.join(" "));
        }
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          // Schema is not JSON yet, ignore syntax errors for empty strings
        } else {
          throw parseError;
        }
      }
    }

    const id = generateId();

    const [route] = await db
      .insert(routes)
      .values({
        id,
        endpointId: parsed.endpointId,
        method: parsed.method,
        path: parsed.path,
        statusCode: parsed.statusCode,
        responseSchema: parsed.responseSchema || "{}",
      })
      .returning();

    if (parentEndpoint) {
      clearProjectCache(parentEndpoint.projectId);
      markProjectDirty(parentEndpoint.projectId);
    }
    clearRouteCache(route.id);
    revalidatePath("/");
    routesTrace.traceSuccess("createRoute", `${route.method} ${route.path}`);
    return route;
  } catch (error) {
    routesTrace.traceError("createRoute", error);
    throw error;
  }
}

/**
 * Updates route configuration properties.
 */
export async function updateRoute(input: UpdateRouteInput): Promise<Route> {
  routesTrace.traceCall("updateRoute", input.id, input.method, input.path);
  await requireRouteAccess(input.id);
  try {
    const parsed = updateRouteSchema.parse(input);
    const { id, ...updates } = parsed;

    const existingRoute = await db.query.routes.findFirst({
      where: eq(routes.id, id),
      with: {
        endpoint: {
          columns: { projectId: true, basePath: true },
        },
      },
    });

    if (!existingRoute) {
      throw new Error(`Route "${id}" not found.`);
    }

    const effectiveBasePath = existingRoute.endpoint?.basePath ?? "";
    const targetPath =
      updates.path !== undefined ? updates.path : existingRoute.path;
    const oldEffectivePath = getEffectiveRoutePath(
      effectiveBasePath,
      existingRoute.path,
    );
    const effectivePath = getEffectiveRoutePath(effectiveBasePath, targetPath);

    const pathValidation = validateRoutePath(effectivePath);
    if (!pathValidation.isValid) {
      throw new Error(pathValidation.errors.join(" "));
    }

    // Detect if any path parameters were renamed and remap responseSchema
    const paramRenames = detectParameterRenames(
      oldEffectivePath,
      effectivePath,
    );

    let targetSchema =
      updates.responseSchema !== undefined
        ? updates.responseSchema
        : existingRoute.responseSchema;

    const declaredParamNames = pathValidation.parameters.map((p) => p.name);

    if (targetSchema) {
      try {
        let schemaObj: unknown = JSON.parse(targetSchema);

        if (Object.keys(paramRenames).length > 0) {
          schemaObj = remapSchemaParameters(schemaObj, paramRenames);
        }

        // Reconcile and auto-add fields for all declared path parameters
        const synced = syncRoutePathSchema(schemaObj, declaredParamNames);
        schemaObj = synced.schema;

        targetSchema = JSON.stringify(schemaObj);
        updates.responseSchema = targetSchema;
      } catch (parseError) {
        if (!(parseError instanceof SyntaxError)) {
          throw parseError;
        }
      }
    }

    if (targetSchema) {
      try {
        const schemaObj: unknown = JSON.parse(targetSchema);
        const bindingValidation = validateRouteSchemaBindings(
          schemaObj,
          declaredParamNames,
        );
        if (!bindingValidation.isValid) {
          throw new Error(bindingValidation.errors.join(" "));
        }
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          // Ignore raw JSON syntax errors
        } else {
          throw parseError;
        }
      }
    }

    const [route] = await db
      .update(routes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(routes.id, id))
      .returning();

    const projectId = existingRoute.endpoint?.projectId;
    if (projectId) {
      clearProjectCache(projectId);
      markProjectDirty(projectId);
    }
    clearRouteCache(route.id);
    revalidatePath("/");
    routesTrace.traceSuccess("updateRoute", `${route.method} ${route.path}`);
    return route;
  } catch (error) {
    routesTrace.traceError("updateRoute", error);
    throw error;
  }
}

/**
 * Deletes a route by its ID.
 */
export async function deleteRoute(id: string): Promise<void> {
  routesTrace.traceCall("deleteRoute", id);
  await requireRouteAccess(id);
  try {
    const route = await db.query.routes.findFirst({
      where: eq(routes.id, id),
      with: { endpoint: { columns: { projectId: true } } },
    });
    await db.delete(routes).where(eq(routes.id, id));
    if (route) {
      clearRouteCache(route.id);
      if (route.endpoint) {
        clearProjectCache(route.endpoint.projectId);
        markProjectDirty(route.endpoint.projectId);
      }
    }
    revalidatePath("/");
    routesTrace.traceSuccess("deleteRoute", "void");
    return;
  } catch (error) {
    routesTrace.traceError("deleteRoute", error);
    throw error;
  }
}

/**
 * Generates a dynamic random sample string from a FAPI (Faker.js) provider at runtime.
 */
export async function getRandomFapiValueAction(
  providerPath: string,
): Promise<string> {
  routesTrace.traceCall("getRandomFapiValueAction", providerPath);
  try {
    const val = generateRandomFapiValue(providerPath);
    routesTrace.traceSuccess("getRandomFapiValueAction", val);
    return val;
  } catch (error) {
    routesTrace.traceError("getRandomFapiValueAction", error);
    throw error;
  }
}

/**
 * Generates dynamic random runtime values for multiple route parameters configured with FAPI providers.
 */
export async function getRandomFapiParamsAction(
  paramProviders: Record<string, string>,
): Promise<Record<string, string>> {
  routesTrace.traceCall(
    "getRandomFapiParamsAction",
    Object.keys(paramProviders).join(", "),
  );
  try {
    const res = generateRandomFapiParams(paramProviders);
    routesTrace.traceSuccess(
      "getRandomFapiParamsAction",
      `${Object.keys(res).length} params`,
    );
    return res;
  } catch (error) {
    routesTrace.traceError("getRandomFapiParamsAction", error);
    throw error;
  }
}
