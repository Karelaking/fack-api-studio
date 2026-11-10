/**
 * Fack API's — Schema Synthesizer
 *
 * Converts the visual field tree (as managed by the Zustand schema store)
 * into a valid JSON Schema document with `x-faker` extension keywords.
 *
 * This is the critical bridge between the Control Plane (UI) and the
 * Data Plane (mock engine). The generated JSON Schema is:
 *
 * 1. Stored in the database as the route's `responseSchema`
 * 2. Consumed by `json-schema-faker` to generate dynamic payloads
 * 3. Fed to `json-schema-to-typescript` for TypeScript interface generation
 *
 * @see https://json-schema.org/understanding-json-schema/
 * @see https://github.com/json-schema-faker/json-schema-faker
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type FieldSourceType = "faker" | "pathParam" | "static";

export interface PathParamSource {
  type: "pathParam";
  name: string;
}

export interface StaticValueSource {
  type: "static";
  value: string;
}

export type FieldSource = PathParamSource | StaticValueSource;

export interface RouteParamConfig {
  mode: "static" | "fapi";
  staticValue?: string;
  provider?: string;
}

/**
 * Represents a single field in the visual schema builder.
 * This is the internal data structure used by the Zustand store.
 */
export interface SchemaField {
  /** Unique identifier for this field */
  id: string;
  /** Field name (property key in the JSON response) */
  name: string;
  /** JSON Schema data type */
  type: "string" | "number" | "integer" | "boolean" | "object" | "array";
  /** Whether this field can return null */
  nullable: boolean;
  /** Faker.js provider method path (e.g., "person.firstName") */
  fakerProvider?: string;
  /** Custom data source binding (e.g. URL path parameter or static value) */
  source?: FieldSource;
  /** Child fields (only for type "object") */
  children?: SchemaField[];
  /** Item schema (only for type "array") */
  arrayItemType?: "string" | "number" | "integer" | "boolean" | "object";
  /** Child fields for array items of type "object" */
  arrayItemChildren?: SchemaField[];
  /** Faker.js provider for array items of primitive types */
  arrayItemFakerProvider?: string;
  /** Custom data source for array items of primitive types */
  arrayItemSource?: FieldSource;
}

// ─── JSON Schema Types ───────────────────────────────────────────────────────

export interface JsonSchemaProperty {
  type: string | string[];
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  items?: JsonSchemaProperty;
  "x-faker"?: string;
  faker?: string;
  format?: string;
  "x-fack-source"?: FieldSource;
  const?: unknown;
}

export interface JsonSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
  "x-fack-params"?: Record<string, RouteParamConfig>;
}

// ─── Synthesizer ─────────────────────────────────────────────────────────────

/**
 * Synthesizes a JSON Schema from an array of SchemaField definitions.
 *
 * Handles:
 * - Primitive types (string, number, integer, boolean)
 * - Nested objects (recursive)
 * - Arrays with typed items
 * - Nullable fields (union types)
 * - Faker.js provider annotations via `x-faker`
 *
 * @param fields - The root-level field definitions from the schema store
 * @returns A valid JSON Schema document ready for storage and data generation
 *
 * @example
 * ```ts
 * const schema = synthesizeSchema([
 *   { id: "1", name: "id", type: "string", nullable: false, fakerProvider: "string.uuid" },
 *   { id: "2", name: "name", type: "string", nullable: false, fakerProvider: "person.fullName" },
 *   { id: "3", name: "email", type: "string", nullable: true, fakerProvider: "internet.email" },
 * ]);
 * // Result:
 * // {
 * //   type: "object",
 * //   properties: {
 * //     id: { type: "string", "x-faker": "string.uuid" },
 * //     name: { type: "string", "x-faker": "person.fullName" },
 * //     email: { type: ["string", "null"], "x-faker": "internet.email" }
 * //   },
 * //   required: ["id", "name"]
 * // }
 * ```
 */
export function synthesizeSchema(
  fields: SchemaField[],
  paramConfigs?: Record<string, RouteParamConfig>,
): JsonSchema {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const field of fields) {
    const trimmedName = field.name.trim();
    if (!trimmedName) continue;

    properties[trimmedName] = synthesizeField(field);

    // Non-nullable fields are required
    if (!field.nullable) {
      required.push(trimmedName);
    }
  }

  const result: JsonSchema = {
    type: "object",
    properties,
    required,
  };

  if (paramConfigs && Object.keys(paramConfigs).length > 0) {
    result["x-fack-params"] = paramConfigs;
  }

  return result;
}

/**
 * Synthesizes a single field into its JSON Schema representation.
 * Recursively processes nested objects and array items.
 */
function synthesizeField(field: SchemaField): JsonSchemaProperty {
  const property: JsonSchemaProperty = {
    type: field.nullable ? [field.type, "null"] : field.type,
  };

  // URL parameter binding takes precedence over Faker
  if (field.source?.type === "pathParam") {
    property["x-fack-source"] = {
      type: "pathParam",
      name: field.source.name,
    };
  } else if (field.source?.type === "static") {
    property["x-fack-source"] = {
      type: "static",
      value: field.source.value,
    };
    property["const"] = field.source.value;
  } else if (field.fakerProvider) {
    // Attach Faker.js provider annotation
    property["x-faker"] = field.fakerProvider;
    property["faker"] = field.fakerProvider;

    // Handle UUID format shorthand
    if (field.fakerProvider === "string.uuid") {
      property.format = "uuid";
    }
  }

  // Handle nested object properties
  if (field.type === "object" && field.children?.length) {
    const nestedSchema = synthesizeSchema(field.children);
    property.properties = nestedSchema.properties;
    if (nestedSchema.required.length > 0) {
      property.required = nestedSchema.required;
    }
  }

  // Handle array items
  if (field.type === "array") {
    property.items = synthesizeArrayItems(field);
  }

  return property;
}

