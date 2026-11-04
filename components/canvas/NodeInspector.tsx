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
import { updateRoute } from "@/lib/actions/routes";
import { removeFieldFromRoute } from "@/lib/actions/canvas-dnd";
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
  /** Called to open the full advanced EditBar sheet. */
  onOpenAdvanced: () => void;
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
            className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
            aria-label="Back to route inspection"
          >
            <RiArrowLeftSLine className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-foreground text-xs font-semibold">
              Field Property Editor
            </h2>
            <span className="text-muted-foreground font-mono text-[10px]">
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
            className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase"
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
          <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
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
                  "h-6 rounded-md border px-2 font-mono text-[10px] font-semibold transition-colors",
                  type === t
                    ? "border-primary bg-primary text-primary-foreground"
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
          <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
            Mock Data Provider
          </span>
          <FakerProviderSelect
            value={fakerProvider}
            onValueChange={setFakerProvider}
            disabled={loading || type === "object" || type === "array"}
          />
          {selectedProvider && (
            <p className="text-muted-foreground font-mono text-[10px] leading-snug">
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
            className="text-muted-foreground hover:text-primary flex items-center gap-1.5 text-xs font-medium transition-colors"
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
              className="h-3.5 w-3.5 animate-spin"
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
              className="h-3.5 w-3.5 animate-spin"
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
  onSelectField: (fieldId: string) => void;
  onDeselect: () => void;
  onOpenAdvanced: () => void;
}

const RouteEditor = ({
  route,
  onRouteUpdated,
  onSelectField,
  onDeselect,
  onOpenAdvanced,
}: RouteEditorProps): React.JSX.Element => {
  const [loading, setLoading] = React.useState(false);
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
          className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
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
          <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
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
                  className={cn(
                    "rounded px-2 py-1 font-mono text-[10px] font-bold tracking-wider uppercase transition-colors",
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
            className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase"
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
              className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase"
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
              className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase"
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
            <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              Route Fields ({fields.length})
            </span>
          </div>

          {fields.length === 0 ? (
            <div className="bg-muted/30 border-border/60 rounded-md border p-3 text-center">
              <p className="text-muted-foreground text-[11px] leading-snug">
                No mock fields on this route yet. Drag a provider from the left
                sidebar onto this route.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {fields.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onSelectField(f.id)}
                  className="bg-card hover:border-primary/50 hover:bg-primary/5 border-border/60 flex w-full items-center justify-between rounded-md border p-2 text-left transition-colors"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="text-foreground truncate font-mono text-xs font-semibold">
                      {f.name}
                    </span>
                    <span className="text-muted-foreground truncate font-mono text-[10px]">
                      {f.fakerProvider || f.type}
                    </span>
                  </div>
                  <span className="text-primary text-[10px] font-semibold">
                    Edit →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Drawer Trigger */}
        <div className="border-border/40 border-t pt-3">
          <button
            type="button"
            onClick={onOpenAdvanced}
            className="text-muted-foreground hover:text-primary flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <RiSettings2Line className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Chaos rules & headers drawer…</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-border/60 flex shrink-0 items-center justify-end border-t px-4 py-3">
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
              className="h-3.5 w-3.5 animate-spin"
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
        <p className="text-muted-foreground mt-1.5 max-w-56 text-[11px] leading-relaxed">
          Click any route node or field badge on the canvas to inspect and edit
          its properties, types, and mock providers.
        </p>

        <div className="bg-muted/30 border-border/50 mt-6 w-full rounded-lg border p-3 text-left">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Active Canvas Routes</span>
            <span className="text-foreground font-mono font-semibold">
              {activeRoutesCount}
            </span>
          </div>
          <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-[10px]">
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
 * 2. Route Node Editor (when a route card is clicked)
 * 3. Idle Inspector (when no node is selected)
 */
export const NodeInspector = ({
  route,
  inspectedFieldId,
  activeRoutesCount,
  onRouteUpdated,
  onOpenAdvanced,
}: NodeInspectorProps): React.JSX.Element => {
  const setSelectedRoute = useCanvasDndStore((s) => s.setSelectedRoute);
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
        onSelectField={(fieldId) => setInspectedField(fieldId)}
        onDeselect={() => setSelectedRoute(null)}
        onOpenAdvanced={onOpenAdvanced}
      />
    );
  }

  return <IdleInspector activeRoutesCount={activeRoutesCount} />;
};

export default NodeInspector;
