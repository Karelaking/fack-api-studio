"use client";

import * as React from "react";
import * as PikaCore from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
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
import { extractRoutePathParameters } from "@/lib/services/route-param.service";
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

interface FieldInspectorProps {
  /** The route that owns this field. */
  route: Route;
  /** Called when the route's schema changes so the parent can sync state. */
  onRouteUpdated: (updatedRoute: Route) => void;
  /** Called to open the full advanced EditBar sheet. */
  onOpenAdvanced: () => void;
}

interface FieldInspectorFormProps {
  field: SchemaField;
  allFields: SchemaField[];
  route: Route;
  onRouteUpdated: (updatedRoute: Route) => void;
  onClose: () => void;
  onOpenAdvanced: () => void;
}

function FieldInspectorForm({
  field,
  allFields,
  route,
  onRouteUpdated,
  onClose,
  onOpenAdvanced,
}: FieldInspectorFormProps): React.JSX.Element {
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState(field.name);
  const [type, setType] = React.useState<FieldType>(field.type as FieldType);
  const [fakerProvider, setFakerProvider] = React.useState(
    field.fakerProvider ?? "",
  );
  const [nullable, setNullable] = React.useState(field.nullable);

  const availableParams = React.useMemo(
    () => extractRoutePathParameters(route.path),
    [route.path],
  );

  const [sourceType, setSourceType] = React.useState<"faker" | "pathParam">(
    field.source?.type === "pathParam" ? "pathParam" : "faker",
  );
  const [selectedParamName, setSelectedParamName] = React.useState<string>(
    field.source?.name || availableParams[0]?.name || "",
  );

  const selectedProvider = fakerProvider
    ? getProviderByValue(fakerProvider)
    : undefined;

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedFields = allFields.map((f) =>
        f.id === field.id
          ? {
              ...f,
              name,
              type: type as SchemaField["type"],
              source:
                sourceType === "pathParam" && selectedParamName
                  ? { type: "pathParam" as const, name: selectedParamName }
                  : undefined,
              fakerProvider:
                sourceType === "faker" ? fakerProvider || undefined : undefined,
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
      onClose();
      toast.success(`Field "${field.name}" removed`);
    } catch {
      toast.error("Failed to remove field");
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside
      className="bg-background border-border/60 flex h-full w-72 shrink-0 flex-col border-l"
      aria-label="Field inspector"
    >
      {/* ── Inspector header ─────────────────────────────────────── */}
      <div className="border-border/60 flex shrink-0 items-center gap-2 border-b px-3 py-3">
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground -ml-0.5 rounded p-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
          aria-label="Back to canvas"
        >
          <PikaIcon
            icon={PikaCore.ChevronLeftIcon}
            size={16}
            aria-hidden="true"
          />
        </button>
        <h2 className="text-foreground text-xs font-semibold">
          Field Inspector
        </h2>
      </div>

      {/* ── Inspector body ───────────────────────────────────────── */}
      <div className="scrollbar-subtle min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
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
                  "h-6 rounded-md border px-2 font-mono text-mini font-semibold transition-colors",
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

        {/* Field Value Source */}
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-mini block font-bold tracking-wider uppercase">
            Field Value Source
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              aria-pressed={sourceType === "pathParam"}
              onClick={() => setSourceType("pathParam")}
              disabled={loading}
              className={cn(
                "h-7 rounded-md border px-2 font-mono text-caption font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                sourceType === "pathParam"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              URL Parameter
            </button>
            <button
              type="button"
              aria-pressed={sourceType === "faker"}
              onClick={() => setSourceType("faker")}
              disabled={loading}
              className={cn(
                "h-7 rounded-md border px-2 font-mono text-caption font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                sourceType === "faker"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              Faker Provider
            </button>
          </div>
        </div>

        {sourceType === "pathParam" ? (
          <div className="space-y-1.5">
            <label
              htmlFor="field-inspector-param-name"
              className="text-muted-foreground text-mini block font-bold tracking-wider uppercase"
            >
              Select Route Parameter
            </label>
            {availableParams.length === 0 ? (
              <div className="border-warning/20 bg-warning/10 text-warning text-mini rounded-md border p-2">
                No parameters found in route path. Add a segment like{" "}
                <span className="font-mono font-bold">/:id</span> to the route
                path.
              </div>
            ) : (
              <select
                id="field-inspector-param-name"
                value={selectedParamName}
                onChange={(e) => setSelectedParamName(e.target.value)}
                disabled={loading}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-3 py-1 font-mono text-xs focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
              >
                {availableParams.map((p) => (
                  <option key={p.name} value={p.name}>
                    :{p.name} (from URL)
                  </option>
                ))}
              </select>
            )}
            <p className="text-muted-foreground text-mini leading-snug">
              Requests matching this route will return the dynamic URL value in
              this field.
            </p>
          </div>
        ) : (
          /* Faker Provider */
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
        )}

        {/* Nullable */}
        <div className="flex items-center justify-between">
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
            <PikaIcon
              icon={PikaCore.Settings01Icon}
              size={14}
              aria-hidden="true"
            />
            Advanced settings (chaos, headers, rules…)
          </button>
        </div>
      </div>

      {/* ── Inspector footer ─────────────────────────────────────── */}
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
            <PikaIcon
              icon={PikaCore.RefreshIcon}
              size={14}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <PikaIcon
              icon={PikaCore.DeleteDustbin01Icon}
              size={14}
              aria-hidden="true"
            />
          )}
          Remove
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
            <PikaIcon
              icon={PikaCore.RefreshIcon}
              size={14}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <PikaIcon icon={PikaCore.FloppyIcon} size={14} aria-hidden="true" />
          )}
          Save
        </Button>
      </div>
    </aside>
  );
}

/**
 * Right-side inspector panel for a single selected field.
 *
 * Opens when the user clicks a FieldBadge inside a RouteNode.
 * Closes when inspectedFieldId is null.
 */
export const FieldInspector = ({
  route,
  onRouteUpdated,
  onOpenAdvanced,
}: FieldInspectorProps): React.JSX.Element | null => {
  const inspectedFieldId = useCanvasDndStore((s) => s.inspectedFieldId);
  const setInspectedField = useCanvasDndStore((s) => s.setInspectedField);

  // Parse fields from route schema
  const fields: SchemaField[] = React.useMemo(() => {
    try {
      const parsed = JSON.parse(route.responseSchema ?? "{}");
      return parseSchemaToFields(parsed);
    } catch {
      return [];
    }
  }, [route.responseSchema]);

  // Find the inspected field
  const inspectedField = React.useMemo(
    () => fields.find((f) => f.id === inspectedFieldId) ?? null,
    [fields, inspectedFieldId],
  );

  if (!inspectedFieldId || !inspectedField) return null;

  return (
    <FieldInspectorForm
      key={inspectedField.id}
      field={inspectedField}
      allFields={fields}
      route={route}
      onRouteUpdated={onRouteUpdated}
      onClose={() => setInspectedField(null)}
      onOpenAdvanced={onOpenAdvanced}
    />
  );
};

export default FieldInspector;
