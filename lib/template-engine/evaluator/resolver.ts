/**
 * Fack API - Safe Path Property Resolver
 *
 * Resolves nested dotted paths against source objects while strictly blocking
 * prototype pollution attacks (__proto__, prototype, constructor).
 */

const FORBIDDEN_PROPERTIES = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Safely resolves a dotted or array path from an object or source.
 * Prevents prototype pollution and unsafe reflection.
 */
export function getPathValue(source: unknown, path: string): unknown {
  if (source === null || source === undefined) {
    return undefined;
  }

  if (!path || path.trim() === "") {
    return source;
  }

  // Support both dot notation and bracket indexing (e.g. items.0.name or items[0].name)
  const normalized = path.replace(/\[(\w+)\]/g, ".$1");
  const parts = normalized.split(".");
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
    if (Object.prototype.hasOwnProperty.call(record, part) || part in record) {
      current = record[part];
    } else {
      return undefined;
    }
  }

  return current;
}
