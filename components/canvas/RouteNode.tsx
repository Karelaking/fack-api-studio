"use client";

// Selection and keyboard activation are owned by React Flow's node wrapper
// (`role="group"`, `tabIndex=0`, Enter/Space -> onNodeClick), so the card root
// stays a plain presentational element and nested controls remain valid.

import * as React from "react";
import { Handle, Position } from "@xyflow/react";
import { useDroppable } from "@dnd-kit/core";
import * as PikaCore from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DraftMark } from "./preview-nodes";
import { FieldBadge } from "./FieldBadge";
import { parseSchemaToFields } from "@/lib/schema-synthesizer";
import { removeFieldFromRoute } from "@/lib/actions/canvas-dnd";
import { deleteRoute } from "@/lib/actions/routes";
import { useCanvasDndStore } from "@/stores/canvas-dnd-store-provider";

export interface RouteNodeData {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  isEnabled: boolean;
  latencyMin: number;
  latencyMax: number;
  errorRate: number;
  responseSchema?: string;
  customHeaders?: string;
  conditionalRules?: string;
  onToggleEnabled: (id: string, isEnabled: boolean) => void;
  onSelectRoute: (id: string) => void;
  onOpenEdit: (id: string) => void;
  onDeleteRoute?: (id: string) => void;
  mockUrl: string;
  /** Present when this node is part of an unapplied agent draft. */
  draft?: DraftMark;
}

interface RouteNodeProps {
  data: RouteNodeData;
  selected: boolean;
}

const MAX_VISIBLE_BADGES = 4;

/**
 * Compact API Card (Postman / Retool style) representing a Mock API route node.
 * Features:
 * - Method accent indicator bar and crisp method + status badges
 * - Prominent endpoint path block with 1-click URL copy and toast feedback
 * - Response schema section with typed field pills, drag-and-drop target, and expansion toggle
 * - Micro telemetry status bar for simulated latency, error rate, headers, and rules
 * - Quick 'Test' action opening the mock endpoint in a new tab
 */
