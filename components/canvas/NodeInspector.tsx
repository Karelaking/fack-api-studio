"use client";

import * as React from "react";
import {
  RiArrowLeftSLine,
  RiCloseLine,
  RiSaveLine,
  RiDeleteBin6Line,
  RiLoader2Line,
  RiSettings2Line,
  RiNodeTree,
  RiPulseLine,
  RiSparklingLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCanvasDndStore } from "@/stores/canvas-dnd-store-provider";
import { FakerProviderSelect } from "@/components/edit-bar/FakerProviderSelect";
import { getProviderByValue } from "@/lib/faker-registry";
import { updateRoute, deleteRoute } from "@/lib/actions/routes";
import {
  removeFieldFromRoute,
  clearFieldsFromRoute,
} from "@/lib/actions/canvas-dnd";
import {
  parseSchemaToFields,
  synthesizeSchema,
  type SchemaField,
} from "@/lib/schema-synthesizer";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Route } from "@/db/schema";

const FIELD_TYPES = [
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
] as const;

type FieldType = (typeof FIELD_TYPES)[number];

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

interface NodeInspectorProps {
  /** The currently selected route on canvas, if any. */
  route?: Route | null;
  /** The ID of the field currently inspected within that route, if any. */
  inspectedFieldId?: string | null;
  /** Total count of active routes on the canvas (used in idle state). */
  activeRoutesCount: number;
  /** Called when a route or its fields change so parent state stays synced. */
  onRouteUpdated: (updatedRoute: Route) => void;
  /** Called when a route is deleted so canvas and selection clean up. */
  onRouteDeleted?: (routeId: string) => void;
  /** Called to open the full advanced EditBar sheet. */
  onOpenAdvanced: () => void;
  /** Called when the user closes the inspector (back/close). */
  onCloseInspector: () => void;
}

interface FieldEditorProps {
  field: SchemaField;
  allFields: SchemaField[];
  route: Route;
  onRouteUpdated: (updatedRoute: Route) => void;
  onBack: () => void;
  onOpenAdvanced: () => void;
}

