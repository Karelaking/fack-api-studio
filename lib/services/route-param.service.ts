import type { SchemaField } from "@/lib/schema-synthesizer";

/**
 * Fack API — Route Parameter Service
 *
 * Provides shared utilities for:
 * 1. Combining endpoint basePath and route subpath into an effective path.
 * 2. Extracting named path parameters (e.g., `:id`, `/*wildcard`).
 * 3. Validating route path parameter syntax.
 * 4. Validating schema field URL bindings against declared route parameters.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RoutePathParameter {
  /** Parameter name without colon/wildcard prefix (e.g. "id") */
  name: string;
  /** Raw token from the path string (e.g. ":id" or "/*wildcard") */
  raw: string;
  /** Whether this parameter is a wildcard segment */
  isWildcard: boolean;
  /** Path parameters are required for matching */
  required: boolean;
}

export interface RoutePathValidationResult {
  /** Whether the route path has valid parameter syntax */
  isValid: boolean;
  /** Human-readable error messages for invalid constructs */
  errors: string[];
  /** Discovered unique path parameters */
  parameters: RoutePathParameter[];
}

export interface BoundFieldReference {
  /** Name of the response field */
  fieldName: string;
  /** Path parameter bound to this field */
  paramName: string;
  /** Path where the field is located (e.g. "root.id" or "items.id") */
  fieldLocation: string;
}

export interface RouteSchemaBindingValidationResult {
  /** Whether all field bindings reference valid declared path parameters */
  isValid: boolean;
  /** Validation error messages for unbound or stale parameters */
  errors: string[];
  /** List of all resolved bindings */
  boundFields: BoundFieldReference[];
}

// ─── Path Combination ────────────────────────────────────────────────────────

/**
 * Combines an endpoint base path and a route subpath into a canonical,
 * normalized effective route path.
 *
 * @param basePath - Endpoint base path (e.g., "/api/v2/users", "users", or "")
 * @param routePath - Route subpath (e.g., "/:id", ":id", or "/")
 * @returns Normalized effective route path starting with "/" and without trailing slash
 *
 * @example
 * getEffectiveRoutePath("/api/v1", "/users/:id") // returns "/api/v1/users/:id"
 * getEffectiveRoutePath("", "users/:id") // returns "/users/:id"
 * getEffectiveRoutePath("/users", "/") // returns "/users"
 */
export function getEffectiveRoutePath(
  basePath: string = "",
  routePath: string = "",
): string {
  const cleanBase = basePath.trim().replace(/^\/+|\/+$/g, "");
  const cleanRoute = routePath.trim().replace(/^\/+|\/+$/g, "");

  if (!cleanBase && !cleanRoute) {
    return "/";
  }

  if (!cleanBase) {
    return `/${cleanRoute}`;
  }

  if (!cleanRoute) {
    return `/${cleanBase}`;
  }

  return `/${cleanBase}/${cleanRoute}`;
}

// ─── Parameter Extraction ────────────────────────────────────────────────────

/** Regular expression matching slash-delimited `:param` or `/*wildcard` */
const PARAM_SEGMENT_REGEX = /(?:^|\/)(?::([a-zA-Z0-9_]+)|\*([a-zA-Z0-9_]+))/g;

/**
 * Extracts named route parameters from a route path string.
 * Supports standard `:param` segments and wildcard `/*param` segments.
 *
 * @param path - Concrete or pattern route path
 * @returns Array of unique extracted route path parameters
 */
export function extractRoutePathParameters(path: string): RoutePathParameter[] {
  if (!path || typeof path !== "string") {
    return [];
  }

  const parameters: RoutePathParameter[] = [];
  const seenNames = new Set<string>();

  PARAM_SEGMENT_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null = PARAM_SEGMENT_REGEX.exec(path);

  while (match !== null) {
    const isColonParam = Boolean(match[1]);
    const paramName = match[1] || match[2];

    if (paramName && !seenNames.has(paramName)) {
      seenNames.add(paramName);
      parameters.push({
        name: paramName,
        raw: isColonParam ? `:${paramName}` : `*${paramName}`,
        isWildcard: !isColonParam,
        required: true,
      });
    }

    match = PARAM_SEGMENT_REGEX.exec(path);
  }

  return parameters;
}

// ─── Path Validation ─────────────────────────────────────────────────────────

