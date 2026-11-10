import { describe, it, expect } from "vite-plus/test";
import {
  synthesizeSchema,
  parseSchemaToFields,
  type SchemaField,
} from "../lib/schema-synthesizer";
import { generateTypeScript } from "../lib/ts-generator";
import { generateOpenApi } from "../lib/services/openapi.service";
import { findMatchingRoute, type RouteDefinition } from "../lib/route-matcher";
import { applyRouteParameterBindings } from "../lib/services/route-param-binding.service";
import { validateRouteSchemaBindings } from "../lib/services/route-param.service";
import type { ProjectWithHierarchy } from "../lib/services/project.service";

describe("Route Parameter Response Binding - Integration", () => {
  it("should round-trip path parameter bindings between SchemaField and JSON Schema", () => {
    const fields: SchemaField[] = [
      {
        id: "f-1",
        name: "id",
        type: "string",
        nullable: false,
        source: { type: "pathParam", name: "id" },
      },
      {
        id: "f-2",
        name: "username",
        type: "string",
        nullable: false,
        fakerProvider: "internet.username",
      },
    ];

    const jsonSchema = synthesizeSchema(fields);

    // id field has x-fack-source and NO x-faker
    expect(jsonSchema.properties.id).toEqual({
      type: "string",
      "x-fack-source": { type: "pathParam", name: "id" },
    });
    expect(jsonSchema.properties.id).not.toHaveProperty("x-faker");
    expect(jsonSchema.properties.id).not.toHaveProperty("faker");

    // username has x-faker
    expect(jsonSchema.properties.username).toHaveProperty(
      "x-faker",
      "internet.username",
    );

    // Parse back to SchemaField[]
    const parsedFields = parseSchemaToFields(jsonSchema);
    expect(parsedFields).toHaveLength(2);

    const idField = parsedFields.find((f) => f.name === "id");
    expect(idField?.source).toEqual({ type: "pathParam", name: "id" });
    expect(idField?.fakerProvider).toBeUndefined();

    const usernameField = parsedFields.find((f) => f.name === "username");
    expect(usernameField?.source).toBeUndefined();
    expect(usernameField?.fakerProvider).toBe("internet.username");
  });

  it("should strip x-fack-source when generating TypeScript interfaces", async () => {
    const schema = {
      type: "object",
      properties: {
        id: {
          type: "string",
          "x-fack-source": { type: "pathParam", name: "id" },
        },
        email: {
          type: "string",
          "x-faker": "internet.email",
        },
      },
      required: ["id", "email"],
    };

    const ts = await generateTypeScript(schema, { typeName: "UserResponse" });

    expect(ts).toContain("export interface UserResponse {");
    expect(ts).toContain("id: string;");
    expect(ts).toContain("email: string;");
    expect(ts).not.toContain("x-fack-source");
    expect(ts).not.toContain("x-faker");
  });

  it("should emit OpenAPI path parameters and sanitize response schemas", () => {
    const mockProject: ProjectWithHierarchy = {
      id: "proj-1",
      name: "Test Project",
      slug: "test-proj",
      description: "Test description",
      userId: "user-1",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      isCachingEnabled: true,
      isLoggingEnabled: true,
      activeScenarioId: null,
      endpoints: [
        {
          id: "ep-1",
          projectId: "proj-1",
          name: "Users",
          description: "User endpoints",
          basePath: "/api/v2",
          color: "blue",
          icon: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
          routes: [
            {
              id: "r-1",
              endpointId: "ep-1",
              method: "GET",
              path: "/users/:id",
              statusCode: 200,
              isEnabled: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              errorRate: 0,
              latencyMin: 0,
              latencyMax: 0,
              conditionalRules: null,
              customHeaders: null,
              responseSchema: JSON.stringify({
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    "x-fack-source": { type: "pathParam", name: "id" },
                  },
                  name: {
                    type: "string",
                    "x-faker": "person.fullName",
                  },
                },
                required: ["id", "name"],
              }),
              responseTemplate: null,
              isAuthRequired: false,
            },
          ],
        },
      ],
    };

    const openApi = generateOpenApi(mockProject);

    expect(openApi.paths).toBeDefined();
    const pathItem = openApi.paths?.["/api/v2/users/{id}"];
    expect(pathItem).toBeDefined();
    const getOp = pathItem?.get;
    expect(getOp).toBeDefined();

    // Check path parameter
    const paramsList = getOp?.parameters as Array<{
      name: string;
      in: string;
      required: boolean;
      schema: { type: string };
    }>;
    expect(paramsList).toHaveLength(1);
    expect(paramsList[0]).toEqual({
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    });

    // Check response schema sanitization
    const schema = getOp?.responses?.["200"]?.content?.["application/json"]
      ?.schema as Record<string, unknown>;
    const props = schema?.properties as Record<string, Record<string, unknown>>;
    expect(props?.id).toBeDefined();
    expect(props?.id?.["x-fack-source"]).toBeUndefined();
    expect(props?.name?.["x-faker"]).toBeUndefined();
  });

  it("should match route /api/v2/users/:id and bind id field to URL value 295", () => {
    const routeDefinition: RouteDefinition = {
      id: "route-user-get",
      endpointId: "ep-1",
      method: "GET",
      path: "/api/v2/users/:id",
      statusCode: 200,
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      errorRate: 0,
      latencyMin: 0,
      latencyMax: 0,
      conditionalRules: null,
      customHeaders: null,
      responseSchema: JSON.stringify({
        type: "object",
        properties: {
          id: {
            type: "string",
            "x-fack-source": { type: "pathParam", name: "id" },
          },
          name: {
            type: "string",
            "x-faker": "person.fullName",
          },
        },
      }),
      responseTemplate: null,
      isAuthRequired: false,
    };

    const match = findMatchingRoute(
      [routeDefinition],
      "GET",
      "/api/v2/users/295",
    );
    expect(match).not.toBeNull();
    expect(match?.params).toEqual({ id: "295" });

    // Simulate payload generation + binding
    const rawPayload = {
      id: "initial-faker-uuid",
      name: "John Doe",
    };

    const boundPayload = applyRouteParameterBindings(
      rawPayload,
      JSON.parse(routeDefinition.responseSchema ?? "{}"),
      match!.params,
    );

    expect(boundPayload).toEqual({
      id: "295",
      name: "John Doe",
    });
  });

  it("should allow a route parameter to be bound to a differently named response field", () => {
    const schema = {
      type: "object",
      properties: {
        userId: {
          type: "string",
          "x-fack-source": { type: "pathParam", name: "id" },
        },
      },
    };

    const bound = applyRouteParameterBindings(
      { userId: "placeholder" },
      schema,
      { id: "cust_777" },
    );

    expect(bound).toEqual({ userId: "cust_777" });
  });

  it("should keep Faker provider when field is not bound to URL parameter", () => {
    const schema = {
      type: "object",
      properties: {
        id: {
          type: "string",
          "x-faker": "string.uuid",
        },
      },
    };

    const generated = { id: "faker-generated-uuid" };
    const bound = applyRouteParameterBindings(generated, schema, { id: "999" });

    // Since id in schema does NOT have x-fack-source: pathParam, it preserves generated value
    expect(bound).toEqual({ id: "faker-generated-uuid" });
  });

  it("should detect invalid schema bindings on route save validation", () => {
    const schema = {
      type: "object",
      properties: {
        id: {
          type: "string",
          "x-fack-source": { type: "pathParam", name: "userId" },
        },
      },
    };

    // Route path only declares :slug, but schema binds to :userId
    const validation = validateRouteSchemaBindings(schema, ["slug"]);
    expect(validation.isValid).toBe(false);
    expect(validation.errors[0]).toContain(
      'Field "id" binds to URL parameter ":userId", which is not present in the route path.',
    );
  });
});
