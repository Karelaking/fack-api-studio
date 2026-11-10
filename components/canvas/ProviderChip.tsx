"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import * as PikaCore from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { cn } from "@/lib/utils";
import type { FakerProvider } from "@/lib/faker-registry";
import { getCategoryColor, getCategoryTint } from "@/lib/utils/category-colors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Cleanly extracts a concise human-readable specimen string for the compact chip preview.
 * For JSON objects (like airline, currency), extracts the primary descriptive name/symbol.
 */
function formatProviderPreview(example: string): string {
  if (!example) {
    return "";
  }
  const trimmed = example.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === "object" && parsed !== null) {
        const record = parsed as Record<string, unknown>;
        if (typeof record.name === "string") {
          return record.name;
        }
        if (typeof record.label === "string") {
          return record.label;
        }
        if (typeof record.symbol === "string") {
          return record.symbol;
        }
        const firstVal = Object.values(record)[0];
        if (typeof firstVal === "string" || typeof firstVal === "number") {
          return String(firstVal);
        }
      }
    } catch {
      const match = trimmed.match(/"(?:name|label|symbol)"\s*:\s*"([^"]+)"/);
      if (match?.[1]) {
        return match[1];
      }
    }
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

interface ProviderChipProps {
  provider: FakerProvider;
  /** Whether a route is currently selected (enables keyboard shortcut adding). */
  isRouteSelected: boolean;
  /** Called when chip is activated via keyboard when a route is selected. */
  onKeyboardAdd: (providerValue: string) => void;
}

/**
 * Individual draggable Faker provider chip rendered in the Provider Palette.
 *
 * UX behaviours:
 * - Drag -> drop onto a RouteNode card to append a field.
 * - Space/Enter when a route is selected -> adds the field directly (no drag).
 * - Hover tooltip shows the specimen example value and category token.
 */