/**
 * Validates route path parameter syntax, checking for:
 * - Missing leading slash or malformed segments
 * - Improper parameter syntax (such as `/users:id` missing a slash delimiter)
 * - Repeated parameter names (e.g. `/users/:id/photos/:id`)
 * - Malformed parameter identifiers (e.g. `/:123` or `/:`)
 *
 * @param path - Route path to validate
 * @returns Validation result with errors and parsed parameters
 */
export function validateRoutePath(path: string): RoutePathValidationResult {
  const errors: string[] = [];
  const trimmed = (path || "").trim();

  if (!trimmed) {
    return {
      isValid: false,
      errors: ["Route path is required."],
      parameters: [],
    };
  }

  // Check for malformed non-slash-delimited parameter, e.g. "/users:id"
  if (/[a-zA-Z0-9_]:[a-zA-Z0-9_]/.test(trimmed)) {
    errors.push(
      'Path parameter must be separated by a forward slash (e.g., "/users/:id", not "/users:id").',
    );
  }

  // Check for empty colon ":/" or trailing ":"
  if (/(?:\/:$|\/:(?=\/))/.test(trimmed)) {
    errors.push('Path parameter name cannot be empty (e.g., ":").');
  }

  // Check for duplicate parameter names
  PARAM_SEGMENT_REGEX.lastIndex = 0;
  const nameOccurrences = new Map<string, number>();
  let match: RegExpExecArray | null = PARAM_SEGMENT_REGEX.exec(trimmed);

  while (match !== null) {
    const paramName = match[1] || match[2];
    if (paramName) {
      nameOccurrences.set(paramName, (nameOccurrences.get(paramName) ?? 0) + 1);
    }
    match = PARAM_SEGMENT_REGEX.exec(trimmed);
  }

  for (const [name, count] of nameOccurrences.entries()) {
    if (count > 1) {
      errors.push(
        `Duplicate parameter ":${name}" found in route path. Parameter names must be unique.`,
      );
    }
  }

  const parameters = extractRoutePathParameters(trimmed);

  return {
    isValid: errors.length === 0,
    errors,
    parameters,
  };
}

// ─── Schema Binding Validation ───────────────────────────────────────────────

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

/**
 * Validates that all URL parameter bindings declared in a JSON schema reference
 * parameters that actually exist in the route's effective path.
 *
 * @param schema - The JSON Schema object (or parsed responseSchema)
 * @param declaredParamNames - Array of parameter names available in the route
 * @returns Validation result with list of bindings and error messages
 */
export function validateRouteSchemaBindings(
  schema: unknown,
  declaredParamNames: string[],
): RouteSchemaBindingValidationResult {
  const errors: string[] = [];
  const boundFields: BoundFieldReference[] = [];
  const declaredSet = new Set(declaredParamNames);

  if (!schema || typeof schema !== "object") {
    return { isValid: true, errors: [], boundFields: [] };
  }

  const traverse = (current: GenericSchemaProperty, location: string): void => {
    if (!current || typeof current !== "object") {
      return;
    }

    // Check if current property has x-fack-source
    const source = current["x-fack-source"];
    if (source && typeof source === "object" && source.type === "pathParam") {
      const paramName =
        typeof source.name === "string" ? source.name.trim() : "";
      const fieldName = location.split(".").pop() ?? location;

      if (!paramName) {
        errors.push(
          `Field "${location}" is configured to use a URL parameter, but no parameter name was specified.`,
        );
      } else if (!declaredSet.has(paramName)) {
        errors.push(
          `Field "${location}" binds to URL parameter ":${paramName}", which is not present in the route path. Available parameters: ${declaredParamNames.length > 0 ? declaredParamNames.map((p) => `:${p}`).join(", ") : "none"}.`,
        );
      } else {
        boundFields.push({
          fieldName,
          paramName,
          fieldLocation: location,
        });
      }
    }

    // Recursively inspect object properties
    if (current.properties && typeof current.properties === "object") {
      for (const [key, childProp] of Object.entries(current.properties)) {
        traverse(childProp, location ? `${location}.${key}` : key);
      }
    }

    // Recursively inspect array items
    if (current.items && typeof current.items === "object") {
      traverse(current.items, `${location}[]`);
    }
  };

  const rootSchema = schema as GenericSchemaProperty;
  if (rootSchema.properties && typeof rootSchema.properties === "object") {
    for (const [key, prop] of Object.entries(rootSchema.properties)) {
      traverse(prop, key);
    }
  } else if (rootSchema.items && typeof rootSchema.items === "object") {
    traverse(rootSchema.items, "items[]");
  }

  return {
    isValid: errors.length === 0,
    errors,
    boundFields,
  };
}

