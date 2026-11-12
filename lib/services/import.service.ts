import type {
  GeneratedApi,
  GeneratedEndpoint,
  GeneratedProperty,
  JsonSchemaPropertyType,
} from "@/lib/ai/types";
import type { HttpMethod } from "@/db/schema";
import { toProfessionalApiName } from "@/lib/ai/fallback-synthesizer";

/**
 * OpenAPI 3.0 / 3.1 Schema Object representation.
 */
export interface OpenApiSchemaObject {
  type?: string;
  nullable?: boolean;
  properties?: Record<string, OpenApiSchemaObject>;
  items?: OpenApiSchemaObject;
  [key: string]: unknown;
}

/**
 * OpenAPI Media Type Object representation (e.g. application/json).
 */
export interface OpenApiMediaTypeObject {
  schema?: OpenApiSchemaObject;
  [key: string]: unknown;
}

/**
 * OpenAPI Response Object representation.
 */
export interface OpenApiResponseObject {
  description?: string;
  content?: Record<string, OpenApiMediaTypeObject>;
  [key: string]: unknown;
}

/**
 * OpenAPI Operation Object representation.
 */
export interface OpenApiOperationObject {
  summary?: string;
  description?: string;
  responses?: Record<string, OpenApiResponseObject>;
  [key: string]: unknown;
}

/**
 * OpenAPI Path Item Object representation.
 */
export type OpenApiPathItemObject = {
  [
    method in "get" | "post" | "put" | "patch" | "delete"
  ]?: OpenApiOperationObject;
} & Record<string, unknown>;

/**
 * OpenAPI Top-Level Document representation.
 */
export interface OpenApiDocument {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    description?: string;
    version?: string;
  };
  paths?: Record<string, OpenApiPathItemObject>;
  [key: string]: unknown;
}

type ArrayItemType = NonNullable<GeneratedProperty["arrayItemType"]>;

const VALID_SCHEMA_TYPES = new Set<JsonSchemaPropertyType>([
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
]);

const VALID_ARRAY_ITEM_TYPES = new Set<ArrayItemType>([
  "string",
  "number",
  "integer",
  "boolean",
  "object",
]);

function isJsonSchemaPropertyType(
  value: string,
): value is JsonSchemaPropertyType {
  return VALID_SCHEMA_TYPES.has(value as JsonSchemaPropertyType);
}

function isArrayItemType(value: string): value is ArrayItemType {
  return VALID_ARRAY_ITEM_TYPES.has(value as ArrayItemType);
}

/**
 * Resolves local $ref pointers (e.g., "#/components/schemas/User" or "#/definitions/User")
 * with cycle detection to prevent infinite recursion on circular models.
 */
function resolveSchemaRef(
  schema: OpenApiSchemaObject | undefined,
  doc?: OpenApiDocument,
  visited = new Set<string>(),
): OpenApiSchemaObject | undefined {
  if (!schema || typeof schema !== "object") return schema;

  if (typeof schema.$ref === "string" && doc) {
    const refPath = schema.$ref;
    if (visited.has(refPath)) {
      return undefined;
    }
    visited.add(refPath);

    if (refPath.startsWith("#/")) {
      const parts = refPath.slice(2).split("/");
      let current: unknown = doc;
      for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
          current = (current as Record<string, unknown>)[part];
        } else {
          current = undefined;
          break;
        }
      }
      if (current && typeof current === "object") {
        return resolveSchemaRef(
          current as OpenApiSchemaObject,
          doc,
          new Set(visited),
        );
      }
    }
  }

  return schema;
}

/**
 * Maps OpenAPI schema properties to our recursive GeneratedProperty format.
 */
