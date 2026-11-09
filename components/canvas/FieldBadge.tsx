"use client";

import * as React from "react";
import { RiCloseLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
import type { SchemaField } from "@/lib/schema-synthesizer";
import { getProviderByValue } from "@/lib/faker-registry";
import { useCanvasDndStore } from "@/stores/canvas-dnd-store-provider";

/** Category color palette — maps category prefix to a CSS custom property. */
const CATEGORY_HUES: Record<string, string> = {
  person: "var(--method-get)",
  internet: "var(--info)",
  finance: "var(--method-patch)",
  location: "var(--method-put)",
  date: "var(--chart-5)",
  commerce: "var(--method-post)",
  company: "var(--chart-4)",
  image: "var(--chart-3)",
  system: "var(--muted-foreground)",
  string: "var(--muted-foreground)",
  number: "var(--muted-foreground)",
  datatype: "var(--chart-2)",
};

function getFieldColor(fakerProvider?: string): string {
  if (!fakerProvider) return "var(--muted-foreground)";
  const prefix = fakerProvider.split(".")[0]?.toLowerCase() ?? "";
  return CATEGORY_HUES[prefix] ?? "var(--primary)";
}

interface FieldBadgeProps {
  field: SchemaField;
  /** The route that owns this field, used to open its inspector. */
  routeId: string;
  /** Opens the node inspector for the owning route. */
  onOpenEdit: (routeId: string) => void;
  /** Callback to remove the field from the route. */
  onRemove: (fieldId: string) => void;
}

/**
 * Inline field pill rendered inside a RouteNode card body.
 *
 * Click -> opens the node inspector on this specific field.
 * ✕ button -> removes the field from the route schema.
 */
export const FieldBadge = ({
  field,
  routeId,
  onOpenEdit,
  onRemove,
}: FieldBadgeProps): React.JSX.Element => {
  const setInspectedField = useCanvasDndStore((s) => s.setInspectedField);
  const inspectedFieldId = useCanvasDndStore((s) => s.inspectedFieldId);

  const isInspected = inspectedFieldId === field.id;
  const color = getFieldColor(field.fakerProvider);

  const provider = field.fakerProvider
    ? getProviderByValue(field.fakerProvider)
    : undefined;

  const handleClickBadge = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't bubble to RouteNode selection
    // Explicitly open the inspector: a badge click is an edit intent, unlike a
    // plain node click which only targets the route for drag-and-drop.
    onOpenEdit(routeId);
    setInspectedField(isInspected ? null : field.id);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(field.id);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-md border px-1.5 py-0.5 transition-all duration-150",
        isInspected
          ? "border-primary/50 bg-primary/8"
          : "border-border/50 bg-muted/40 hover:border-border hover:bg-muted/70",
      )}
    >
      {/* Color dot indicating provider category */}
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />

      {/* Field name — click to inspect */}
      <button
        type="button"
        onClick={handleClickBadge}
        className={cn(
          "text-left font-mono text-mini font-medium transition-colors",
          isInspected ? "text-primary" : "text-foreground",
          "hover:text-primary",
        )}
        aria-label={`Inspect field ${field.name}`}
        aria-pressed={isInspected}
      >
        {field.name}
      </button>

      {/* Provider shortname */}
      {provider && (
        <span className="text-muted-foreground text-micro font-mono">
          {provider.label}
        </span>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={handleRemove}
        className={cn(
          "text-muted-foreground/60 hover:text-destructive ml-0.5 shrink-0 rounded transition-all",
          "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
        aria-label={`Remove field ${field.name}`}
      >
        <RiCloseLine className="h-2.5 w-2.5" aria-hidden="true" />
      </button>
    </div>
  );
};

export default FieldBadge;