// ─── Parameter Renaming & Schema Synchronization ─────────────────────────────

/**
 * Compares two route paths (e.g. an old path and an updated path) and detects
 * if any URL path parameters were renamed.
 *
 * Handles:
 * - Direct 1-to-1 parameter replacement (e.g. "/projects/:name" -> "/projects/:projectId")
 * - Positional segment alignment for multi-parameter routes
 * - Preserves unchanged parameters (e.g. "/users/:id/photos/:name" -> "/users/:id/photos/:photoName")
 *
 * @param oldPath - The original route path or effective path
 * @param newPath - The updated route path or effective path
 * @returns Dictionary mapping `{ [oldParamName]: newParamName }`
 */
export function detectParameterRenames(
  oldPath: string,
  newPath: string,
): Record<string, string> {
  if (!oldPath || !newPath || oldPath === newPath) {
    return {};
  }

  const oldParams = extractRoutePathParameters(oldPath);
  const newParams = extractRoutePathParameters(newPath);

  const oldNames = oldParams.map((p) => p.name);
  const newNames = newParams.map((p) => p.name);

  // If identical parameter lists, no rename
  if (
    oldNames.length === newNames.length &&
    oldNames.every((name, index) => name === newNames[index])
  ) {
    return {};
  }

  // Identify parameters present in both (unchanged)
  const unchanged = new Set(oldNames.filter((name) => newNames.includes(name)));

  const remainingOld = oldNames.filter((name) => !unchanged.has(name));
  const remainingNew = newNames.filter((name) => !unchanged.has(name));

  if (remainingOld.length === 0 || remainingNew.length === 0) {
    return {};
  }

  const renames: Record<string, string> = {};

  // If single parameter changed on both sides, it is a direct rename
  if (remainingOld.length === 1 && remainingNew.length === 1) {
    renames[remainingOld[0]] = remainingNew[0];
    return renames;
  }

  // Segment-based positional alignment
  const oldSegments = oldPath.split("/").filter(Boolean);
  const newSegments = newPath.split("/").filter(Boolean);

  const minSegments = Math.min(oldSegments.length, newSegments.length);
  for (let i = 0; i < minSegments; i++) {
    const oldSeg = oldSegments[i];
    const newSeg = newSegments[i];

    if (
      (oldSeg.startsWith(":") || oldSeg.startsWith("*")) &&
      (newSeg.startsWith(":") || newSeg.startsWith("*"))
    ) {
      const oldParam = oldSeg.slice(1);
      const newParam = newSeg.slice(1);

      if (
        oldParam &&
        newParam &&
        oldParam !== newParam &&
        remainingOld.includes(oldParam) &&
        remainingNew.includes(newParam)
      ) {
        renames[oldParam] = newParam;
      }
    }
  }

  // For any remaining unmapped, pair by order of appearance
  const stillUnmappedOld = remainingOld.filter((name) => !renames[name]);
  const stillUnmappedNew = remainingNew.filter(
    (name) => !Object.values(renames).includes(name),
  );

  const minUnmapped = Math.min(
    stillUnmappedOld.length,
    stillUnmappedNew.length,
  );
  for (let i = 0; i < minUnmapped; i++) {
    renames[stillUnmappedOld[i]] = stillUnmappedNew[i];
  }

  return renames;
}

/**
 * Synchronizes and updates an array of SchemaField definitions when route path parameters
 * are renamed. Renames both the field's `source.name` and the field's `name` if it was
 * bound to or named after the renamed parameter.
 *
 * @param fields - Visual schema fields tree from Zustand store
 * @param renames - Map of `{ [oldParamName]: newParamName }`
 * @returns Updated array of SchemaField definitions
 */
