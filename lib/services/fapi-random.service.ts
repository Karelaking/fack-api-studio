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
export { getDefaultProviderForParam } from "./fapi-preview.service";

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
