"use client";

import * as React from "react";
import {
  RiArrowLeftSLine,
  RiSaveLine,
  RiDeleteBin6Line,
  RiLoader2Line,
  RiSettings2Line,
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
          <RiArrowLeftSLine className="h-4 w-4" aria-hidden="true" />
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
            <RiSettings2Line className="h-3.5 w-3.5" aria-hidden="true" />
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
            <RiLoader2Line
              className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <RiDeleteBin6Line className="h-3.5 w-3.5" aria-hidden="true" />
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
            <RiLoader2Line
              className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <RiSaveLine className="h-3.5 w-3.5" aria-hidden="true" />
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