export function remapFieldsParameters(
  fields: SchemaField[],
  renames: Record<string, string>,
): SchemaField[] {
  if (Object.keys(renames).length === 0) {
    return fields;
  }

  const remapNode = (field: SchemaField): SchemaField => {
    const updated: SchemaField = { ...field };

    if (updated.source?.type === "pathParam") {
      const currentParam = updated.source.name;
      const targetParam = renames[currentParam];
      if (targetParam) {
        updated.source = {
          type: "pathParam",
          name: targetParam,
        };

        // If field was named after the parameter, update the field name to match
        if (
          updated.name === currentParam ||
          updated.name.toLowerCase() === currentParam.toLowerCase()
        ) {
          updated.name = targetParam;
        }
      }
    } else if (renames[updated.name]) {
      // Field was named after old param but did not yet have source specified
      const targetParam = renames[updated.name];
      updated.name = targetParam;
      updated.source = {
        type: "pathParam",
        name: targetParam,
      };
      updated.fakerProvider = undefined;
    }

    if (updated.arrayItemSource?.type === "pathParam") {
      const currentParam = updated.arrayItemSource.name;
      const targetParam = renames[currentParam];
      if (targetParam) {
        updated.arrayItemSource = {
          type: "pathParam",
          name: targetParam,
        };
      }
    }

    if (updated.children && updated.children.length > 0) {
      updated.children = updated.children.map(remapNode);
    }

    if (updated.arrayItemChildren && updated.arrayItemChildren.length > 0) {
      updated.arrayItemChildren = updated.arrayItemChildren.map(remapNode);
    }

    return updated;
  };

  return fields.map(remapNode);
}

/**
 * Remaps parameter references and property keys in a raw JSON Schema object.
 * Synchronizes:
 * - "properties" keys (if named after old parameter or bound to it)
 * - "required" array entries
 * - "x-fack-source" annotations
 * - "x-fack-params" configurations dictionary
 *
 * @param schema - Raw JSON Schema object or parsed schema
 * @param renames - Map of `{ [oldParamName]: newParamName }`
 * @returns Remapped schema object
 */
export function remapSchemaParameters(
  schema: unknown,
  renames: Record<string, string>,
): unknown {
  if (
    !schema ||
    typeof schema !== "object" ||
    Object.keys(renames).length === 0
  ) {
    return schema;
  }

  const cloned = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;

  // 1. Remap x-fack-params dictionary
  const rawParams = cloned["x-fack-params"];
  if (rawParams && typeof rawParams === "object") {
    const updatedParams: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(
      rawParams as Record<string, unknown>,
    )) {
      const targetKey = renames[key] ?? key;
      updatedParams[targetKey] = val;
    }
    cloned["x-fack-params"] = updatedParams;
  }

  // 2. Recursively remap schema properties
  const traverse = (node: Record<string, unknown>): void => {
    if (!node || typeof node !== "object") {
      return;
    }

    if (node.properties && typeof node.properties === "object") {
      const oldProps = node.properties as Record<
        string,
        Record<string, unknown>
      >;
      const newProps: Record<string, Record<string, unknown>> = {};
      const requiredList: string[] = Array.isArray(node.required)
        ? (node.required as string[]).slice()
        : [];

      for (const [key, propDef] of Object.entries(oldProps)) {
        let targetKey = key;
        const source = propDef["x-fack-source"] as
          | { type?: string; name?: string; value?: string }
          | undefined;

        if (
          source &&
          typeof source === "object" &&
          source.type === "pathParam"
        ) {
          const oldName = source.name ? String(source.name).trim() : "";
          const targetName = renames[oldName];
          if (targetName) {
            source.name = targetName;
            if (
              key === oldName ||
              key.toLowerCase() === oldName.toLowerCase()
            ) {
              targetKey = targetName;
              const reqIndex = requiredList.indexOf(key);
              if (reqIndex !== -1) {
                requiredList[reqIndex] = targetKey;
              }
            }
          }
        } else if (renames[key]) {
          targetKey = renames[key];
          propDef["x-fack-source"] = {
            type: "pathParam",
            name: targetKey,
          };
          delete propDef["faker"];
          delete propDef["x-faker"];
          const reqIndex = requiredList.indexOf(key);
          if (reqIndex !== -1) {
            requiredList[reqIndex] = targetKey;
          }
        }

        traverse(propDef);
        newProps[targetKey] = propDef;
      }

      node.properties = newProps;
      if (requiredList.length > 0) {
        node.required = requiredList;
      }
    }

    if (node.items && typeof node.items === "object") {
      const itemsNode = node.items as Record<string, unknown>;
      const itemSource = itemsNode["x-fack-source"] as
        | { type?: string; name?: string; value?: string }
        | undefined;
      if (
        itemSource &&
        typeof itemSource === "object" &&
        itemSource.type === "pathParam"
      ) {
        const oldName = itemSource.name ? String(itemSource.name).trim() : "";
        if (renames[oldName]) {
          itemSource.name = renames[oldName];
        }
      }
      traverse(itemsNode);
    }
  };

  traverse(cloned);
  return cloned;
}

