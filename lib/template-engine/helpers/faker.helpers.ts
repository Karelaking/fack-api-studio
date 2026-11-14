/**
 * Fack API - Faker Integration & Allowlist
 *
 * Provides safe, allowlisted access to Faker generation methods with optional
 * deterministic seeding.
 */

import { faker } from "@faker-js/faker";
import { getPathValue } from "../evaluator/resolver";

const ALLOWED_FAKER_MODULES = new Set([
  "airline",
  "animal",
  "color",
  "commerce",
  "company",
  "database",
  "datatype",
  "date",
  "finance",
  "git",
  "hacker",
  "image",
  "internet",
  "location",
  "lorem",
  "music",
  "number",
  "person",
  "phone",
  "string",
  "system",
  "vehicle",
]);

export function setFakerSeed(seed: number): void {
  faker.seed(seed);
}

/**
 * Resolves a faker path like "person.firstName" or "string.uuid"
 * only if the module is in the explicit allowlist.
 */
export function evaluateFakerExpression(
  fakerPath: string,
  args: unknown[] = [],
): unknown {
  const parts = fakerPath.split(".");
  const moduleName = parts[0];

  if (!ALLOWED_FAKER_MODULES.has(moduleName)) {
    return undefined;
  }

  try {
    const fakerFn = getPathValue(faker, fakerPath);
    if (typeof fakerFn === "function") {
      const typedArgs = args.map((arg) =>
        typeof arg === "string" && !isNaN(Number(arg)) ? Number(arg) : arg,
      );
      return (fakerFn as (...a: unknown[]) => unknown)(...typedArgs);
    }
  } catch {
    return undefined;
  }

  return undefined;
}
