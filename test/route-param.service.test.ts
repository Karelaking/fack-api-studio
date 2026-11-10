import { describe, it, expect } from "vite-plus/test";
import {
  getEffectiveRoutePath,
  extractRoutePathParameters,
  validateRoutePath,
  validateRouteSchemaBindings,
} from "../lib/services/route-param.service";

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
});