/**
 * Reconciles schema fields against declared route path parameters.
 * If any fields reference parameters that are no longer declared in the route path,
 * and there are unmapped declared parameters, automatically remaps the existing fields
 * in-place to bind to the new parameters, updating their field names and sources.
 *
 * @param fields - Current schema fields
 * @param declaredParamNames - Array of parameter names currently declared in route path
 * @returns Object containing the updated fields array and a map of renames performed
 */
export function reconcileFieldParameters(
  fields: SchemaField[],
  declaredParamNames: string[],
): { fields: SchemaField[]; renames: Record<string, string> } {
  if (
    !fields ||
    fields.length === 0 ||
    !declaredParamNames ||
    declaredParamNames.length === 0
  ) {
    return { fields: fields ?? [], renames: {} };
  }

  // 1. Identify which declared parameters already have a matching field
  const mappedDeclared = new Set<string>();
  for (const f of fields) {
    if (
      f.source?.type === "pathParam" &&
      declaredParamNames.includes(f.source.name)
    ) {
      mappedDeclared.add(f.source.name);
    }
  }

  // 2. Identify unmapped declared parameters
  const unmappedDeclared = declaredParamNames.filter(
    (p) => !mappedDeclared.has(p),
  );
  if (unmappedDeclared.length === 0) {
    return { fields, renames: {} };
  }

  // 3. Find orphaned fields whose pathParam source is not in declaredParamNames
  const orphanedFieldIndices: number[] = [];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (
      f.source?.type === "pathParam" &&
      !declaredParamNames.includes(f.source.name)
    ) {
      orphanedFieldIndices.push(i);
    }
  }

  if (orphanedFieldIndices.length === 0) {
    return { fields, renames: {} };
  }

  // 4. Pair orphaned fields with unmapped declared parameters
  const renames: Record<string, string> = {};
  const updatedFields = [...fields];
  const countToPair = Math.min(
    orphanedFieldIndices.length,
    unmappedDeclared.length,
  );

  for (let i = 0; i < countToPair; i++) {
    const fieldIndex = orphanedFieldIndices[i];
    const targetParam = unmappedDeclared[i];
    const oldField = updatedFields[fieldIndex];
    const oldParam =
      oldField.source?.type === "pathParam"
        ? oldField.source.name
        : oldField.name;

    renames[oldParam] = targetParam;

    const newField: SchemaField = {
      ...oldField,
      source: {
        type: "pathParam",
        name: targetParam,
      },
    };

    // If field was named after old parameter, update field name to match new parameter
    if (
      oldField.name === oldParam ||
      oldField.name.toLowerCase() === oldParam.toLowerCase()
    ) {
      newField.name = targetParam;
    }

    updatedFields[fieldIndex] = newField;
  }

  return { fields: updatedFields, renames };
}

/**
 * Reconciles a raw JSON Schema against declared route path parameters.
 * If any schema properties reference path parameters that are no longer declared in the route path,
 * and there are unmapped declared parameters, automatically remaps the property key,
 * x-fack-source, required list, and x-fack-params configuration.
 *
 * @param schema - Raw JSON Schema object
 * @param declaredParamNames - Array of parameter names currently declared in route path
 * @returns Object containing the remapped schema and dictionary of renames performed
 */
export function reconcileSchemaParameters(
  schema: unknown,
  declaredParamNames: string[],
): { schema: unknown; renames: Record<string, string> } {
  if (
    !schema ||
    typeof schema !== "object" ||
    !declaredParamNames ||
    declaredParamNames.length === 0
  ) {
    return { schema, renames: {} };
  }

  const schemaObj = schema as Record<string, unknown>;
  const properties = schemaObj.properties as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (!properties || typeof properties !== "object") {
    return { schema, renames: {} };
  }

  // 1. Identify which declared parameters already have a bound property
  const mappedDeclared = new Set<string>();
  const orphanedParamNames: string[] = [];

  for (const [, propDef] of Object.entries(properties)) {
    const source = propDef["x-fack-source"] as
      | { type?: string; name?: string }
      | undefined;
    if (
      source &&
      typeof source === "object" &&
      source.type === "pathParam" &&
      source.name
    ) {
      if (declaredParamNames.includes(source.name)) {
        mappedDeclared.add(source.name);
      } else {
        orphanedParamNames.push(source.name);
      }
    }
  }

  const unmappedDeclared = declaredParamNames.filter(
    (p) => !mappedDeclared.has(p),
  );
  if (unmappedDeclared.length === 0 || orphanedParamNames.length === 0) {
    return { schema, renames: {} };
  }

  // 2. Build renames map
  const renames: Record<string, string> = {};
  const countToPair = Math.min(
    orphanedParamNames.length,
    unmappedDeclared.length,
  );
  for (let i = 0; i < countToPair; i++) {
    renames[orphanedParamNames[i]] = unmappedDeclared[i];
  }

  // 3. Apply remapping
  const remapped = remapSchemaParameters(schema, renames);
  return { schema: remapped, renames };
}

