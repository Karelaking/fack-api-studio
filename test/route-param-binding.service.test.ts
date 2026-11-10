import { describe, it, expect } from "vite-plus/test";
import {
  applyRouteParameterBindings,
  RouteParamConversionError,
} from "../lib/services/route-param-binding.service";

describe("Route Parameter Binding Service", () => {
  it("should bind root field to string path parameter", () => {
    const schema = {
      type: "object",
      properties: {
        id: {
          type: "string",
          "x-fack-source": { type: "pathParam", name: "id" },
        },
        title: { type: "string" },
      },
    };

    const original = { id: "old-uuid", title: "Test Title" };
    const result = applyRouteParameterBindings(original, schema, { id: "295" });

    expect(result).toEqual({ id: "295", title: "Test Title" });
    // Guarantee immutability: original payload is not modified
    expect(original.id).toBe("old-uuid");
  });

  it("should strictly convert integer and number parameters", () => {
    const schema = {
      type: "object",
      properties: {
        id: {
          type: "integer",
          "x-fack-source": { type: "pathParam", name: "id" },
        },
        price: {
          type: "number",
          "x-fack-source": { type: "pathParam", name: "price" },
        },
      },
    };

    const payload = { id: 0, price: 0 };
    const result = applyRouteParameterBindings(payload, schema, {
      id: "42",
      price: "19.99",
    });

    expect(result).toEqual({ id: 42, price: 19.99 });
  });

  it("should throw RouteParamConversionError when numeric conversion fails", () => {
    const schema = {
      type: "object",
      properties: {
        id: {
          type: "integer",
          "x-fack-source": { type: "pathParam", name: "id" },
        },
      },
    };

    expect(() =>
      applyRouteParameterBindings({ id: 0 }, schema, { id: "not-a-number" }),
    ).toThrow(RouteParamConversionError);

    try {
      applyRouteParameterBindings({ id: 0 }, schema, { id: "not-a-number" });
    } catch (err) {
      expect(err).toBeInstanceOf(RouteParamConversionError);
      const conversionErr = err as RouteParamConversionError;
      expect(conversionErr.statusCode).toBe(400);
      expect(conversionErr.paramName).toBe("id");
      expect(conversionErr.fieldName).toBe("id");
      expect(conversionErr.expectedType).toBe("integer");
      expect(conversionErr.receivedValue).toBe("not-a-number");
    }
  });

  it("should strictly convert boolean parameters", () => {
    const schema = {
      type: "object",
      properties: {
        active: {
          type: "boolean",
          "x-fack-source": { type: "pathParam", name: "active" },
        },
      },
    };

    expect(
      applyRouteParameterBindings({ active: false }, schema, {
        active: "true",
      }),
    ).toEqual({ active: true });

    expect(
      applyRouteParameterBindings({ active: true }, schema, {
        active: "false",
      }),
    ).toEqual({ active: false });

    expect(
      applyRouteParameterBindings({ active: false }, schema, { active: "1" }),
    ).toEqual({ active: true });

    expect(
      applyRouteParameterBindings({ active: true }, schema, { active: "0" }),
    ).toEqual({ active: false });

    expect(() =>
      applyRouteParameterBindings({ active: false }, schema, {
        active: "invalid",
      }),
    ).toThrow(RouteParamConversionError);
  });

  it("should support nested object fields and array collection items", () => {
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
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ownerId: {
                type: "string",
                "x-fack-source": { type: "pathParam", name: "userId" },
              },
            },
          },
        },
      },
    };

    const payload = {
      user: { id: "placeholder" },
      items: [{ ownerId: "old-1" }, { ownerId: "old-2" }],
    };

    const result = applyRouteParameterBindings(payload, schema, {
      userId: "user_abc",
    });

    expect(result).toEqual({
      user: { id: "user_abc" },
      items: [{ ownerId: "user_abc" }, { ownerId: "user_abc" }],
    });
  });

  it("should support root array responses", () => {
    const schema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          tenantId: {
            type: "string",
            "x-fack-source": { type: "pathParam", name: "tenantId" },
          },
          name: { type: "string" },
        },
      },
    };

    const payload = [
      { tenantId: "default", name: "Item A" },
      { tenantId: "default", name: "Item B" },
    ];

    const result = applyRouteParameterBindings(payload, schema, {
      tenantId: "tenant_99",
    });

    expect(result).toEqual([
      { tenantId: "tenant_99", name: "Item A" },
      { tenantId: "tenant_99", name: "Item B" },
    ]);
  });

  it("should ensure consecutive requests with different parameter values do not affect cached payloads", () => {
    const schema = {
      type: "object",
      properties: {
        id: {
          type: "string",
          "x-fack-source": { type: "pathParam", name: "id" },
        },
        name: { type: "string" },
      },
    };

    // Simulated cached single object
    const cachedObject = { id: "cached-id", name: "Alice" };

    const request1 = applyRouteParameterBindings(cachedObject, schema, {
      id: "100",
    });
    const request2 = applyRouteParameterBindings(cachedObject, schema, {
      id: "200",
    });

    expect(request1).toEqual({ id: "100", name: "Alice" });
    expect(request2).toEqual({ id: "200", name: "Alice" });
    expect(cachedObject.id).toBe("cached-id");
  });

  it("should bind static hard-coded values into object response fields", () => {
    const schema = {
      type: "object",
      properties: {
        id: {
          type: "integer",
          "x-fack-source": { type: "pathParam", name: "id" },
        },
        status: {
          type: "string",
          "x-fack-source": { type: "static", value: "active" },
        },
        version: {
          type: "integer",
          "x-fack-source": { type: "static", value: "2" },
        },
        enabled: {
          type: "boolean",
          "x-fack-source": { type: "static", value: "true" },
        },
      },
    };

    const initial = { id: 0, status: "pending", version: 1, enabled: false };
    const bound = applyRouteParameterBindings(initial, schema, { id: "99" });

    expect(bound).toEqual({
      id: 99,
      status: "active",
      version: 2,
      enabled: true,
    });
  });

  it("should bind static hard-coded values into array items", () => {
    const schema = {
      type: "object",
      properties: {
        tags: {
          type: "array",
          items: {
            type: "string",
            "x-fack-source": { type: "static", value: "default-tag" },
          },
        },
      },
    };

    const initial = { tags: ["old1", "old2"] };
    const bound = applyRouteParameterBindings(initial, schema, {});

    expect(bound).toEqual({ tags: ["default-tag", "default-tag"] });
  });
});
