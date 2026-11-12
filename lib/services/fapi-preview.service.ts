/**
 * Client-safe FAPI parameter defaults, static fallback examples, and lazy random generation.
 * Keeps @faker-js/faker out of initial client bundles until a user generates live random values.
 */

import { getProviderByValue } from "@/lib/faker-registry";

type FapiRandomModule = typeof import("./fapi-random.service");

let fapiRandomModulePromise: Promise<FapiRandomModule> | undefined;

/**
 * Returns the static registry example for a FAPI provider path without loading @faker-js/faker.
 */
export function getFapiFallbackValue(providerPath: string): string {
  const trimmed = providerPath.trim();
  if (!trimmed) {
    return "";
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
 * Lazily loads the @faker-js/faker runtime generator module on demand and produces a random value.
 */
export async function generateRandomFapiValueAsync(
  providerPath: string,
): Promise<string> {
  if (!fapiRandomModulePromise) {
    fapiRandomModulePromise = import("./fapi-random.service");
  }
  const mod = await fapiRandomModulePromise;
  return mod.generateRandomFapiValue(providerPath);
}
