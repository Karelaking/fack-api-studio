"use client";

import * as React from "react";
import { NodeResizer } from "@xyflow/react";
import * as PikaCore from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PikaiconRenderer } from "./HugeiconRenderer";
import { EndpointGroupCustomizer } from "./EndpointGroupCustomizer";
import type { Endpoint } from "@/db/schema";

interface EndpointGroupNodeProps {
  data: {
    id?: string;
    label: string;
    basePath: string;
    color?: string;
    icon?: string;
    routesCount?: number;
    onUpdateGroup?: (updated: Endpoint) => void;
    onDeleteGroup?: (endpointId: string) => void;
    /** Present when the group only exists in an unapplied agent draft. */
    draft?: { order: number };
  };
  selected: boolean;
}

/**
 * Premium Custom Bounding Container Node for Endpoints.
 * Uses a grid background style, glass header, and dashed glowing border to group routes cleanly.
 * Supports custom colors and Pikaicons (pikaicons.com) integration with 1-click customization dialog.
 */
export const EndpointGroupNode = ({
  data,
  selected,
}: EndpointGroupNodeProps): React.JSX.Element => {
  const [isCustomizerOpen, setIsCustomizerOpen] = React.useState(false);

  const hasCustomColor = Boolean(data.color && data.color.trim() !== "");
  const customColor = hasCustomColor ? data.color : undefined;

  const handleOpenCustomizer = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setIsCustomizerOpen(true);
  };

  const handleUpdated = (updated: {
    id: string;
    name: string;
    basePath: string;
    color: string;
    icon: string;
  }): void => {
    if (data.onUpdateGroup) {
      data.onUpdateGroup({
        id: updated.id,
        name: updated.name,
        basePath: updated.basePath,
        color: updated.color,
        icon: updated.icon,
      } as Endpoint);
    }
  };

  const handleDeleted = (endpointId: string): void => {
    if (data.onDeleteGroup) {
      data.onDeleteGroup(endpointId);
    }
  };

  return (
    <div
      className={cn(
        "relative h-full w-full rounded-xl border-2 border-dashed p-4 transition-all duration-300",
        "bg-card/60 dark:bg-muted/5",
        selected
          ? "border-primary/70 bg-card/95 dark:bg-muted/10 shadow-primary/10 shadow-lg"
          : "border-border/80 hover:border-muted-foreground/40",
        data.draft &&
          "agent-draft-enter border-primary/50 bg-primary/5 ring-primary/15 ring-2",
      )}
      style={{
        ...(data.draft
          ? { animationDelay: `${data.draft.order * 70}ms` }
          : undefined),
        ...(customColor
          ? {
              borderColor: selected
                ? customColor
                : `color-mix(in oklch, ${customColor} 50%, transparent)`,
              boxShadow: selected
                ? `0 0 16px color-mix(in oklch, ${customColor} 25%, transparent)`
                : undefined,
            }
          : undefined),
      }}
    >
      {data.draft ? (
        <span className="border-primary/40 bg-primary/10 text-primary text-mini absolute top-3 right-3 z-10 rounded-full border px-2 py-0.5 font-bold tracking-wider uppercase">
          Draft
        </span>
      ) : null}

      {/* Consistent dot pattern matching React Flow background */}
      <div className="absolute inset-0 -z-10 opacity-20 dark:opacity-10">
        <div
          className="h-full w-full rounded-lg"
          style={{
            backgroundImage: `
            radial-gradient(circle, var(--muted-foreground) 1px, transparent 1px)
          `,
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      {/* NodeResizer for scaling bounding containers */}
      <NodeResizer
        minWidth={280}
        minHeight={160}
        isVisible={selected}
        lineClassName={customColor ? undefined : "border-primary"}
        handleClassName={cn(
          "h-3.5 w-3.5 rounded-full border-2 bg-background shadow-xs hover:scale-110 transition-transform",
          customColor ? "" : "border-primary",
        )}
      />

      {/* Group Header: Icon, Name, Base Path, and Customizer Button */}
      <div className="border-border/60 mb-4 flex shrink-0 items-center justify-between border-b pb-2">
        <div className="flex min-w-0 items-center gap-2">
          {/* Custom Hugeicon Badge */}
          <div
            className="flex size-7 shrink-0 items-center justify-center rounded-lg border transition-all"
            style={{
              borderColor: customColor
                ? `color-mix(in oklch, ${customColor} 50%, transparent)`
                : "var(--color-border)",
              backgroundColor: customColor
                ? `color-mix(in oklch, ${customColor} 18%, transparent)`
                : "var(--color-primary)/10",
              color: customColor || "var(--color-primary)",
            }}
          >
            <PikaiconRenderer
              name={data.icon || "FolderIcon"}
              size={15}
              color={customColor}
            />
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground text-mini truncate font-extrabold tracking-wider uppercase">
                {data.label}
              </span>
              {customColor && (
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: customColor }}
                  aria-hidden="true"
                />
              )}
            </div>
            <span className="text-muted-foreground text-micro truncate font-mono">
              {data.basePath || "/"}
            </span>
          </div>
        </div>

        {/* Action Button: Customize Group Color & Icon */}
        {!data.draft && data.id && (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={handleOpenCustomizer}
            onPointerDown={(e) => e.stopPropagation()}
            className="hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 rounded-md transition-colors"
            title="Customize Group Color & Icon"
            aria-label={`Customize endpoint group ${data.label}`}
          >
            <PikaIcon
              icon={PikaCore.PaintBrushIcon}
              size={14}
              aria-hidden="true"
            />
          </Button>
        )}
      </div>

      {/* Customizer Dialog */}
      {!data.draft && data.id && (
        <EndpointGroupCustomizer
          endpoint={{
            id: data.id,
            name: data.label,
            basePath: data.basePath,
            color: data.color,
            icon: data.icon,
            routesCount: data.routesCount,
          }}
          open={isCustomizerOpen}
          onOpenChange={setIsCustomizerOpen}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
};

export default React.memo(EndpointGroupNode);
