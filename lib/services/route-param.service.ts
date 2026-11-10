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
