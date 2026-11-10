import type { Endpoint, Route } from "@/db/schema";
import type { SchemaField } from "@/lib/schema-synthesizer";
import type { InspectorTab } from "@/stores/canvas-dnd-store";

export type { InspectorTab };

export const FIELD_TYPES = [
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export const METHOD_STYLES: Record<
  HttpMethod,
  { text: string; dot: string; highlight: string; border: string; bg: string }
> = {
  GET: {
    text: "text-method-get",
    dot: "bg-method-get",
    highlight: "data-highlighted:bg-method-get/10",
    border: "border-method-get/30",
    bg: "bg-method-get/10",
  },
  POST: {
    text: "text-method-post",
    dot: "bg-method-post",
    highlight: "data-highlighted:bg-method-post/10",
    border: "border-method-post/30",
    bg: "bg-method-post/10",
  },
  PUT: {
    text: "text-method-put",
    dot: "bg-method-put",
    highlight: "data-highlighted:bg-method-put/10",
    border: "border-method-put/30",
    bg: "bg-method-put/10",
  },
  DELETE: {
    text: "text-method-delete",
    dot: "bg-method-delete",
    highlight: "data-highlighted:bg-method-delete/10",
    border: "border-method-delete/30",
    bg: "bg-method-delete/10",
  },
  PATCH: {
    text: "text-method-patch",
    dot: "bg-method-patch",
    highlight: "data-highlighted:bg-method-patch/10",
    border: "border-method-patch/30",
    bg: "bg-method-patch/10",
  },
};

export const COMMON_STATUS_CODES = [200, 201, 204, 400, 404, 500] as const;

/**
 * Resolves status code badge styling following semantic DESIGN.md tokens.
 */
export const getStatusCodeBadgeStyles = (
  code: number,
  isSelected: boolean,
): string => {
  if (!isSelected) {
    return "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground";
  }
  if (code >= 200 && code < 300) {
    return "bg-success/15 text-success border-success/40 shadow-xs";
  }
  if (code >= 300 && code < 400) {
    return "bg-warning/15 text-warning border-warning/40 shadow-xs";
  }
  return "bg-destructive/15 text-destructive border-destructive/40 shadow-xs";
};

export const normalizeTab = (t: string): InspectorTab => {
  if (t === "config" || t === "headers") return "route";
  if (t === "rules" || t === "chaos") return "behavior";
  if (t === "schema") return "schema";
  if (t === "try") return "try";
  return (t as InspectorTab) || "route";
};

export interface NodeInspectorProps {
  /** The currently selected route on canvas, if any. */
  route?: Route | null;
  /** The ID of the field currently inspected within that route, if any. */
  inspectedFieldId?: string | null;
  /** Total count of active routes on the canvas (used in idle state). */
  activeRoutesCount: number;
  /** Slug of the current project, used for constructing live mock endpoints. */
  projectSlug?: string;
  /** Available endpoint groups in this project. */
  endpoints?: Endpoint[];
  /** Called when a route or its fields change so parent state stays synced. */
  onRouteUpdated: (updatedRoute: Route) => void;
  /** Called when a route is deleted so canvas and selection clean up. */
  onRouteDeleted?: (routeId: string) => void;
  /** Called when the user closes the inspector (back/close). */
  onCloseInspector: () => void;
}

export interface FieldEditorProps {
  field: SchemaField;
  allFields: SchemaField[];
  route: Route;
  endpoints?: Endpoint[];
  onRouteUpdated: (updatedRoute: Route) => void;
  onBack: () => void;
}

export interface RouteEditorProps {
  route: Route;
  endpoints?: Endpoint[];
  projectSlug?: string;
  onRouteUpdated: (updatedRoute: Route) => void;
  onRouteDeleted?: (routeId: string) => void;
  onDeselect: () => void;
}

export interface TryResponse {
  status: number;
  statusText: string;
  timeMs: number;
  body: string;
}
