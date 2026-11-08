"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { FakerProvider } from "@/lib/faker-registry";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
 * - Hover tooltip shows the live example value.
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
        },
      });

    const style: React.CSSProperties = {
      transform: CSS.Translate.toString(transform),
      opacity: isDragging ? 0.4 : 1,
      zIndex: isDragging ? 9999 : undefined,
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if ((e.key === " " || e.key === "Enter") && isRouteSelected) {
        e.preventDefault();
        e.stopPropagation();
        onKeyboardAdd(provider.value);
        return;
      }
      // Let dnd-kit handle other keys
      const dndKeyDown = listeners?.onKeyDown as
        | ((event: React.KeyboardEvent<HTMLButtonElement>) => void)
        | undefined;
      dndKeyDown?.(e);
    };

    const handleClick = () => {
      if (isRouteSelected) {
        onKeyboardAdd(provider.value);
      }
    };

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
                "group bg-card border-border/70 hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98] relative flex min-h-11 w-full cursor-grab touch-action-none flex-col justify-between rounded-lg border p-2 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isDragging &&
                  "border-primary/60 bg-primary/8 shadow-primary/10 shadow-lg scale-95",
                isRouteSelected &&
                  "hover:ring-primary/20 hover:ring-1 cursor-pointer",
              )}
              aria-label={
                isRouteSelected
                  ? `Add ${provider.label} to selected route`
                  : `${provider.label} provider, drag to add`
              }
              title={
                isRouteSelected
                  ? `Click or press Space/Enter to add ${provider.label}`
                  : `Drag to add ${provider.label}`
              }
              {...listeners}
              {...attributes}
              onKeyDown={handleKeyDown}
            />
          }
        >
          {/* Field name */}
          <span className="text-foreground line-clamp-1 text-xs leading-tight font-semibold">
            {provider.label}
          </span>

          {/* Example value preview */}
          <span className="text-muted-foreground line-clamp-1 font-mono text-[10px] leading-tight">
            {provider.example.length > 22
              ? `${provider.example.slice(0, 22)}…`
              : provider.example}
          </span>

          {/* Shortcut hint badge when route selected */}
          {isRouteSelected && (
            <span
              aria-hidden="true"
              className="bg-primary/15 text-primary absolute top-1.5 right-1.5 translate-x-1 rounded px-1 py-0.5 text-[9px] font-bold tracking-wider uppercase opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100"
            >
              + Add
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-56 text-xs"
          sideOffset={8}
        >
          <p className="font-semibold">{provider.label}</p>
          <p className="text-muted-foreground font-mono text-[11px]">
            {provider.value}
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Example: <span className="text-foreground">{provider.example}</span>
          </p>
        </TooltipContent>
      </Tooltip>
    );
  },
);

ProviderChip.displayName = "ProviderChip";

export default ProviderChip;