// ─── Field Ordering Helpers ──────────────────────────────────────────────────

/**
 * Resolves the canonical sort weight for a schema field name:
 * 0: "id" or "_id" (always at the very top)
 * 1: regular payload / route parameter / business fields (in the middle)
 * 2: "createdAt" / "created_at" (towards the end)
 * 3: "updatedAt" / "updated_at" (at the very end)
 */
export function getFieldOrderWeight(fieldName: string): number {
  const normalized = (fieldName || "").trim().toLowerCase().replace(/_/g, "");
  if (normalized === "id") return 0;
  if (normalized === "createdat" || normalized === "created") return 2;
  if (normalized === "updatedat" || normalized === "updated") return 3;
  return 1;
}

/**
 * Inserts a new field in canonical order:
 * "id" first, all regular and parameter fields in between, and "createdAt" / "updatedAt" at the end.
 */
export function insertFieldInCanonicalOrder(
  fields: SchemaField[],
  newField: SchemaField,
): SchemaField[] {
  const weight = getFieldOrderWeight(newField.name);

  if (weight === 0) {
    const existingIdIndex = fields.findIndex(
      (f) => getFieldOrderWeight(f.name) === 0,
    );
    if (existingIdIndex !== -1) {
      return fields.map((f, i) => (i === existingIdIndex ? newField : f));
    }
    return [newField, ...fields];
  }

  if (weight >= 2) {
    return [...fields.filter((f) => f.name !== newField.name), newField];
  }

  // Regular or parameter field: insert before the first timestamp field (createdAt/updatedAt)
  const firstTimestampIndex = fields.findIndex(
    (f) => getFieldOrderWeight(f.name) >= 2,
  );
  if (firstTimestampIndex === -1) {
    return [...fields, newField];
  }

  const updated = [...fields];
  updated.splice(firstTimestampIndex, 0, newField);
  return updated;
}

/**
 * Canonically sorts top-level schema fields so that:
 * 1. "id" is first
 * 2. all parameter & payload fields are in between
 * 3. "createdAt" and "updatedAt" are at the end
 * Preserves the relative order of fields within the same weight tier.
 */
export function sortFieldsCanonically(fields: SchemaField[]): SchemaField[] {
  return [...fields].sort((a, b) => {
    return getFieldOrderWeight(a.name) - getFieldOrderWeight(b.name);
  });
}

/**
 * Automatically ensures that all declared route path parameters have corresponding
 * fields in the schema fields array.
 *
 * 1. First reconciles any orphaned path parameter fields in-place (e.g. from parameter renames).
 * 2. Then, for any remaining unmapped parameters introduced in the URL, automatically creates
 *    and appends a new SchemaField bound to that URL parameter.
 *
 * @param fields - Current visual schema fields
 * @param declaredParamNames - Array of parameter names extracted from the route path
 * @returns Object with updated fields, renames performed, and list of newly added parameter fields
 */
