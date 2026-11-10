/**
 * Fack API — Route Parameter Binding Service
 *
 * Resolves request-time path parameter bindings onto generated or stateful mock payloads.
 * Features:
 * - Pure, non-mutating transformations (deep clones source payload before modification)
 * - Safe property lookup without arbitrary expression evaluation
 * - Strict scalar type conversions with clear, actionable 400 Bad Request client errors
 * - Support for root objects, nested objects, and collections (array responses)
 */

// ─── Types & Error ───────────────────────────────────────────────────────────

export class RouteParamConversionError extends Error {
  public readonly statusCode: number = 400;
  public readonly paramName: string;
  public readonly fieldName: string;
  public readonly expectedType: string;
  public readonly receivedValue: string;

  constructor(
    paramName: string,
    fieldName: string,
    expectedType: string,
    receivedValue: string,
  ) {
    super(
      `Invalid value "${receivedValue}" for URL parameter ":${paramName}" bound to field "${fieldName}": expected ${expectedType}.`,
    );
    this.name = "RouteParamConversionError";
    this.paramName = paramName;
    this.fieldName = fieldName;
    this.expectedType = expectedType;
    this.receivedValue = receivedValue;
    Object.setPrototypeOf(this, RouteParamConversionError.prototype);
  }
}

interface GenericSchemaProperty {
  type?: string | string[];
  properties?: Record<string, GenericSchemaProperty>;
  items?: GenericSchemaProperty;
  "x-fack-source"?: {
    type?: string;
    name?: string;
  };
  [key: string]: unknown;
}

const FORBIDDEN_PROPERTIES = new Set(["__proto__", "constructor", "prototype"]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Creates a deep copy of an arbitrary JSON-compatible payload to guarantee that
 * cached or shared in-memory records are never mutated by request-specific values.
 */
function clonePayload<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Fall back to JSON serialization if structuredClone cannot clone
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Extracts a normalized single string value from a path parameter entry.
 */
function extractScalarParamValue(
  raw: string | string[] | undefined,
): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (Array.isArray(raw)) {
    return raw.length > 0 ? String(raw[0]) : undefined;
  }
  return String(raw);
}

/**
 * Performs strict scalar conversion of a path parameter string into the expected target schema type.
 * Throws RouteParamConversionError if the value cannot be strictly converted.
 */
function convertScalarValue(
  rawString: string,
  targetType: string | string[] | undefined,
  paramName: string,
  fieldName: string,
): unknown {
  const primaryType = Array.isArray(targetType)
    ? (targetType.find((t) => t !== "null") ?? "string")
    : (targetType ?? "string");

  switch (primaryType) {
    case "number": {
      const trimmed = rawString.trim();
      if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(trimmed)) {
        throw new RouteParamConversionError(
          paramName,
          fieldName,
          "number",
          rawString,
        );
      }
      const numericValue = Number(trimmed);
      if (!Number.isFinite(numericValue)) {
        throw new RouteParamConversionError(
          paramName,
          fieldName,
          "number",
          rawString,
        );
      }
      return numericValue;
    }

    case "integer": {
      const trimmed = rawString.trim();
      if (!/^-?\d+$/.test(trimmed)) {
        throw new RouteParamConversionError(
          paramName,
          fieldName,
          "integer",
          rawString,
        );
      }
      const integerVal = Number(trimmed);
      if (!Number.isSafeInteger(integerVal)) {
        throw new RouteParamConversionError(
          paramName,
          fieldName,
          "integer",
          rawString,
        );
      }
      return integerVal;
    }

    case "boolean": {
      const lower = rawString.trim().toLowerCase();
      if (lower === "true" || lower === "1") {
        return true;
      }
      if (lower === "false" || lower === "0") {
        return false;
      }
      throw new RouteParamConversionError(
        paramName,
        fieldName,
        "boolean",
        rawString,
      );
    }

    case "string":
    default:
      return rawString;
  }
}

// ─── Recursive Application ───────────────────────────────────────────────────

/**
 * Recursively applies schema URL parameter bindings to an object target.
 */
