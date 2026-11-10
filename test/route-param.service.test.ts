import { describe, it, expect } from "vite-plus/test";
import {
  getEffectiveRoutePath,
  extractRoutePathParameters,
  validateRoutePath,
  validateRouteSchemaBindings,
  detectParameterRenames,
  remapFieldsParameters,
  remapSchemaParameters,
  reconcileFieldParameters,
  reconcileSchemaParameters,
  syncRoutePathFields,
  syncRoutePathSchema,
  insertFieldInCanonicalOrder,
  sortFieldsCanonically,
} from "../lib/services/route-param.service";
import type { SchemaField } from "../lib/schema-synthesizer";

describe("Route Parameter Service", () => {
  describe("getEffectiveRoutePath", () => {
    it("should combine endpoint base path and route subpath cleanly", () => {
      expect(getEffectiveRoutePath("/api/v1", "/users/:id")).toBe(
        "/api/v1/users/:id",
      );
      expect(getEffectiveRoutePath("api/v1/", "users/:id/")).toBe(
        "/api/v1/users/:id",
      );
    });

    it("should handle empty or root base paths", () => {
      expect(getEffectiveRoutePath("", "/users/:id")).toBe("/users/:id");
      expect(getEffectiveRoutePath("/", "users/:id")).toBe("/users/:id");
      expect(getEffectiveRoutePath("/api/v2", "/")).toBe("/api/v2");
      expect(getEffectiveRoutePath("", "")).toBe("/");
    });
  });

  describe("extractRoutePathParameters", () => {
    it("should extract named colon parameters", () => {
      const params = extractRoutePathParameters(
        "/users/:userId/orders/:orderId",
      );
      expect(params).toHaveLength(2);
      expect(params[0]).toEqual({
        name: "userId",
        raw: ":userId",
        isWildcard: false,
        required: true,
      });
      expect(params[1]).toEqual({
        name: "orderId",
        raw: ":orderId",
        isWildcard: false,
        required: true,
      });
    });

    it("should extract wildcard parameters", () => {
      const params = extractRoutePathParameters("/files/*path");
      expect(params).toHaveLength(1);
      expect(params[0]).toEqual({
        name: "path",
        raw: "*path",
        isWildcard: true,
        required: true,
      });
    });

    it("should return empty array for static routes", () => {
      expect(extractRoutePathParameters("/api/v1/health")).toEqual([]);
    });
  });

  describe("validateRoutePath", () => {
    it("should validate standard route paths successfully", () => {
      const res = validateRoutePath("/api/v2/users/:id");
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.parameters).toHaveLength(1);
      expect(res.parameters[0].name).toBe("id");
    });

    it("should reject non-slash-delimited parameters like /users:id", () => {
      const res = validateRoutePath("/users:id");
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain("forward slash");
    });

    it("should reject empty parameter tokens like /:", () => {
      const res = validateRoutePath("/users/:");
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("cannot be empty"))).toBe(true);
    });

    it("should reject duplicate parameter names in the same route", () => {
      const res = validateRoutePath("/users/:id/photos/:id");
      expect(res.isValid).toBe(false);
      expect(
        res.errors.some((e) => e.includes('Duplicate parameter ":id"')),
      ).toBe(true);
    });
  });

  describe("validateRouteSchemaBindings", () => {
    it("should validate schema bindings matching declared parameters", () => {
      const schema = {
        type: "object",
        properties: {
          id: {
            type: "string",
            "x-fack-source": { type: "pathParam", name: "id" },
          },
          name: {
            type: "string",
          },
        },
      };

      const result = validateRouteSchemaBindings(schema, ["id"]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.boundFields).toHaveLength(1);
      expect(result.boundFields[0]).toEqual({
        fieldName: "id",
        paramName: "id",
        fieldLocation: "id",
      });
    });

    it("should detect stale or undeclared parameter references", () => {
      const schema = {
        type: "object",
        properties: {
          userId: {
            type: "string",
            "x-fack-source": { type: "pathParam", name: "missingParam" },
          },
        },
      };

      const result = validateRouteSchemaBindings(schema, ["id"]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain(
        'binds to URL parameter ":missingParam", which is not present in the route path',
      );
    });

    it("should validate nested object and array item bindings", () => {
      const schema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: {
                type: "string",
                "x-fack-source": { type: "pathParam", name: "userId" },
              },
            },
          },
        },
      };

      const result = validateRouteSchemaBindings(schema, ["userId"]);
      expect(result.isValid).toBe(true);
      expect(result.boundFields[0].fieldLocation).toBe("user.id");
    });
  });

  describe("detectParameterRenames", () => {
    it("should detect 1-to-1 parameter rename", () => {
      const renames = detectParameterRenames(
        "/projects/:name",
        "/projects/:projectId",
      );
      expect(renames).toEqual({ name: "projectId" });
    });

    it("should detect rename with different path prefix", () => {
      const renames = detectParameterRenames("/:name", "/projects/:projectId");
      expect(renames).toEqual({ name: "projectId" });
    });

    it("should detect rename among multiple parameters while preserving unchanged ones", () => {
      const renames = detectParameterRenames(
        "/orgs/:orgId/users/:name",
        "/orgs/:orgId/users/:userId",
      );
      expect(renames).toEqual({ name: "userId" });
    });

    it("should return empty object when parameters are unchanged", () => {
      const renames = detectParameterRenames(
        "/projects/:name",
        "/projects/:name",
      );
      expect(renames).toEqual({});
    });

    it("should return empty object when a parameter is newly added or removed", () => {
      expect(detectParameterRenames("/projects", "/projects/:id")).toEqual({});
      expect(detectParameterRenames("/projects/:id", "/projects")).toEqual({});
    });
  });

  describe("remapFieldsParameters", () => {
    it("should remap field name and source when parameter is renamed", () => {
      const fields: SchemaField[] = [
        {
          id: "f-1",
          name: "name",
          type: "string",
          nullable: false,
          source: { type: "pathParam", name: "name" },
        },
        {
          id: "f-2",
          name: "createdAt",
          type: "string",
          nullable: false,
        },
      ];

      const remapped = remapFieldsParameters(fields, { name: "projectId" });
      expect(remapped[0].name).toBe("projectId");
      expect(remapped[0].source).toEqual({
        type: "pathParam",
        name: "projectId",
      });
      expect(remapped[1].name).toBe("createdAt");
    });

    it("should remap nested fields inside object children", () => {
      const fields: SchemaField[] = [
        {
          id: "f-parent",
          name: "project",
          type: "object",
          nullable: false,
          children: [
            {
              id: "f-child",
              name: "name",
              type: "string",
              nullable: false,
              source: { type: "pathParam", name: "name" },
            },
          ],
        },
      ];

      const remapped = remapFieldsParameters(fields, { name: "projectId" });
      expect(remapped[0].children?.[0].name).toBe("projectId");
      expect(remapped[0].children?.[0].source).toEqual({
        type: "pathParam",
        name: "projectId",
      });
    });
  });

  describe("remapSchemaParameters", () => {
    it("should remap JSON schema property key, x-fack-source, and required array", () => {
      const rawSchema = {
        type: "object",
        properties: {
          name: {
            type: "string",
            "x-fack-source": { type: "pathParam", name: "name" },
          },
          title: { type: "string" },
        },
        required: ["name"],
        "x-fack-params": {
          name: { mode: "fapi", provider: "company.name" },
        },
      };

      const remapped = remapSchemaParameters(rawSchema, {
        name: "projectId",
      }) as {
        properties: Record<
          string,
          { "x-fack-source"?: unknown; [k: string]: unknown }
        >;
        required: string[];
        "x-fack-params": Record<string, unknown>;
      };

      expect(remapped.properties).toHaveProperty("projectId");
      expect(remapped.properties).not.toHaveProperty("name");
      expect(remapped.properties["projectId"]["x-fack-source"]).toEqual({
        type: "pathParam",
        name: "projectId",
      });
      expect(remapped.required).toEqual(["projectId"]);
      expect(remapped["x-fack-params"]).toHaveProperty("projectId");
      expect(remapped["x-fack-params"]).not.toHaveProperty("name");
    });
  });

  describe("reconcileFieldParameters", () => {
    it("should update existing field in-place instead of creating a new field", () => {
      const fields: SchemaField[] = [
        {
          id: "f-name",
          name: "name",
          type: "string",
          nullable: false,
          source: { type: "pathParam", name: "name" },
        },
        {
          id: "f-created",
          name: "createdAt",
          type: "string",
          nullable: false,
          fakerProvider: "date.past",
        },
      ];

      // Route path parameter was renamed from "name" to "projectId"
      const { fields: reconciled, renames } = reconcileFieldParameters(fields, [
        "projectId",
      ]);

      expect(renames).toEqual({ name: "projectId" });
      // Total count of fields must remain exactly 2 (no new field added)
      expect(reconciled.length).toBe(2);
      expect(reconciled[0].id).toBe("f-name");
      expect(reconciled[0].name).toBe("projectId");
      expect(reconciled[0].source).toEqual({
        type: "pathParam",
        name: "projectId",
      });
      // Second field unaffected
      expect(reconciled[1].name).toBe("createdAt");
    });

    it("should preserve already-mapped parameters and only reconcile unmapped ones", () => {
      const fields: SchemaField[] = [
        {
          id: "f-org",
          name: "orgId",
          type: "string",
          nullable: false,
          source: { type: "pathParam", name: "orgId" },
        },
        {
          id: "f-name",
          name: "name",
          type: "string",
          nullable: false,
          source: { type: "pathParam", name: "name" },
        },
      ];

      const { fields: reconciled, renames } = reconcileFieldParameters(fields, [
        "orgId",
        "projectId",
      ]);

      expect(renames).toEqual({ name: "projectId" });
      expect(reconciled.length).toBe(2);
      expect(reconciled[0].name).toBe("orgId");
      expect(reconciled[1].name).toBe("projectId");
    });

    it("should do nothing if all declared parameters are already mapped", () => {
      const fields: SchemaField[] = [
        {
          id: "f-id",
          name: "id",
          type: "string",
          nullable: false,
          source: { type: "pathParam", name: "id" },
        },
      ];

      const { fields: reconciled, renames } = reconcileFieldParameters(fields, [
        "id",
      ]);
      expect(renames).toEqual({});
      expect(reconciled).toBe(fields);
    });
  });

  describe("reconcileSchemaParameters", () => {
    it("should reconcile orphaned schema properties against unmapped declared parameters", () => {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
            "x-fack-source": { type: "pathParam", name: "name" },
          },
        },
        required: ["name"],
      };

      const { schema: reconciled, renames } = reconcileSchemaParameters(
        schema,
        ["projectId"],
      );

      expect(renames).toEqual({ name: "projectId" });
      const props = (reconciled as { properties: Record<string, unknown> })
        .properties;
      expect(props).toHaveProperty("projectId");
      expect(props).not.toHaveProperty("name");
    });
  });

  describe("syncRoutePathFields", () => {
    it("should automatically add fields for newly introduced URL parameters", () => {
      const existingFields: SchemaField[] = [
        {
          id: "f-project",
          name: "projectId",
          type: "string",
          nullable: false,
          source: { type: "pathParam", name: "projectId" },
        },
      ];

      // Route path now introduces a new parameter ":teamId"
      const {
        fields: updated,
        renames,
        addedParams,
      } = syncRoutePathFields(existingFields, ["projectId", "teamId"]);

      expect(renames).toEqual({});
      expect(addedParams).toEqual(["teamId"]);
      expect(updated.length).toBe(2);
      expect(updated[1].name).toBe("teamId");
      expect(updated[1].source).toEqual({
        type: "pathParam",
        name: "teamId",
      });
    });

    it("should reconcile renames and auto-add new parameters simultaneously", () => {
      const existingFields: SchemaField[] = [
        {
          id: "f-old",
          name: "name",
          type: "string",
          nullable: false,
          source: { type: "pathParam", name: "name" },
        },
      ];

      // URL was changed to rename ":name" -> ":projectId" AND add ":version"
      const {
        fields: updated,
        renames,
        addedParams,
      } = syncRoutePathFields(existingFields, ["projectId", "version"]);

      expect(renames).toEqual({ name: "projectId" });
      expect(addedParams).toEqual(["version"]);
      expect(updated.length).toBe(2);
      expect(updated[0].name).toBe("projectId");
      expect(updated[1].name).toBe("version");
      expect(updated[1].source).toEqual({
        type: "pathParam",
        name: "version",
      });
    });
  });

  describe("syncRoutePathSchema", () => {
    it("should automatically create properties for newly introduced parameters", () => {
      const schema = {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            "x-fack-source": { type: "pathParam", name: "projectId" },
          },
        },
        required: ["projectId"],
      };

      const {
        schema: synced,
        renames,
        addedParams,
      } = syncRoutePathSchema(schema, ["projectId", "roleId"]);

      expect(renames).toEqual({});
      expect(addedParams).toEqual(["roleId"]);

      const props = (synced as { properties: Record<string, unknown> })
        .properties;
      expect(props).toHaveProperty("projectId");
      expect(props).toHaveProperty("roleId");

      const roleProp = props["roleId"] as {
        type: string;
        "x-fack-source"?: unknown;
      };
      expect(roleProp.type).toBe("string");
      expect(roleProp["x-fack-source"]).toEqual({
        type: "pathParam",
        name: "roleId",
      });

      const req = (synced as { required: string[] }).required;
      expect(req).toContain("projectId");
      expect(req).toContain("roleId");
    });
  });

  describe("Canonical Field Ordering", () => {
    it("should insert fields in between id and createdAt/updatedAt", () => {
      const initial: SchemaField[] = [
        { id: "1", name: "id", type: "string", nullable: false },
        { id: "2", name: "createdAt", type: "string", nullable: false },
        { id: "3", name: "updatedAt", type: "string", nullable: false },
      ];

      const newField: SchemaField = {
        id: "4",
        name: "projectId",
        type: "string",
        nullable: false,
      };

      const result = insertFieldInCanonicalOrder(initial, newField);
      expect(result.map((f) => f.name)).toEqual([
        "id",
        "projectId",
        "createdAt",
        "updatedAt",
      ]);
    });

    it("should place id at the top when inserting id", () => {
      const initial: SchemaField[] = [
        { id: "1", name: "name", type: "string", nullable: false },
        { id: "2", name: "createdAt", type: "string", nullable: false },
      ];

      const idField: SchemaField = {
        id: "3",
        name: "id",
        type: "string",
        nullable: false,
      };

      const result = insertFieldInCanonicalOrder(initial, idField);
      expect(result[0].name).toBe("id");
    });

    it("should sort fields canonically: id -> payload fields -> createdAt -> updatedAt", () => {
      const mixed: SchemaField[] = [
        { id: "1", name: "updatedAt", type: "string", nullable: false },
        { id: "2", name: "email", type: "string", nullable: false },
        { id: "3", name: "id", type: "string", nullable: false },
        { id: "4", name: "createdAt", type: "string", nullable: false },
        { id: "5", name: "name", type: "string", nullable: false },
      ];

      const sorted = sortFieldsCanonically(mixed);
      expect(sorted.map((f) => f.name)).toEqual([
        "id",
        "email",
        "name",
        "createdAt",
        "updatedAt",
      ]);
    });

    it("should ensure syncRoutePathFields inserts new parameters in between id and timestamps", () => {
      const existingFields: SchemaField[] = [
        {
          id: "f-1",
          name: "id",
          type: "string",
          nullable: false,
          source: { type: "pathParam", name: "id" },
        },
        {
          id: "f-2",
          name: "createdAt",
          type: "string",
          nullable: false,
        },
        {
          id: "f-3",
          name: "updatedAt",
          type: "string",
          nullable: false,
        },
      ];

      const { fields } = syncRoutePathFields(existingFields, [
        "id",
        "tenantId",
      ]);
      expect(fields.map((f) => f.name)).toEqual([
        "id",
        "tenantId",
        "createdAt",
        "updatedAt",
      ]);
    });
  });
});