export function syncRoutePathFields(
  fields: SchemaField[],
  declaredParamNames: string[],
): {
  fields: SchemaField[];
  renames: Record<string, string>;
  addedParams: string[];
} {
  if (!declaredParamNames || declaredParamNames.length === 0) {
    return { fields: fields ?? [], renames: {}, addedParams: [] };
  }

  // 1. Reconcile orphaned parameter fields in-place first
  const { fields: reconciledFields, renames } = reconcileFieldParameters(
    fields ?? [],
    declaredParamNames,
  );

  // 2. Identify which declared parameters are now mapped
  const mappedParams = new Set<string>();
  for (const f of reconciledFields) {
    if (
      f.source?.type === "pathParam" &&
      declaredParamNames.includes(f.source.name)
    ) {
      mappedParams.add(f.source.name);
    } else if (declaredParamNames.includes(f.name)) {
      mappedParams.add(f.name);
    }
  }

  // 3. For any remaining unmapped declared parameters, automatically create fields
  // and insert them in between "id" and timestamp fields (createdAt / updatedAt)
  const unmapped = declaredParamNames.filter((p) => !mappedParams.has(p));
  const addedParams: string[] = [];
  let updatedFields = [...reconciledFields];

  for (const paramName of unmapped) {
    const newField: SchemaField = {
      id: `field-${Date.now()}-${paramName}`,
      name: paramName,
      type: "string",
      nullable: false,
      source: {
        type: "pathParam",
        name: paramName,
      },
    };
    updatedFields = insertFieldInCanonicalOrder(updatedFields, newField);
    addedParams.push(paramName);
  }

  // Ensure overall canonical ordering
  const canonicallySorted = sortFieldsCanonically(updatedFields);

  return {
    fields: canonicallySorted,
    renames,
    addedParams,
  };
}

/**
 * Automatically ensures that all declared route path parameters have corresponding
 * properties in a raw JSON Schema.
 *
 * 1. First reconciles any orphaned path parameter properties in-place.
 * 2. Then, for any remaining unmapped parameters introduced in the URL, automatically creates
 *    and appends a new property with type "string", "x-fack-source", and adds it to required.
 *
 * @param schema - Raw JSON Schema object
 * @param declaredParamNames - Array of parameter names extracted from the route path
 * @returns Object with remapped/extended schema, renames performed, and list of newly added params
 */
export function syncRoutePathSchema(
  schema: unknown,
  declaredParamNames: string[],
): {
  schema: unknown;
  renames: Record<string, string>;
  addedParams: string[];
} {
  if (!declaredParamNames || declaredParamNames.length === 0) {
    return { schema, renames: {}, addedParams: [] };
  }

  // 1. Reconcile existing orphaned properties in-place
  const { schema: reconciledSchema, renames } = reconcileSchemaParameters(
    schema,
    declaredParamNames,
  );

  const cloned = JSON.parse(
    JSON.stringify(
      reconciledSchema ?? { type: "object", properties: {}, required: [] },
    ),
  ) as Record<string, unknown>;

  if (!cloned.properties || typeof cloned.properties !== "object") {
    cloned.properties = {};
  }
  const properties = cloned.properties as Record<
    string,
    Record<string, unknown>
  >;

  const requiredList: string[] = Array.isArray(cloned.required)
    ? (cloned.required as string[]).slice()
    : [];

  // 2. Identify mapped parameters
  const mappedParams = new Set<string>();
  for (const [propKey, propDef] of Object.entries(properties)) {
    const source = propDef["x-fack-source"] as
      | { type?: string; name?: string }
      | undefined;
    if (
      source &&
      source.type === "pathParam" &&
      source.name &&
      declaredParamNames.includes(source.name)
    ) {
      mappedParams.add(source.name);
    } else if (declaredParamNames.includes(propKey)) {
      mappedParams.add(propKey);
    }
  }

  // 3. For any remaining unmapped declared parameters, automatically create properties
  const unmapped = declaredParamNames.filter((p) => !mappedParams.has(p));
  const addedParams: string[] = [];

  for (const paramName of unmapped) {
    properties[paramName] = {
      type: "string",
      "x-fack-source": {
        type: "pathParam",
        name: paramName,
      },
    };
    if (!requiredList.includes(paramName)) {
      requiredList.push(paramName);
    }
    addedParams.push(paramName);
  }

  // Sort properties canonically: id first, other fields in middle, createdAt/updatedAt at end
  const sortedProps: Record<string, Record<string, unknown>> = {};
  const sortedKeys = Object.keys(properties).sort((a, b) => {
    return getFieldOrderWeight(a) - getFieldOrderWeight(b);
  });
  for (const k of sortedKeys) {
    sortedProps[k] = properties[k];
  }

  // Sort required list in same canonical order
  requiredList.sort((a, b) => {
    return getFieldOrderWeight(a) - getFieldOrderWeight(b);
  });

  cloned.properties = sortedProps;
  cloned.required = requiredList;

  return {
    schema: cloned,
    renames,
    addedParams,
  };
}
