"use server";

import { db } from "@/db";
import { routes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { clearProjectCache, clearRouteCache } from "@/lib/cache";
import { requireRouteAccess } from "@/lib/auth";
import { markProjectDirty } from "@/lib/file-manager/dirty-tracker";
import {
  parseSchemaToFields,
  synthesizeSchema,
  type SchemaField,
} from "@/lib/schema-synthesizer";
import { getProviderByValue } from "@/lib/faker-registry";
import type { Route } from "@/db/schema";
import { LoggerRegistry } from "@/lib/logger-registry";
import { generateId } from "@/lib/utils";

const dndTrace = LoggerRegistry.getTrace("canvas-dnd");

/**
 * Derives a camelCase field name from a Faker.js provider value.
 *
 * @example providerToCamelCase("person.fullName") => "fullName"
 * @example providerToCamelCase("internet.email") => "email"
 */
function providerToCamelCase(providerValue: string): string {
  const parts = providerValue.split(".");
  // Use the method part (last segment) as the field name
  const method = parts[parts.length - 1] ?? "field";
  // Convert PascalCase or snake_case to camelCase
  return method
    .replace(/_([a-z])/g, (_, char: string) => char.toUpperCase())
    .replace(/^([A-Z])/, (char: string) => char.toLowerCase());
}

/**
 * Ensures the generated field name is unique within the existing fields list.
 * Appends a numeric suffix when a collision is detected.
 */
function ensureUniqueName(baseName: string, existing: SchemaField[]): string {
  const names = new Set(existing.map((f) => f.name));
  if (!names.has(baseName)) return baseName;

  let counter = 2;
  while (names.has(`${baseName}${counter}`)) {
    counter++;
  }
  return `${baseName}${counter}`;
}

/**
 * Appends a Faker.js provider as a new field on a route's response schema.
 * Uses the provider's label to derive a camelCase field name automatically.
 *
 * @param routeId - The route to update
 * @param fakerProvider - Faker.js method path, e.g. "person.fullName"
 * @returns The updated Route record
 */
export async function addFieldToRoute(
  routeId: string,
  fakerProvider: string,
): Promise<Route> {
  dndTrace.traceCall("addFieldToRoute", routeId, fakerProvider);
  await requireRouteAccess(routeId);

  try {
    const existing = await db.query.routes.findFirst({
      where: eq(routes.id, routeId),
    });

    if (!existing) {
      throw new Error(`Route ${routeId} not found`);
    }

    // 1. Parse current schema into fields tree
    let currentFields: SchemaField[] = [];
    try {
      const parsed = JSON.parse(existing.responseSchema ?? "{}");
      currentFields = parseSchemaToFields(parsed);
    } catch {
      currentFields = [];
    }

    // 2. Build new field with camelCase name derived from provider
    const baseName = providerToCamelCase(fakerProvider);
    const uniqueName = ensureUniqueName(baseName, currentFields);

    const provider = getProviderByValue(fakerProvider);

    const newField: SchemaField = {
      id: `field-${generateId(6)}`,
      name: uniqueName,
      type: "string",
      nullable: false,
      fakerProvider,
    };

    // 3. Determine best type from provider metadata (heuristic)
    if (provider) {
      const example = provider.example;
      const exampleLower = example.toLowerCase();
      if (
        example === "true" ||
        example === "false" ||
        exampleLower === "boolean"
      ) {
        newField.type = "boolean";
      } else if (!isNaN(Number(example)) && example.trim() !== "") {
        newField.type = Number.isInteger(Number(example))
          ? "integer"
          : "number";
      }
    }

    // 4. Append field and synthesize back to JSON Schema
    const updatedFields = [...currentFields, newField];
    const updatedSchema = synthesizeSchema(updatedFields);

    // 5. Write to DB
    const [route] = await db
      .update(routes)
      .set({
        responseSchema: JSON.stringify(updatedSchema),
        updatedAt: new Date(),
      })
      .where(eq(routes.id, routeId))
      .returning();

    // 6. Clear caches
    const parentEndpoint = await db.query.endpoints.findFirst({
      where: eq((await import("@/db/schema")).endpoints.id, route.endpointId),
      columns: { projectId: true },
    });
    if (parentEndpoint) {
      clearProjectCache(parentEndpoint.projectId);
      markProjectDirty(parentEndpoint.projectId);
    }
    clearRouteCache(route.id);
    revalidatePath("/");

    dndTrace.traceSuccess(
      "addFieldToRoute",
      `appended ${uniqueName} (${fakerProvider})`,
    );
    return route;
  } catch (error) {
    dndTrace.traceError("addFieldToRoute", error);
    throw error;
  }
}

/**
 * Removes a field from a route's response schema by field id.
 *
 * @param routeId - The route to update
 * @param fieldId - The schema field id to remove
 * @returns The updated Route record
 */
export async function removeFieldFromRoute(
  routeId: string,
  fieldId: string,
): Promise<Route> {
  dndTrace.traceCall("removeFieldFromRoute", routeId, fieldId);
  await requireRouteAccess(routeId);

  try {
    const existing = await db.query.routes.findFirst({
      where: eq(routes.id, routeId),
    });

    if (!existing) {
      throw new Error(`Route ${routeId} not found`);
    }

    let currentFields: SchemaField[] = [];
    try {
      const parsed = JSON.parse(existing.responseSchema ?? "{}");
      currentFields = parseSchemaToFields(parsed);
    } catch {
      currentFields = [];
    }

    const filterField = (fields: SchemaField[]): SchemaField[] =>
      fields
        .filter((f) => f.id !== fieldId)
        .map((f) => ({
          ...f,
          children: f.children ? filterField(f.children) : undefined,
          arrayItemChildren: f.arrayItemChildren
            ? filterField(f.arrayItemChildren)
            : undefined,
        }));

    const updatedFields = filterField(currentFields);
    const updatedSchema = synthesizeSchema(updatedFields);

    const [route] = await db
      .update(routes)
      .set({
        responseSchema: JSON.stringify(updatedSchema),
        updatedAt: new Date(),
      })
      .where(eq(routes.id, routeId))
      .returning();

    const parentEndpoint = await db.query.endpoints.findFirst({
      where: eq((await import("@/db/schema")).endpoints.id, route.endpointId),
      columns: { projectId: true },
    });
    if (parentEndpoint) {
      clearProjectCache(parentEndpoint.projectId);
      markProjectDirty(parentEndpoint.projectId);
    }
    clearRouteCache(route.id);
    revalidatePath("/");

    dndTrace.traceSuccess("removeFieldFromRoute", fieldId);
    return route;
  } catch (error) {
    dndTrace.traceError("removeFieldFromRoute", error);
    throw error;
  }
}
