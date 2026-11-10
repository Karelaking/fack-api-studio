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
 * Premium Architectural Bounding Container Node for Endpoints.
 * Features a docked glassmorphic header strip, custom Pikaicons branding badge,
 * live route counter, and dynamic accent theme integration following Fack Studio's Specimen Sheet design system.
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
        "group/endpoint-group relative h-full w-full rounded-2xl border transition-all duration-200",
        "bg-card/40 dark:bg-card/20 backdrop-blur-2xs",
        data.draft
          ? "border-primary/50 border-dashed bg-primary/5 ring-2 ring-primary/15 agent-draft-enter"
          : selected
            ? "border-primary/80 ring-2 ring-primary/30 shadow-lg shadow-primary/5"
            : "border-border/80 hover:border-border hover:ring-1 hover:ring-foreground/5",
      )}
      style={{
        ...(data.draft
          ? { animationDelay: `${data.draft.order * 70}ms` }
          : undefined),
        ...(customColor && !data.draft
          ? {
              borderColor: selected
                ? customColor
                : `color-mix(in oklch, ${customColor} 45%, transparent)`,
              boxShadow: selected
                ? `0 10px 25px -5px color-mix(in oklch, ${customColor} 20%, transparent)`
                : undefined,
            }
          : undefined),
      }}
      aria-label={`Endpoint group ${data.label}, base path ${data.basePath || "/"}`}
    >
      {/* NodeResizer for scaling bounding containers */}
      <NodeResizer
        minWidth={280}
        minHeight={160}
        isVisible={selected}
        lineClassName={customColor ? undefined : "border-primary/60"}
        lineStyle={customColor ? { borderColor: customColor } : undefined}
        handleClassName={cn(
          "h-3 w-3 rounded-full border-2 bg-background shadow-xs hover:scale-125 transition-transform",
          customColor ? undefined : "border-primary",
        )}
        handleStyle={customColor ? { borderColor: customColor } : undefined}
      />

      {/* Docked Header Strip: Identity, Base Path, Route Counter, and Customizer Button */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2.5 rounded-t-[calc(1rem-1px)] border-b px-3.5 py-2.5 transition-colors",
          "border-border/60 bg-card/70 dark:bg-card/45 backdrop-blur-xs",
        )}
        style={{
          borderBottomColor: customColor
            ? `color-mix(in oklch, ${customColor} 25%, transparent)`
            : undefined,
          backgroundColor: customColor
            ? `color-mix(in oklch, ${customColor} 6%, var(--color-card, oklch(1 0 0 / 70%)))`
            : undefined,
        }}
      >
        {/* Left: Icon Badge + Label + Base Path */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {/* Custom Pikaicon Squircle Badge */}
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs transition-all",
              !customColor && "border-border bg-primary/10 text-primary",
            )}
            style={{
              borderColor: customColor
                ? `color-mix(in oklch, ${customColor} 40%, transparent)`
                : undefined,
              backgroundColor: customColor
                ? `color-mix(in oklch, ${customColor} 15%, transparent)`
                : undefined,
              color: customColor || undefined,
            }}
          >
            <PikaiconRenderer
              name={data.icon || "FolderIcon"}
              size={16}
              color={customColor}
            />
          </div>

          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            {/* Title & Accent Color Dot */}
            <div className="flex items-center gap-1.5">
              <span className="text-foreground truncate text-xs font-bold tracking-tight">
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

            {/* Base Path Pill */}
            <span className="text-muted-foreground truncate font-mono text-xs">
              {data.basePath || "/"}
            </span>
          </div>
        </div>

        {/* Right: Route Count Badge / Draft Badge + Customizer Action */}
        <div
          className="flex shrink-0 items-center gap-1.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {data.draft ? (
            <span className="border-primary/40 bg-primary/10 text-primary rounded-full border px-2 py-0.5 font-mono text-xs font-bold tracking-wider uppercase">
              Draft
            </span>
          ) : (
            data.routesCount !== undefined && (
              <span
                className={cn(
                  "border-border/60 bg-muted/40 text-muted-foreground font-mono text-xs inline-flex items-center rounded-md border px-2 py-0.5 font-medium transition-colors",
                  data.routesCount === 0 && "text-muted-foreground/70",
                )}
                title={`${data.routesCount} routes in group`}
              >
                {data.routesCount} {data.routesCount === 1 ? "route" : "routes"}
              </span>
            )
          )}

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
