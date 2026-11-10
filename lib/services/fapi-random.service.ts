/**
 * Fack API — FAPI Random Runtime Generator Service
 *
 * Generates dynamic mock data from Faker.js (FAPI) provider paths at runtime.
 * Supports:
 * - Direct execution of dot-notated provider paths (e.g. "person.firstName", "string.uuid")
 * - Smart fallback to provider examples if execution encounters an unknown provider
 * - Intelligent default provider suggestions based on parameter names
 * - Safe property navigation preventing prototype pollution
 */

import { faker } from "@faker-js/faker";
import { getProviderByValue } from "@/lib/faker-registry";

const FORBIDDEN_PROPERTIES = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Generates a single random string value for a given FAPI provider at runtime.
 */
export function generateRandomFapiValue(providerPath: string): string {
  const trimmed = providerPath.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parts = trimmed.split(".");
    let current: unknown = faker;

    for (const part of parts) {
      if (FORBIDDEN_PROPERTIES.has(part)) {
        throw new Error(`Forbidden property access: ${part}`);
      }

      if (
        current === null ||
        current === undefined ||
        typeof current !== "object"
      ) {
        current = undefined;
        break;
      }

      const record = current as Record<string, unknown>;
      if (part in record) {
        current = record[part];
      } else {
        current = undefined;
        break;
      }
    }

    if (typeof current === "function") {
      let result: unknown;
      if (trimmed === "number.int") {
        result = faker.number.int({ min: 1, max: 9999 });
      } else {
        result = (current as () => unknown)();
      }

      if (typeof result === "object" && result !== null) {
        return JSON.stringify(result);
      }
      return String(result);
    }
  } catch {
    // Fall back to registry example
  }

  const provider = getProviderByValue(trimmed);
  return provider?.example ?? "sample_value";
}

/**
 * Suggests an intelligent default FAPI provider method based on the parameter name.
 */
export function getDefaultProviderForParam(paramName: string): string {
  const lower = paramName.toLowerCase().replace(/[-_]/g, "");

  if (lower === "id") {
    return "number.int";
  }
  if (lower.includes("uuid") || lower.includes("guid")) {
    return "string.uuid";
  }
  if (lower.endsWith("id")) {
    return "number.int";
  }
  if (lower.includes("email")) {
    return "internet.email";
  }
  if (
    lower.includes("user") ||
    lower.includes("author") ||
    lower.includes("name")
  ) {
    return "person.firstName";
  }
  if (lower.includes("slug")) {
    return "lorem.slug";
  }
  if (
    lower.includes("category") ||
    lower.includes("dept") ||
    lower.includes("department")
  ) {
    return "commerce.department";
  }
  if (
    lower.includes("date") ||
    lower.includes("time") ||
    lower.includes("year")
  ) {
    return "date.recent";
  }
  if (lower.includes("phone") || lower.includes("mobile")) {
    return "phone.number";
  }
  if (lower.includes("city")) {
    return "location.city";
  }
  if (lower.includes("country")) {
    return "location.country";
  }

  return "string.alphanumeric";
}

/**
 * Generates random values for a dictionary of parameter names and provider paths.
 */
export function generateRandomFapiParams(
  paramProviders: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [paramName, providerPath] of Object.entries(paramProviders)) {
    result[paramName] = generateRandomFapiValue(providerPath);
  }
  return result;
}