export const ProviderChip = React.memo(
  ({
    provider,
    isRouteSelected,
    onKeyboardAdd,
  }: ProviderChipProps): React.JSX.Element => {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
      useDraggable({
        id: `provider-${provider.value}`,
        data: {
          type: "provider",
          value: provider.value,
          label: provider.label,
          category: provider.category,
        },
      });

    const categoryColor = getCategoryColor(provider);

    const style: React.CSSProperties = {
      transform: CSS.Translate.toString(transform),
      opacity: isDragging ? 0.45 : 1,
      zIndex: isDragging ? 9999 : undefined,
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
      if ((e.key === " " || e.key === "Enter") && isRouteSelected) {
        e.preventDefault();
        e.stopPropagation();
        onKeyboardAdd(provider.value);
        return;
      }
      // Let dnd-kit handle other navigation keys
      const dndKeyDown = listeners?.onKeyDown as
        | ((event: React.KeyboardEvent<HTMLButtonElement>) => void)
        | undefined;
      dndKeyDown?.(e);
    };

    const handleClick = (): void => {
      if (isRouteSelected) {
        onKeyboardAdd(provider.value);
      }
    };

    const accessibleLabel = isRouteSelected
      ? `Add ${provider.label} (${provider.category}) to selected route. Press Space or Enter to insert.`
      : `${provider.label} (${provider.category}) provider. Drag onto canvas route to add.`;

    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              ref={setNodeRef}
              type="button"
              style={style}
              onClick={handleClick}
              className={cn(
                "group bg-card border-border/70 relative flex min-h-12 w-full flex-col justify-between rounded-lg border p-2 text-left",
                "transition-[border-color,background-color,box-shadow,transform] duration-150 motion-reduce:transition-none",
                "hover:border-primary/50 hover:bg-primary/3",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                "active:scale-[0.98]",
                isRouteSelected
                  ? "cursor-pointer hover:border-primary/60 hover:ring-1 hover:ring-primary/20"
                  : "cursor-grab active:cursor-grabbing",
                isDragging &&
                  "border-primary/70 bg-primary/10 shadow-lg shadow-primary/10",
              )}
              aria-label={accessibleLabel}
              aria-grabbed={isDragging}
              {...listeners}
              {...attributes}
              onKeyDown={handleKeyDown}
            />
          }
        >
          {/* Top row: Category indicator + Field name + Quick add / Drag handle */}
          <div className="flex w-full items-center justify-between gap-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {/* Category Color Dot */}
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: categoryColor }}
                aria-hidden="true"
              />
              {/* Field Label */}
              <span className="text-foreground truncate text-xs leading-tight font-semibold">
                {provider.label}
              </span>
            </div>

            {/* Trailing indicator: "+ Add" badge if route selected, subtle drag grip otherwise */}
            {isRouteSelected ? (
              <span
                aria-hidden="true"
                className="bg-primary/15 text-primary inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-bold tracking-wider whitespace-nowrap uppercase opacity-0 transition-[opacity,transform] duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <PikaIcon
                  icon={PikaCore.PlusIcon}
                  size={10}
                  className="shrink-0"
                  aria-hidden="true"
                />
                <span>Add</span>
              </span>
            ) : (
              <PikaIcon
                icon={PikaCore.ThreeDotsMenuVerticalIcon}
                size={14}
                aria-hidden="true"
                className="text-muted-foreground/40 group-hover:text-muted-foreground/80 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              />
            )}
          </div>

          {/* Bottom row: Specimen example preview (full-width for maximum visibility) */}
          <div className="mt-1 flex w-full items-center overflow-hidden">
            <span className="text-muted-foreground block w-full truncate font-mono text-xs leading-tight">
              {formatProviderPreview(provider.example)}
            </span>
          </div>
        </TooltipTrigger>

        <TooltipContent
          side="right"
          sideOffset={8}
          className={cn(
            "w-64 flex flex-col items-stretch gap-2 rounded-lg p-2.5 text-xs select-none",
            "bg-popover text-popover-foreground border-border/80 border shadow-lg backdrop-blur-md",
            "*:data-side:bg-popover *:data-side:border-border/80 *:data-side:border-b *:data-side:border-l",
          )}
        >
          {/* Row 1: Indicator dot + Field Label + Category Pill */}
          <div className="border-border/50 flex w-full items-center justify-between gap-1.5 border-b pb-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: categoryColor }}
                aria-hidden="true"
              />
              <span className="text-foreground truncate text-xs leading-tight font-semibold">
                {provider.label}
              </span>
            </div>
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-xs font-medium"
              style={{
                color: categoryColor,
                backgroundColor: getCategoryTint(provider, 12),
              }}
            >
              {provider.category}
            </span>
          </div>

          {/* Row 2: Callable API Method Signature */}
          <code className="text-primary bg-muted/80 border-border/40 block w-full truncate rounded border px-2 py-1 font-mono text-xs font-medium select-all">
            faker.{provider.value}()
          </code>

          {/* Row 3: Specimen Output Row */}
          <div className="bg-muted/40 border-border/40 flex w-full items-center justify-between gap-1.5 rounded border px-2 py-1 font-mono text-xs">
            <span className="text-muted-foreground/80 shrink-0 font-sans text-xs font-semibold tracking-wider uppercase">
              Sample
            </span>
            <span className="text-foreground truncate text-right font-medium select-all">
              {formatProviderPreview(provider.example)}
            </span>
          </div>

          {/* Row 4: Footer interaction shortcut */}
          <div className="border-border/40 text-muted-foreground border-t pt-1.5 text-xs">
            {isRouteSelected ? (
              <span className="text-primary flex items-center gap-1 font-medium">
                <PikaIcon
                  icon={PikaCore.PlusIcon}
                  size={12}
                  className="shrink-0"
                  aria-hidden="true"
                />
                Press Space/Enter to insert
              </span>
            ) : (
              <span className="text-muted-foreground/80 flex items-center gap-1">
                <PikaIcon
                  icon={PikaCore.ThreeDotsMenuVerticalIcon}
                  size={12}
                  className="text-muted-foreground/60 shrink-0"
                  aria-hidden="true"
                />
                Drag onto canvas route
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  },
);

ProviderChip.displayName = "ProviderChip";

export default ProviderChip;