function parseOpenApiSchemaProperties(
  rawSchema: OpenApiSchemaObject | undefined,
  doc?: OpenApiDocument,
  visited = new Set<string>(),
): GeneratedProperty[] {
  const schema = resolveSchemaRef(rawSchema, doc, visited);
  if (!schema || typeof schema !== "object") return [];

  const properties: GeneratedProperty[] = [];

  // Handle direct properties
  if (schema.properties) {
    for (const [key, rawPropSchema] of Object.entries(schema.properties)) {
      if (!rawPropSchema || typeof rawPropSchema !== "object") continue;
      const propSchema = resolveSchemaRef(rawPropSchema, doc, visited);
      if (!propSchema || typeof propSchema !== "object") continue;

      const rawType =
        typeof propSchema.type === "string"
          ? propSchema.type.toLowerCase()
          : "string";
      const mappedType: JsonSchemaPropertyType = isJsonSchemaPropertyType(
        rawType,
      )
        ? rawType
        : "string";

      const prop: GeneratedProperty = {
        name: key,
        type: mappedType,
        nullable: Boolean(propSchema.nullable),
      };

      // Best effort faker provider mapping based on name
      const lowerKey = key.toLowerCase();
      if (mappedType === "string") {
        if (lowerKey.includes("email")) prop.fakerProvider = "internet.email";
        else if (lowerKey.includes("name"))
          prop.fakerProvider = "person.fullName";
        else if (lowerKey.includes("phone"))
          prop.fakerProvider = "phone.number";
        else if (lowerKey.includes("url") || lowerKey.includes("website"))
          prop.fakerProvider = "internet.url";
        else if (lowerKey.includes("id") || lowerKey.includes("uuid"))
          prop.fakerProvider = "string.uuid";
        else if (lowerKey.includes("date") || lowerKey.includes("time"))
          prop.fakerProvider = "date.recent";
        else if (
          lowerKey.includes("avatar") ||
          lowerKey.includes("image") ||
          lowerKey.includes("picture")
        )
          prop.fakerProvider = "image.avatar";
        else if (lowerKey.includes("company"))
          prop.fakerProvider = "company.name";
        else if (lowerKey.includes("address"))
          prop.fakerProvider = "location.streetAddress";
        else if (lowerKey.includes("city"))
          prop.fakerProvider = "location.city";
        else if (lowerKey.includes("state"))
          prop.fakerProvider = "location.state";
        else if (lowerKey.includes("zip"))
          prop.fakerProvider = "location.zipCode";
        else if (lowerKey.includes("country"))
          prop.fakerProvider = "location.country";
        else if (lowerKey.includes("color")) prop.fakerProvider = "color.human";
        else if (
          lowerKey.includes("description") ||
          lowerKey.includes("content")
        )
          prop.fakerProvider = "lorem.paragraph";
        else prop.fakerProvider = "lorem.word";
      } else if (mappedType === "number" || mappedType === "integer") {
        if (
          lowerKey.includes("price") ||
          lowerKey.includes("amount") ||
          lowerKey.includes("cost") ||
          lowerKey.includes("total")
        )
          prop.fakerProvider = "commerce.price";
        else prop.fakerProvider = "number.int";
      } else if (mappedType === "boolean") {
        prop.fakerProvider = "datatype.boolean";
      }

      if (mappedType === "object" && propSchema.properties) {
        prop.children = parseOpenApiSchemaProperties(
          propSchema,
          doc,
          new Set(visited),
        );
      } else if (mappedType === "array" && propSchema.items) {
        const itemObj = doc
          ? resolveSchemaRef(propSchema.items, doc, visited)
          : propSchema.items;
        const itemType = (
          itemObj && typeof itemObj.type === "string" ? itemObj.type : "string"
        ).toLowerCase();
        if (isArrayItemType(itemType)) {
          prop.arrayItemType = itemType;
          if (itemObj && itemType === "object" && itemObj.properties) {
            prop.arrayItemChildren = parseOpenApiSchemaProperties(
              itemObj,
              doc,
              new Set(visited),
            );
          } else {
            prop.arrayItemFakerProvider = "lorem.word";
          }
        }
      }

      properties.push(prop);
    }
  }

  // Handle arrays at the root of the schema
  if (schema.type === "array" && schema.items) {
    const rootItemObj = doc
      ? resolveSchemaRef(schema.items, doc, visited)
      : schema.items;
    const itemType = (
      rootItemObj && typeof rootItemObj.type === "string"
        ? rootItemObj.type
        : "string"
    ).toLowerCase();
    const prop: GeneratedProperty = {
      name: "items",
      type: "array",
      nullable: false,
    };
    if (isArrayItemType(itemType)) {
      prop.arrayItemType = itemType;
      if (rootItemObj && itemType === "object" && rootItemObj.properties) {
        prop.arrayItemChildren = parseOpenApiSchemaProperties(
          rootItemObj,
          doc,
          new Set(visited),
        );
      }
    }
    properties.push(prop);
  }

  return properties;
}