const FieldEditor = ({
  field,
  allFields,
  route,
  onRouteUpdated,
  onBack,
  onOpenAdvanced,
}: FieldEditorProps): React.JSX.Element => {
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState(field.name);
  const [type, setType] = React.useState<FieldType>(field.type as FieldType);
  const [fakerProvider, setFakerProvider] = React.useState(
    field.fakerProvider ?? "",
  );
  const [nullable, setNullable] = React.useState(field.nullable);

  const selectedProvider = fakerProvider
    ? getProviderByValue(fakerProvider)
    : undefined;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Field name cannot be empty");
      return;
    }
    setLoading(true);
    try {
      const updatedFields = allFields.map((f) =>
        f.id === field.id
          ? {
              ...f,
              name: name.trim(),
              type: type as SchemaField["type"],
              fakerProvider: fakerProvider || undefined,
              nullable,
            }
          : f,
      );
      const updated = await updateRoute({
        id: route.id,
        responseSchema: JSON.stringify(synthesizeSchema(updatedFields)),
      });
      onRouteUpdated(updated);
      toast.success("Field updated");
    } catch {
      toast.error("Failed to save field");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      const updated = await removeFieldFromRoute(route.id, field.id);
      onRouteUpdated(updated);
      onBack();
      toast.success(`Field "${field.name}" removed`);
    } catch {
      toast.error("Failed to remove field");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border/60 flex shrink-0 items-center justify-between border-b px-3 py-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring flex size-8 items-center justify-center rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
            aria-label="Back to route inspection"
          >
            <RiArrowLeftSLine className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-foreground text-xs font-semibold">
              Field Property Editor
            </h2>
            <span className="text-muted-foreground text-mini font-mono">
              {route.method} {route.path}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="scrollbar-subtle min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Field Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="field-name"
            className="text-muted-foreground text-mini block font-bold tracking-wider uppercase"
          >
            Field Name
          </label>
          <Input
            id="field-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="fieldName"
            variant="mono"
            className="h-8 text-xs"
            disabled={loading}
          />
        </div>

        {/* Data Type */}
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-mini block font-bold tracking-wider uppercase">
            Data Type
          </span>
          <fieldset
            aria-label="Data type"
            className="m-0 flex flex-wrap gap-1 border-0 p-0"
          >
            {FIELD_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => setType(t)}
                disabled={loading}
                className={cn(
                  "h-7 min-w-10 rounded-md border px-2.5 font-mono text-caption font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  type === t
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </fieldset>
        </div>

        {/* Faker Provider */}
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-mini block font-bold tracking-wider uppercase">
            Mock Data Provider
          </span>
          <FakerProviderSelect
            value={fakerProvider}
            onValueChange={setFakerProvider}
            disabled={loading || type === "object" || type === "array"}
          />
          {selectedProvider && (
            <p className="text-muted-foreground text-mini font-mono leading-snug">
              Example:{" "}
              <span className="text-foreground">
                {selectedProvider.example}
              </span>
            </p>
          )}
        </div>

        {/* Nullable */}
        <div className="flex items-center justify-between pt-1">
          <label
            htmlFor="field-nullable"
            className="text-foreground cursor-pointer text-xs font-medium"
          >
            Nullable
          </label>
          <Switch
            id="field-nullable"
            checked={nullable}
            onCheckedChange={setNullable}
            disabled={loading}
            aria-label="Allow null values"
          />
        </div>

        {/* Advanced settings link */}
        <div className="border-border/40 border-t pt-3">
          <button
            type="button"
            onClick={onOpenAdvanced}
            className="text-muted-foreground hover:text-primary focus-visible:ring-ring flex items-center gap-1.5 rounded-sm text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
          >
            <RiSettings2Line className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Advanced settings (chaos, headers…)</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-border/60 flex shrink-0 items-center justify-between border-t px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={loading}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
          aria-label={`Remove field ${field.name}`}
        >
          {loading ? (
            <RiLoader2Line
              className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <RiDeleteBin6Line className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>Remove</span>
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="text-xs"
          aria-label="Save field changes"
        >
          {loading ? (
            <RiLoader2Line
              className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <RiSaveLine className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>Save</span>
        </Button>
      </div>
    </div>
  );
};

interface RouteEditorProps {
  route: Route;
  onRouteUpdated: (updatedRoute: Route) => void;
  onRouteDeleted?: (routeId: string) => void;
  onSelectField: (fieldId: string) => void;
  onDeselect: () => void;
  onOpenAdvanced: () => void;
}

const RouteEditor = ({
  route,
  onRouteUpdated,
  onRouteDeleted,
  onSelectField,
  onDeselect,
  onOpenAdvanced,
}: RouteEditorProps): React.JSX.Element => {
  const [loading, setLoading] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [method, setMethod] = React.useState<HttpMethod>(
    (route.method.toUpperCase() as HttpMethod) || "GET",
  );
  const [path, setPath] = React.useState(route.path);
  const [statusCode, setStatusCode] = React.useState<number>(
    route.statusCode || 200,
  );
  const [latency, setLatency] = React.useState<number>(route.latencyMin || 0);

  // Parse fields from schema
  const routeResponseSchema = route.responseSchema;
  const fields: SchemaField[] = React.useMemo(() => {
    try {
      const parsed = JSON.parse(routeResponseSchema ?? "{}");
      return parseSchemaToFields(parsed);
    } catch {
      return [];
    }
  }, [routeResponseSchema]);

  const handleClearAllFields = async (): Promise<void> => {
    setLoading(true);
    try {
      const updated = await clearFieldsFromRoute(route.id);
      onRouteUpdated(updated);
      toast.success("All schema fields cleared");
    } catch {
      toast.error("Failed to clear fields");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFieldDirect = async (
    fieldId: string,
    fieldName: string,
    e: React.MouseEvent,
  ): Promise<void> => {
    e.stopPropagation();
    try {
      const updated = await removeFieldFromRoute(route.id, fieldId);
      onRouteUpdated(updated);
      toast.success(`Field "${fieldName}" removed`);
    } catch {
      toast.error("Failed to remove field");
    }
  };

  const handleDeleteRoute = async (): Promise<void> => {
    setIsDeleting(true);
    try {
      await deleteRoute(route.id);
      onRouteDeleted?.(route.id);
      window.dispatchEvent(
        new CustomEvent("canvas-route-deleted", {
          detail: { routeId: route.id },
        }),
      );
      toast.success("Route deleted");
    } catch {
      toast.error("Failed to delete route");
      setIsDeleting(false);
    }
  };

  const handleSaveRoute = async () => {
    if (!path.trim()) {
      toast.error("Path cannot be empty");
      return;
    }
    setLoading(true);
    try {
      const updated = await updateRoute({
        id: route.id,
        method,
        path: path.trim(),
        statusCode,
        latencyMin: latency,
        latencyMax: latency,
      });
      onRouteUpdated(updated);
      toast.success("Route updated");
    } catch {
      toast.error("Failed to update route");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border/60 flex shrink-0 items-center justify-between border-b px-3 py-3">
        <div className="flex items-center gap-1.5">
          <RiPulseLine className="text-primary h-4 w-4" aria-hidden="true" />
          <h2 className="text-foreground text-xs font-semibold">
            Route Node Inspector
          </h2>
        </div>
        <button
          type="button"
          onClick={onDeselect}
          className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring flex size-7 items-center justify-center rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
          title="Deselect route"
          aria-label="Deselect route"
        >
          <RiCloseLine className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <div className="scrollbar-subtle min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Method */}
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-mini block font-bold tracking-wider uppercase">
            HTTP Method
          </span>
          <div className="flex flex-wrap gap-1">
            {HTTP_METHODS.map((m) => {
              const isSelected = method === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 font-mono text-caption font-bold tracking-wider uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    isSelected
                      ? "bg-foreground text-background shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Path */}
        <div className="space-y-1.5">
          <label
            htmlFor="route-path"
            className="text-muted-foreground text-mini block font-bold tracking-wider uppercase"
          >
            Path
          </label>
          <Input
            id="route-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/api/v1/resource"
            variant="mono"
            className="h-8 text-xs"
            disabled={loading}
          />
        </div>

        {/* Status Code & Latency */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label
              htmlFor="route-status"
              className="text-muted-foreground text-mini block font-bold tracking-wider uppercase"
            >
              Status Code
            </label>
            <Input
              id="route-status"
              type="number"
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value) || 200)}
              variant="mono"
              className="h-8 text-xs"
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="route-latency"
              className="text-muted-foreground text-mini block font-bold tracking-wider uppercase"
            >
              Delay (ms)
            </label>
            <Input
              id="route-latency"
              type="number"
              value={latency}
              onChange={(e) => setLatency(Number(e.target.value) || 0)}
              variant="mono"
              className="h-8 text-xs"
              disabled={loading}
            />
          </div>
        </div>

        {/* Attached Fields */}
        <div className="border-border/50 space-y-2 border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-mini font-bold tracking-wider uppercase">
              Route Fields ({fields.length})
            </span>
            {fields.length > 0 && (
              <button
                type="button"
                onClick={() => void handleClearAllFields()}
                disabled={loading}
                className="text-muted-foreground hover:text-destructive text-mini font-medium transition-colors"
                title="Remove all fields from this route"
              >
                Clear all
              </button>
            )}
          </div>

          {fields.length === 0 ? (
            <div className="bg-muted/30 border-border/60 rounded-md border p-3 text-center">
              <p className="text-muted-foreground text-caption leading-snug">
                No mock fields on this route yet. Drag a provider from the left
                sidebar onto this route.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {fields.map((f) => (
                <div
                  key={f.id}
                  className="bg-card hover:border-border border-border/60 group flex items-center justify-between rounded-md border p-2 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onSelectField(f.id)}
                    className="flex min-w-0 flex-1 flex-col text-left focus-visible:outline-hidden"
                  >
                    <span className="text-foreground group-hover:text-primary truncate font-mono text-xs font-semibold transition-colors">
                      {f.name}
                    </span>
                    <span className="text-muted-foreground text-mini truncate font-mono">
                      {f.fakerProvider || f.type}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectField(f.id)}
                      className="text-primary hover:text-primary/80 text-mini px-1 py-0.5 font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) =>
                        void handleRemoveFieldDirect(f.id, f.name, e)
                      }
                      className="text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded p-1 transition-colors"
                      title={`Remove field "${f.name}"`}
                      aria-label={`Remove field ${f.name}`}
                    >
                      <RiDeleteBin6Line
                        className="size-3.5"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Drawer Trigger */}
        <div className="border-border/40 border-t pt-3">
          <button
            type="button"
            onClick={onOpenAdvanced}
            className="text-muted-foreground hover:text-primary focus-visible:ring-ring flex items-center gap-1.5 rounded-sm text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
          >
            <RiSettings2Line className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Chaos rules & headers drawer…</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-border/60 flex shrink-0 items-center justify-between border-t px-4 py-3">
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="destructive"
              size="xs"
              onClick={() => void handleDeleteRoute()}
              disabled={isDeleting || loading}
            >
              {isDeleting ? (
                <RiLoader2Line className="size-3 animate-spin motion-reduce:animate-none" />
              ) : (
                "Confirm Delete"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setConfirmDelete(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={loading}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
            aria-label="Delete this route"
          >
            <RiDeleteBin6Line className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Delete Route</span>
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          onClick={handleSaveRoute}
          disabled={loading || !path.trim()}
          className="text-xs"
          aria-label="Save route changes"
        >
          {loading ? (
            <RiLoader2Line
              className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <RiSaveLine className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>Save Route</span>
        </Button>
      </div>
    </div>
  );
};

const IdleInspector = ({
  activeRoutesCount,
}: {
  activeRoutesCount: number;
}): React.JSX.Element => {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border/60 flex shrink-0 items-center border-b px-4 py-3">
        <h2 className="text-foreground text-xs font-semibold">
          Node Inspector
        </h2>
      </div>

      {/* Empty State Body */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="bg-muted/40 border-border/60 mb-3 flex size-12 items-center justify-center rounded-xl border">
          <RiNodeTree
            className="text-muted-foreground size-6"
            aria-hidden="true"
          />
        </div>
        <h3 className="text-foreground text-xs font-semibold">
          No Node Selected
        </h3>
        <p className="text-muted-foreground text-caption mt-1.5 max-w-56 leading-relaxed">
          Click a route&apos;s pencil button to inspect and edit its properties,
          or click a field badge to edit that field&apos;s type and mock
          provider.
        </p>

        <div className="bg-muted/30 border-border/50 mt-6 w-full rounded-lg border p-3 text-left">
          <div className="text-caption flex items-center justify-between">
            <span className="text-muted-foreground">Active Canvas Routes</span>
            <span className="text-foreground font-mono font-semibold">
              {activeRoutesCount}
            </span>
          </div>
          <div className="text-muted-foreground text-mini mt-2 flex items-center gap-1.5">
            <RiSparklingLine className="text-primary size-3 shrink-0" />
            <span>Drag providers from the left sidebar onto any route.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Permanently visible Right Sidebar Node Inspector.
 *
 * Dedicated strictly to inspecting and editing node and field values on the canvas.
 * Handles three clean states:
 * 1. Field Node Editor (when a field badge is clicked)
 * 2. Route Node Editor (when a route's pencil button is clicked)
 * 3. Idle Inspector (when no node is explicitly opened for editing)
 */
export const NodeInspector = ({
  route,
  inspectedFieldId,
  activeRoutesCount,
  onRouteUpdated,
  onRouteDeleted,
  onOpenAdvanced,
  onCloseInspector,
}: NodeInspectorProps): React.JSX.Element => {
  const setInspectedField = useCanvasDndStore((s) => s.setInspectedField);

  // Parse fields for route
  const activeResponseSchema = route?.responseSchema;
  const fields: SchemaField[] = React.useMemo(() => {
    if (!activeResponseSchema) return [];
    try {
      const parsed = JSON.parse(activeResponseSchema);
      return parseSchemaToFields(parsed);
    } catch {
      return [];
    }
  }, [activeResponseSchema]);

  // Find inspected field
  const inspectedField = React.useMemo(() => {
    if (!inspectedFieldId) return null;
    return fields.find((f) => f.id === inspectedFieldId) ?? null;
  }, [fields, inspectedFieldId]);

  if (route && inspectedField) {
    return (
      <FieldEditor
        key={inspectedField.id}
        field={inspectedField}
        allFields={fields}
        route={route}
        onRouteUpdated={onRouteUpdated}
        onBack={() => setInspectedField(null)}
        onOpenAdvanced={onOpenAdvanced}
      />
    );
  }

  if (route) {
    return (
      <RouteEditor
        key={route.id}
        route={route}
        onRouteUpdated={onRouteUpdated}
        onRouteDeleted={onRouteDeleted}
        onSelectField={(fieldId) => setInspectedField(fieldId)}
        onDeselect={onCloseInspector}
        onOpenAdvanced={onOpenAdvanced}
      />
    );
  }

  return <IdleInspector activeRoutesCount={activeRoutesCount} />;
};

export default NodeInspector;