export const RouteNode = ({
  data,
  selected,
}: RouteNodeProps): React.JSX.Element => {
  const method = data.method.toUpperCase();

  // DnD droppable: this route card is a drop target for provider chips
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: data.id,
    data: { routeId: data.id },
  });

  const selectedRouteId = useCanvasDndStore((s) => s.selectedRouteId);
  const isSelectedForDrop = selectedRouteId === data.id;

  const [isCopied, setIsCopied] = React.useState(false);
  const [showAllFields, setShowAllFields] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fields = React.useMemo(() => {
    try {
      const parsed = JSON.parse(data.responseSchema ?? "{}") as Parameters<
        typeof parseSchemaToFields
      >[0];
      return parseSchemaToFields(parsed);
    } catch {
      return [];
    }
  }, [data.responseSchema]);

  const visibleFields = showAllFields
    ? fields
    : fields.slice(0, MAX_VISIBLE_BADGES);
  const hiddenCount = fields.length - MAX_VISIBLE_BADGES;

  const handleRemoveField = async (fieldId: string): Promise<void> => {
    try {
      const updatedRoute = await removeFieldFromRoute(data.id, fieldId);
      window.dispatchEvent(
        new CustomEvent("canvas-field-removed", {
          detail: { routeId: data.id, fieldId, updatedRoute },
        }),
      );
      toast.success("Field removed");
    } catch {
      toast.error("Failed to remove field");
    }
  };

  const handleDeleteRoute = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deleteRoute(data.id);
      data.onDeleteRoute?.(data.id);
      window.dispatchEvent(
        new CustomEvent("canvas-route-deleted", {
          detail: { routeId: data.id },
        }),
      );
      toast.success("Route deleted");
      setDeleteOpen(false);
    } catch {
      toast.error("Failed to delete route");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyUrl = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(data.mockUrl);
      setIsCopied(true);
      toast.success("Mock URL copied to clipboard");
      window.setTimeout(() => setIsCopied(false), 1500);
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleTestEndpoint = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (typeof window !== "undefined") {
      window.open(data.mockUrl, "_blank", "noopener,noreferrer");
    }
  };

  const getRouteVariants = (m: string) => ({
    topBorder: cn({
      "bg-method-get": m === "GET",
      "bg-method-post": m === "POST",
      "bg-method-put": m === "PUT",
      "bg-method-delete": m === "DELETE",
      "bg-method-patch": m === "PATCH",
      "bg-primary": !["GET", "POST", "PUT", "DELETE", "PATCH"].includes(m),
    }),
    badge: cn({
      "bg-method-get/10 text-method-get border-method-get/30": m === "GET",
      "bg-method-post/10 text-method-post border-method-post/30": m === "POST",
      "bg-method-put/10 text-method-put border-method-put/30": m === "PUT",
      "bg-method-delete/10 text-method-delete border-method-delete/30":
        m === "DELETE",
      "bg-method-patch/10 text-method-patch border-method-patch/30":
        m === "PATCH",
      "bg-muted/10 text-muted-foreground border-border/20": ![
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
      ].includes(m),
    }),
    dot: cn({
      "bg-method-get shadow-[0_0_8px_var(--color-method-get)]": m === "GET",
      "bg-method-post shadow-[0_0_8px_var(--color-method-post)]": m === "POST",
      "bg-method-put shadow-[0_0_8px_var(--color-method-put)]": m === "PUT",
      "bg-method-delete shadow-[0_0_8px_var(--color-method-delete)]":
        m === "DELETE",
      "bg-method-patch shadow-[0_0_8px_var(--color-method-patch)]":
        m === "PATCH",
      "bg-muted-foreground": ![
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
      ].includes(m),
    }),
    wrapper: cn({
      "hover:shadow-method-get/10 hover:border-method-get/30": m === "GET",
      "hover:shadow-method-post/10 hover:border-method-post/30": m === "POST",
      "hover:shadow-method-put/10 hover:border-method-put/30": m === "PUT",
      "hover:shadow-method-delete/10 hover:border-method-delete/30":
        m === "DELETE",
      "hover:shadow-method-patch/10 hover:border-method-patch/30":
        m === "PATCH",
      "hover:border-muted/40": ![
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
      ].includes(m),
    }),
  });

  const variants = getRouteVariants(method);

  // Status code colors and icons
  let statusBadgeClass = "bg-muted/30 text-muted-foreground border-border/40";
  let statusIcon = PikaCore.GraphTrendLineIcon;

  if (data.statusCode >= 200 && data.statusCode < 300) {
    statusBadgeClass = "bg-success/10 text-success border-success/25";
    statusIcon = PikaCore.CheckTickCircleIcon;
  } else if (data.statusCode >= 300 && data.statusCode < 400) {
    statusBadgeClass = "bg-warning/10 text-warning border-warning/25";
    statusIcon = PikaCore.LightningThunderElectricOnIcon;
  } else if (data.statusCode >= 400 && data.statusCode < 500) {
    statusBadgeClass =
      "bg-destructive/10 text-destructive border-destructive/25";
    statusIcon = PikaCore.AlertCircleIcon;
  } else if (data.statusCode >= 500) {
    statusBadgeClass =
      "bg-destructive/15 text-destructive border-destructive/30 animate-pulse motion-reduce:animate-none";
    statusIcon = PikaCore.AlertTriangleIcon;
  }

  const headersKeysCount = React.useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(data.customHeaders || "{}");
      return typeof parsed === "object" && parsed !== null
        ? Object.keys(parsed).length
        : 0;
    } catch {
      return 0;
    }
  }, [data.customHeaders]);

  const rulesCount = React.useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(data.conditionalRules || "[]");
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }, [data.conditionalRules]);

  const handleToggle = (checked: boolean): void => {
    data.onToggleEnabled(data.id, checked);
  };

  const hasLatency = (data.latencyMin ?? 0) > 0 || (data.latencyMax ?? 0) > 0;
  const hasErrors = (data.errorRate ?? 0) > 0;

  return (
    <div
      ref={setDropRef}
      className={cn(
        "bg-card border-border/80 relative flex w-80 cursor-pointer flex-col overflow-hidden rounded-xl border shadow-sm transition-all duration-200 select-none",
        variants.wrapper,
        selected
          ? "border-primary ring-primary/20 shadow-primary/10 -translate-y-1 scale-[1.01] shadow-lg ring-4"
          : "hover:-translate-y-0.5 hover:shadow-md",
        isOver &&
          "ring-primary/40 border-primary/60 ring-2 shadow-primary/10 shadow-md",
        isSelectedForDrop && !selected && "ring-primary/25 ring-2",
        !data.isEnabled && "opacity-60 grayscale-[0.5]",
        data.draft?.changeType === "create" &&
          "agent-draft-enter border-primary/50 ring-primary/15 ring-2",
        data.draft?.changeType === "update" &&
          "agent-draft-enter ring-info/20 ring-2",
        data.draft?.changeType === "delete" &&
          "agent-draft-enter border-destructive/40 opacity-70",
      )}
      style={
        data.draft
          ? { animationDelay: `${data.draft.order * 70}ms` }
          : undefined
      }
    >
      {/* Top Method Accent Line */}
      <div className={cn("h-1 w-full shrink-0", variants.topBorder)} />

      {data.draft ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-2.5 right-2 z-10 rounded-full border px-2 py-0.5 font-mono text-xs font-bold tracking-wider uppercase",
            data.draft.changeType === "delete"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : data.draft.changeType === "update"
                ? "border-info/40 bg-info/10 text-info"
                : "border-primary/40 bg-primary/10 text-primary",
          )}
        >
          {data.draft.changeType === "delete"
            ? "Remove"
            : data.draft.changeType === "update"
              ? "Update"
              : "New"}
        </span>
      ) : null}
      {data.draft?.hasConflict ? (
        <span
          aria-hidden="true"
          className="border-warning/40 bg-warning/10 text-warning absolute top-2.5 right-18 z-10 rounded-full border px-2 py-0.5 font-mono text-xs font-bold tracking-wider uppercase"
        >
          Conflict
        </span>
      ) : null}

      {/* React Flow connection handle (Input / Target) */}
      <Handle
        type="target"
        position={Position.Left}
        aria-label={`Input connection handle for ${data.method} ${data.path}`}
        className={cn(
          "bg-background! -left-1.75! h-3 w-3 border-2 transition-colors duration-200",
          selected
            ? "border-primary scale-110"
            : "border-muted-foreground/50 hover:border-primary",
        )}
      />

      {/* Header: Method + Status Code + Toolbar Actions */}
      <div className="border-border/40 bg-muted/15 flex items-center justify-between border-b px-3.5 py-2">
        <div className="flex items-center gap-1.5">
          {/* Method Badge with glowing indicator dot */}
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs font-bold tracking-wider uppercase",
              variants.badge,
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                variants.dot,
                data.isEnabled && "animate-pulse motion-reduce:animate-none",
              )}
            />
            {method}
          </span>

          {/* Status code view */}
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-xs font-semibold",
              statusBadgeClass,
            )}
          >
            <PikaIcon
              icon={statusIcon}
              size={12}
              className="shrink-0"
              aria-hidden="true"
            />
            {data.statusCode}
          </span>
        </div>

        {/* Action Toolbar: Edit Button + Delete Button + Enable Switch */}
        <div
          className="flex items-center gap-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="canvas-touch-target hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Edit Route in Inspector"
            aria-label="Edit Route in Inspector"
            onClick={(e) => {
              e.stopPropagation();
              data.onOpenEdit(data.id);
            }}
          >
            <PikaIcon
              icon={PikaCore.PencilEditIcon}
              size={14}
              aria-hidden="true"
            />
          </Button>

          {/* Quick Delete Popover */}
          <Popover open={deleteOpen} onOpenChange={setDeleteOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="canvas-touch-target hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete Route"
                  aria-label={`Delete route ${data.method} ${data.path}`}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
              }
            >
              <PikaIcon
                icon={PikaCore.DeleteDustbin01Icon}
                size={14}
                aria-hidden="true"
              />
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              className="w-56 p-3 shadow-md"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <p className="text-foreground text-xs font-semibold">
                  Delete route?
                </p>
                <p className="text-muted-foreground text-xs leading-snug">
                  This will remove{" "}
                  <span className="text-foreground font-mono font-medium">
                    {data.path}
                  </span>{" "}
                  from the canvas.
                </p>
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => setDeleteOpen(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="destructive"
                    onClick={handleDeleteRoute}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <PikaIcon
                        icon={PikaCore.RefreshIcon}
                        size={12}
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    ) : (
                      "Delete"
                    )}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Switch
            checked={data.isEnabled}
            onCheckedChange={handleToggle}
            aria-label="Toggle Route Enabled"
            className="canvas-touch-switch ml-0.5"
          />
        </div>
      </div>

      {/* Body: Endpoint Path Bar, URL preview, and Field Schema */}
      <div className="flex flex-col gap-2 p-3.5">
        {/* Postman-style Endpoint Path Bar with 1-Click Copy */}
        <div className="bg-muted/30 border-border/40 flex items-center justify-between gap-1.5 rounded-md border px-2.5 py-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="text-muted-foreground font-mono text-xs font-medium select-none">
              PATH
            </span>
            <span className="text-foreground truncate font-mono text-xs font-semibold select-all">
              {data.path}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyUrl}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground hover:bg-muted relative shrink-0 cursor-pointer rounded p-1 transition-colors pointer-coarse:flex pointer-coarse:size-9 pointer-coarse:items-center pointer-coarse:justify-center"
            title="Copy mock URL to clipboard"
            aria-label="Copy mock URL to clipboard"
          >
            {isCopied ? (
              <PikaIcon
                icon={PikaCore.CheckTickCircleIcon}
                size={14}
                className="text-success"
                aria-hidden="true"
              />
            ) : (
              <PikaIcon icon={PikaCore.CopyIcon} size={14} aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Subtle Host URL Breadcrumb */}
        <span className="text-muted-foreground truncate font-mono text-xs select-all">
          {data.mockUrl}
        </span>

        {/* Field Badges Container */}
        {fields.length > 0 && (
          <div
            className={cn(
              "flex flex-wrap gap-1",
              showAllFields &&
                hiddenCount > 0 &&
                "max-h-36 overflow-y-auto pr-0.5 scrollbar-subtle",
            )}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {visibleFields.map((field) => (
              <FieldBadge
                key={field.id}
                field={field}
                routeId={data.id}
                onOpenEdit={data.onOpenEdit}
                onRemove={handleRemoveField}
              />
            ))}
            {!showAllFields && hiddenCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllFields(true);
                }}
                className="text-muted-foreground hover:text-primary border-border/60 hover:border-primary/40 rounded-md border border-dashed px-1.5 py-0.5 text-xs font-medium transition-colors"
                aria-label={`Show ${hiddenCount} more fields`}
              >
                +{hiddenCount} more
              </button>
            )}
            {showAllFields && hiddenCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllFields(false);
                }}
                className="text-muted-foreground hover:text-primary border-border/60 hover:border-primary/40 rounded-md border border-dashed px-1.5 py-0.5 text-xs font-medium transition-colors"
                aria-label="Show fewer fields"
              >
                Show less
              </button>
            )}
          </div>
        )}

        {/* Active Drop Zone Indicator when dragging a provider over this node */}
        {isOver && (
          <div
            className="border-primary/50 bg-primary/10 flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2 transition-all"
            aria-live="polite"
            aria-label="Drop zone active — release to add field"
          >
            <PikaIcon
              icon={PikaCore.PlusCircleIcon}
              size={14}
              className="text-primary shrink-0 animate-pulse motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span className="text-primary text-xs font-semibold">
              Drop here to append field
            </span>
          </div>
        )}

        {/* Empty state: invite the user to drop a provider */}
        {fields.length === 0 && !isOver && !data.draft && (
          <div className="border-border/50 bg-muted/20 flex flex-col items-center justify-center rounded-lg border border-dashed px-3 py-3 text-center">
            <span className="text-muted-foreground text-xs font-medium">
              No schema fields yet
            </span>
            <span className="text-muted-foreground mt-0.5 text-xs">
              Drag faker providers from the left panel to build payload
            </span>
          </div>
        )}
      </div>

      {/* Footer: Telemetry & Rules status bar + Quick Test Trigger */}
      <div className="border-border/50 bg-muted/20 flex min-h-9 items-center justify-between border-t px-3.5 py-1.5">
        {/* Left: Metadata badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {hasLatency ? (
            <span
              className="border-warning/30 bg-warning/10 text-warning inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-xs font-medium"
              title={`Simulated Latency: ${data.latencyMin}-${data.latencyMax}ms`}
            >
              <PikaIcon
                icon={PikaCore.ClockIcon}
                size={12}
                className="shrink-0"
                aria-hidden="true"
              />
              {data.latencyMin === data.latencyMax
                ? `${data.latencyMin}ms`
                : `${data.latencyMin}-${data.latencyMax}ms`}
            </span>
          ) : (
            <span
              className="border-border/40 bg-muted/30 text-muted-foreground inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-xs"
              title="Instant response (0ms simulated latency)"
            >
              <PikaIcon
                icon={PikaCore.ClockIcon}
                size={12}
                className="shrink-0"
                aria-hidden="true"
              />
              0ms
            </span>
          )}

          {hasErrors && (
            <span
              className="border-destructive/30 bg-destructive/10 text-destructive inline-flex h-5 animate-pulse items-center gap-1 rounded border px-1.5 font-mono text-xs font-semibold motion-reduce:animate-none"
              title={`Simulated Error Rate: ${data.errorRate}%`}
            >
              <PikaIcon
                icon={PikaCore.AlertTriangleIcon}
                size={12}
                className="shrink-0"
                aria-hidden="true"
              />
              {data.errorRate}% Err
            </span>
          )}

          {headersKeysCount > 0 && (
            <span
              className="border-info/30 bg-info/10 text-info inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-xs font-medium"
              title={`${headersKeysCount} Custom Header${headersKeysCount === 1 ? "" : "s"}`}
            >
              <PikaIcon
                icon={PikaCore.FilterHorizontalIcon}
                size={12}
                className="shrink-0"
                aria-hidden="true"
              />
              {headersKeysCount} {headersKeysCount === 1 ? "Hdr" : "Hdrs"}
            </span>
          )}

          {rulesCount > 0 && (
            <span
              className="border-primary/30 bg-primary/10 text-primary inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-xs font-medium"
              title={`${rulesCount} Conditional Rule${rulesCount === 1 ? "" : "s"}`}
            >
              <PikaIcon
                icon={PikaCore.GitBranchIcon}
                size={12}
                className="shrink-0"
                aria-hidden="true"
              />
              {rulesCount} {rulesCount === 1 ? "Rule" : "Rules"}
            </span>
          )}
        </div>

        {/* Right: Quick Test Action */}
        <button
          type="button"
          onClick={handleTestEndpoint}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "group/test inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background/90 px-2 py-0.5",
            "text-xs font-semibold text-foreground/80 shadow-2xs transition-all",
            "hover:border-primary/50 hover:bg-primary/10 hover:text-primary active:scale-95 cursor-pointer",
            "pointer-coarse:min-h-11 pointer-coarse:px-3.5",
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          )}
          title={`Open live mock response in new tab (${data.mockUrl})`}
          aria-label={`Test mock endpoint ${data.method} ${data.path}`}
        >
          <span className="text-xs font-medium">Test</span>
        </button>
      </div>

      {/* React Flow connection handle (Output / Source) */}
      <Handle
        type="source"
        position={Position.Right}
        aria-label={`Output connection handle for ${data.method} ${data.path}`}
        className={cn(
          "bg-background! -right-1.5! h-2.5 w-2.5 border-2 transition-colors duration-200",
          selected
            ? "border-primary scale-110"
            : "border-muted-foreground/50 hover:border-primary",
        )}
      />
    </div>
  );
};

export default React.memo(RouteNode);
