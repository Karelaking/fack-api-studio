import { faker } from "@faker-js/faker";

/**
 * Request context available for template interpolation.
 */
export interface TemplateRequestContext {
  request: {
    body?: unknown;
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
  };
}

const FORBIDDEN_PROPERTIES = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Safely resolves a nested property path from an object or source.
 * Prevents prototype pollution and unsafe reflection.
 */
function getPathValue(source: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = source;

  for (const part of parts) {
    if (FORBIDDEN_PROPERTIES.has(part)) {
      return undefined;
    }

    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }

    const record = current as Record<string, unknown>;
    if (part in record) {
      current = record[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * A tiny Handlebars-lite engine for Fack API response templating.
 * Supports:
 * - {{faker.person.firstName}}
 * - {{request.body.userId}}
 * - {{request.query.page}}
 * - {{request.params.id}}
 */
export function renderTemplate(
  template: string,
  context: TemplateRequestContext,
): unknown {
  // First, do a pass to evaluate all string interpolations.
  const rendered = template.replace(/{{([\w.]+)}}/g, (match, path) => {
    if (path.startsWith("faker.")) {
      try {
        const fakerPath = path.replace("faker.", "");
        const fakerFn = getPathValue(faker, fakerPath);
        if (typeof fakerFn === "function") {
          return String((fakerFn as () => unknown)());
        }
      } catch {
        return match;
      }
    }

    if (path.startsWith("request.")) {
      const resolvedValue = getPathValue(context, path);
      if (resolvedValue !== undefined) {
        if (typeof resolvedValue === "object" && resolvedValue !== null) {
          return JSON.stringify(resolvedValue);
        }
        return String(resolvedValue as string | number | boolean);
      }
      return match;
    }

    return match;
  });

  // Try to parse the rendered string as JSON if it looks like an object/array
  try {
    const trimmed = rendered.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return JSON.parse(rendered) as unknown;
    }
  } catch {
    // If it fails to parse, return the string.
  }

  return rendered;
}