/**
 * Synthesizes the `items` schema for array-type fields.
 * Supports both primitive array items and object array items.
 */
function synthesizeArrayItems(field: SchemaField): JsonSchemaProperty {
  const itemType = field.arrayItemType ?? "string";

  if (itemType === "object" && field.arrayItemChildren?.length) {
    const nestedSchema = synthesizeSchema(field.arrayItemChildren);
    return {
      type: "object",
      properties: nestedSchema.properties,
      required: nestedSchema.required,
    };
  }

  const items: JsonSchemaProperty = { type: itemType };
  if (field.arrayItemSource?.type === "pathParam") {
    items["x-fack-source"] = {
      type: "pathParam",
      name: field.arrayItemSource.name,
    };
  } else if (field.arrayItemSource?.type === "static") {
    items["x-fack-source"] = {
      type: "static",
      value: field.arrayItemSource.value,
    };
    items["const"] = field.arrayItemSource.value;
  } else if (field.arrayItemFakerProvider) {
    items["x-faker"] = field.arrayItemFakerProvider;
    items["faker"] = field.arrayItemFakerProvider;
  }

  return items;
}

/**
 * Extracts saved route parameter configurations from a JSON Schema.
 */
export function extractRouteParamConfigs(
  schema: JsonSchema | Record<string, unknown> | undefined,
): Record<string, RouteParamConfig> {
  if (!schema || typeof schema !== "object") {
    return {};
  }
  const raw = (schema as Record<string, unknown>)["x-fack-params"];
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as Record<string, RouteParamConfig>;
}

/**
 * Parses a JSON Schema document back into an array of SchemaField definitions.
 * This is the inverse of `synthesizeSchema` and is used to populate the
 * Edit Bar when loading an existing route's schema from the database.
 *
 * @param schema - A JSON Schema document (as stored in the database)
 * @returns An array of SchemaField definitions for the Zustand store
 */
export function parseSchemaToFields(schema: JsonSchema): SchemaField[] {
  if (!schema?.properties) return [];

  const requiredSet = new Set(schema.required ?? []);

  return Object.entries(schema.properties).map(([name, prop], index) => {
    const isNullable = Array.isArray(prop.type) && prop.type.includes("null");
    const baseType = Array.isArray(prop.type)
      ? (prop.type.find((t) => t !== "null") as SchemaField["type"])
      : (prop.type as SchemaField["type"]);

    let source: FieldSource | undefined = undefined;
    const sourceObj = prop["x-fack-source"] as
      | { type?: string; name?: string; value?: string }
      | undefined;
    if (sourceObj && typeof sourceObj === "object") {
      if (sourceObj.type === "pathParam") {
        source = {
          type: "pathParam",
          name: typeof sourceObj.name === "string" ? sourceObj.name : name,
        };
      } else if (sourceObj.type === "static") {
        source = {
          type: "static",
          value: typeof sourceObj.value === "string" ? sourceObj.value : "",
        };
      }
    }

    const field: SchemaField = {
      id: `field-${index}-${Date.now()}`,
      name,
      type: baseType ?? "string",
      nullable: isNullable || !requiredSet.has(name),
      source,
      fakerProvider: source ? undefined : prop["faker"] || prop["x-faker"],
    };

    // Parse nested object children
    if (baseType === "object" && prop.properties) {
      field.children = parseSchemaToFields({
        type: "object",
        properties: prop.properties,
        required: prop.required ?? [],
      });
    }

    // Parse array item definitions
    if (baseType === "array" && prop.items) {
      field.arrayItemType = (
        Array.isArray(prop.items.type)
          ? prop.items.type.find((t) => t !== "null")
          : prop.items.type
      ) as SchemaField["arrayItemType"];

      if (field.arrayItemType === "object" && prop.items.properties) {
        field.arrayItemChildren = parseSchemaToFields({
          type: "object",
          properties: prop.items.properties,
          required: prop.items.required ?? [],
        });
      } else {
        let arrayItemSource: FieldSource | undefined = undefined;
        const arrayItemSourceObj = prop.items["x-fack-source"] as
          | { type?: string; name?: string; value?: string }
          | undefined;
        if (arrayItemSourceObj && typeof arrayItemSourceObj === "object") {
          if (arrayItemSourceObj.type === "pathParam") {
            arrayItemSource = {
              type: "pathParam",
              name:
                typeof arrayItemSourceObj.name === "string"
                  ? arrayItemSourceObj.name
                  : name,
            };
          } else if (arrayItemSourceObj.type === "static") {
            arrayItemSource = {
              type: "static",
              value:
                typeof arrayItemSourceObj.value === "string"
                  ? arrayItemSourceObj.value
                  : "",
            };
          }
        }

        field.arrayItemSource = arrayItemSource;
        field.arrayItemFakerProvider = arrayItemSource
          ? undefined
          : prop.items["faker"] || prop.items["x-faker"];
      }
    }

    return field;
  });
}
