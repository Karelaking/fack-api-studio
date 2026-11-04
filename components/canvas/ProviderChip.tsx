"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { FakerProvider } from "@/lib/faker-registry";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProviderChipProps {
  provider: FakerProvider;
  /** Whether a route is currently selected (enables keyboard shortcut adding). */
  routeSelected: boolean;
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
export const ProviderChip = ({
  provider,
  routeSelected,
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
    if ((e.key === " " || e.key === "Enter") && routeSelected) {
      e.preventDefault();
      onKeyboardAdd(provider.value);
    }
  };

  const handleClick = () => {
    if (routeSelected) {
      onKeyboardAdd(provider.value);
    }
  };

  return (
    <TooltipProvider delay={400}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              ref={setNodeRef}
              type="button"
              style={style}
              onClick={handleClick}
              className={cn(
                "group bg-card border-border/70 hover:border-primary/50 hover:bg-primary/5 relative flex min-h-14.5 w-full cursor-grab flex-col justify-between rounded-lg border p-2 text-left transition-all duration-150 active:cursor-grabbing",
                isDragging &&
                  "border-primary/60 bg-primary/8 shadow-primary/10 shadow-lg",
                routeSelected &&
                  "ring-primary/0 hover:ring-primary/20 hover:ring-1 cursor-pointer",
              )}
              aria-label={`Add ${provider.label} to selected route`}
              title={
                routeSelected
                  ? `Click or press Space/Enter to add ${provider.label}`
                  : `Drag to add ${provider.label}`
              }
              onKeyDown={handleKeyDown}
              {...listeners}
              {...attributes}
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
          {routeSelected && (
            <span
              aria-hidden="true"
              className="bg-primary/15 text-primary py-0.2 absolute top-1 right-1 rounded px-1 text-[9px] font-bold tracking-wider uppercase opacity-0 transition-opacity group-hover:opacity-100"
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
    </TooltipProvider>
  );
};

export default ProviderChip;