/**
 * Parses an OpenAPI Document object into a GeneratedApi.
 */
export function parseOpenApiDocument(doc: OpenApiDocument): GeneratedApi {
  if (!doc || !doc.paths) {
    throw new Error("Invalid OpenAPI document: missing paths object.");
  }

  const endpointsMap = new Map<string, GeneratedEndpoint>();

  for (const [pathStr, pathObj] of Object.entries(doc.paths)) {
    if (!pathObj || typeof pathObj !== "object") continue;

    // Determine a base path by looking at the first segment
    const segments = pathStr.split("/").filter(Boolean);
    const baseSegment = segments.length > 0 ? `/${segments[0]}` : "/api";

    // Group endpoints by baseSegment
    let endpoint = endpointsMap.get(baseSegment);
    if (!endpoint) {
      endpoint = {
        name: segments[0]
          ? segments[0].charAt(0).toUpperCase() + segments[0].slice(1)
          : "API",
        basePath: baseSegment,
        routes: [],
      };
      endpointsMap.set(baseSegment, endpoint);
    }

    // Relative path for the route
    const relativePath = pathStr.startsWith(baseSegment)
      ? pathStr.slice(baseSegment.length)
      : pathStr;
    const finalRoutePath = relativePath.startsWith("/")
      ? relativePath
      : `/${relativePath}`;

    const supportedMethods: readonly (
      | "get"
      | "post"
      | "put"
      | "patch"
      | "delete"
    )[] = ["get", "post", "put", "patch", "delete"];
    for (const method of supportedMethods) {
      const operation = pathObj[method];
      if (operation) {
        let properties: GeneratedProperty[] = [];
        let statusCode = method === "post" ? 201 : 200;

        // Try to extract response schema
        if (operation.responses) {
          const successCodes = ["200", "201", "202", "default"];
          let successResponse: OpenApiResponseObject | undefined = undefined;
          for (const code of successCodes) {
            const candidate = operation.responses[code];
            if (candidate) {
              successResponse = candidate;
              if (code !== "default") statusCode = parseInt(code, 10);
              break;
            }
          }

          if (
            successResponse &&
            successResponse.content &&
            successResponse.content["application/json"]
          ) {
            const schema = successResponse.content["application/json"].schema;
            properties = parseOpenApiSchemaProperties(schema, doc);
          }
        }

        endpoint.routes.push({
          method: method.toUpperCase() as HttpMethod,
          path: finalRoutePath === "/" ? "" : finalRoutePath, // AiValidator normalization expects no trailing slash for root routes usually, but empty string is safe
          statusCode,
          description: operation.summary || operation.description || "",
          properties,
          latency: { min: 100, max: 500 }, // Default values
          errorRate: 0.05,
        });
      }
    }
  }

  const endpoints = Array.from(endpointsMap.values()).map((ep) => {
    // If all routes end up with an empty path, ensure it has at least one '/' if needed
    ep.routes.forEach((r) => {
      if (!r.path) r.path = "/";
    });
    return ep;
  });

  const rawName = doc.info?.title || "Imported API";
  const apiName = toProfessionalApiName(
    rawName,
    endpoints.map((e) => e.name),
  );

  return {
    name: apiName,
    description: doc.info?.description || "",
    endpoints,
  };
}
