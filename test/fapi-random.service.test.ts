import { describe, it, expect } from "vite-plus/test";
import {
  generateRandomFapiValue,
  getDefaultProviderForParam,
  generateRandomFapiParams,
} from "../lib/services/fapi-random.service";

describe("FAPI Random Runtime Generator Service", () => {
  it("should generate random string values for valid provider paths", () => {
    const firstName = generateRandomFapiValue("person.firstName");
    expect(typeof firstName).toBe("string");
    expect(firstName.length).toBeGreaterThan(0);

    const uuid = generateRandomFapiValue("string.uuid");
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    const intVal = generateRandomFapiValue("number.int");
    expect(Number(intVal)).not.toBeNaN();
  });

  it("should fall back gracefully to example when unknown provider is requested", () => {
    const fallback = generateRandomFapiValue("unknown.nonExistentProvider");
    expect(typeof fallback).toBe("string");
    expect(fallback).toBe("sample_value");
  });

  it("should prevent prototype pollution in provider path resolution", () => {
    const safeResult = generateRandomFapiValue("__proto__.polluted");
    expect(safeResult).toBe("sample_value");
  });

  it("should intelligently suggest appropriate providers for common parameter names", () => {
    expect(getDefaultProviderForParam("id")).toBe("number.int");
    expect(getDefaultProviderForParam("userId")).toBe("number.int");
    expect(getDefaultProviderForParam("user_id")).toBe("number.int");
    expect(getDefaultProviderForParam("userUuid")).toBe("string.uuid");
    expect(getDefaultProviderForParam("email")).toBe("internet.email");
    expect(getDefaultProviderForParam("username")).toBe("person.firstName");
    expect(getDefaultProviderForParam("authorName")).toBe("person.firstName");
    expect(getDefaultProviderForParam("slug")).toBe("lorem.slug");
    expect(getDefaultProviderForParam("category")).toBe("commerce.department");
    expect(getDefaultProviderForParam("city")).toBe("location.city");
    expect(getDefaultProviderForParam("customParam")).toBe(
      "string.alphanumeric",
    );
  });

  it("should batch generate random parameter values", () => {
    const params = {
      id: "number.int",
      email: "internet.email",
      name: "person.firstName",
    };

    const generated = generateRandomFapiParams(params);
    expect(Object.keys(generated)).toEqual(["id", "email", "name"]);
    expect(Number(generated.id)).not.toBeNaN();
    expect(generated.email).toContain("@");
    expect(generated.name.length).toBeGreaterThan(0);
  });
});