function applyBindingsToObject(
  target: Record<string, unknown>,
  schema: GenericSchemaProperty,
  params: Record<string, string | string[]>,
): void {
  if (!schema.properties || typeof schema.properties !== "object") {
    return;
  }

  for (const [key, propDef] of Object.entries(schema.properties)) {
    if (FORBIDDEN_PROPERTIES.has(key)) {
      continue;
    }

    const source = propDef["x-fack-source"];
    if (source && typeof source === "object" && source.type === "pathParam") {
      const paramName = source.name ? String(source.name).trim() : "";
      if (
        paramName &&
        Object.prototype.hasOwnProperty.call(params, paramName)
      ) {
        const rawParamValue = extractScalarParamValue(params[paramName]);
        if (rawParamValue !== undefined) {
          const converted = convertScalarValue(
            rawParamValue,
            propDef.type,
            paramName,
            key,
          );
          target[key] = converted;
        }
      }
    }

    // Nested object recursion
    const isObjectType =
      propDef.type === "object" ||
      (Array.isArray(propDef.type) && propDef.type.includes("object"));

    if (
      isObjectType &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      applyBindingsToObject(
        target[key] as Record<string, unknown>,
        propDef,
        params,
      );
    }

    // Nested array recursion
    const isArrayType =
      propDef.type === "array" ||
      (Array.isArray(propDef.type) && propDef.type.includes("array"));

    if (isArrayType && Array.isArray(target[key]) && propDef.items) {
      applyBindingsToArray(
        target[key] as unknown[],
        propDef.items,
        params,
        key,
      );
    }
  }
}

/**
 * Recursively applies schema URL parameter bindings to array items.
 */
function applyBindingsToArray(
  targetArray: unknown[],
  itemsSchema: GenericSchemaProperty,
  params: Record<string, string | string[]>,
  parentFieldName: string,
): void {
  const itemSource = itemsSchema["x-fack-source"];

  // Case 1: The array items themselves are bound scalar values
  if (
    itemSource &&
    typeof itemSource === "object" &&
    itemSource.type === "pathParam"
  ) {
    const paramName = itemSource.name ? String(itemSource.name).trim() : "";
    if (paramName && Object.prototype.hasOwnProperty.call(params, paramName)) {
      const rawParamValue = extractScalarParamValue(params[paramName]);
      if (rawParamValue !== undefined) {
        const converted = convertScalarValue(
          rawParamValue,
          itemsSchema.type,
          paramName,
          `${parentFieldName}[]`,
        );
        for (let i = 0; i < targetArray.length; i++) {
          targetArray[i] = converted;
        }
      }
    }
    return;
  }

  // Case 2: Array items are objects with properties
  for (let i = 0; i < targetArray.length; i++) {
    const item = targetArray[i];
    if (item && typeof item === "object" && !Array.isArray(item)) {
      applyBindingsToObject(
        item as Record<string, unknown>,
        itemsSchema,
        params,
      );
    }
  }
}

// ─── Main Public API ─────────────────────────────────────────────────────────

/**
 * Applies route path parameter bindings to a mock response payload.
 *
 * 1. Deep clones the payload so shared cached data is never mutated.
 * 2. Traverses the JSON Schema to locate fields with `x-fack-source: { type: "pathParam", name: "..." }`.
 * 3. Injects the request path parameter values into the cloned payload with strict scalar type conversion.
 *
 * @param rawPayload - Generated or stateful mock data
 * @param schema - Route response schema
 * @param params - Matched path parameters from route matcher
 * @returns Cloned payload with bound values injected
 * @throws RouteParamConversionError if scalar conversion fails
 */
export function applyRouteParameterBindings(
  rawPayload: unknown,
  schema: unknown,
  params: Record<string, string | string[]>,
): unknown {
  if (!rawPayload || !schema || typeof schema !== "object" || !params) {
    return rawPayload;
  }

  // If there are no params in the request, return a clone without alterations
  const paramKeys = Object.keys(params);
  if (paramKeys.length === 0) {
    return clonePayload(rawPayload);
  }

  const cloned = clonePayload(rawPayload);
  const typedSchema = schema as GenericSchemaProperty;

  // Handle array responses (e.g. GET /users with list schema or pagination)
  if (Array.isArray(cloned)) {
    let itemsSchema: GenericSchemaProperty = typedSchema;
    if (typedSchema.type === "array" && typedSchema.items) {
      itemsSchema = typedSchema.items;
    }
    applyBindingsToArray(cloned, itemsSchema, params, "root");
    return cloned;
  }

  // Handle single object responses
  if (typeof cloned === "object" && cloned !== null) {
    applyBindingsToObject(
      cloned as Record<string, unknown>,
      typedSchema,
      params,
    );
    return cloned;
  }

  return cloned;
}
