"use client";

import * as React from "react";
import { toast } from "sonner";
import * as PikaCore from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PikaiconRenderer } from "./HugeiconRenderer";
import { EndpointGroupIconCell } from "./EndpointGroupIconCell";
import { updateEndpoint, deleteEndpoint } from "@/lib/actions/endpoints";

interface EndpointGroupCustomizerProps {
  endpoint: {
    id: string;
    name: string;
    basePath: string;
    color?: string | null;
    icon?: string | null;
    routesCount?: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (updated: {
    id: string;
    name: string;
    basePath: string;
    color: string;
    icon: string;
  }) => void;
  onDeleted: (endpointId: string) => void;
}

const PRESET_COLORS: readonly {
  label: string;
  value: string;
}[] = [
  { label: "Signal Indigo", value: "var(--primary)" },
  { label: "Protocol Blue", value: "var(--info)" },
  { label: "Caution Amber", value: "var(--warning)" },
  { label: "Verified Green", value: "var(--success)" },
  { label: "Fault Red", value: "var(--destructive)" },
  { label: "GET Green", value: "var(--method-get)" },
  { label: "POST Blue", value: "var(--method-post)" },
  { label: "PATCH Orange", value: "var(--method-patch)" },
  { label: "Graphite Slate", value: "var(--muted-foreground)" },
];

// All icon keys ending in "Icon" from @pikaicons/core-free (997 unique icons)
const ALL_ICON_KEYS: readonly string[] = Object.keys(PikaCore).filter((k) =>
  k.endsWith("Icon"),
);

const PAGE_SIZE = 96;

/**
 * Endpoint Group Customization Modal Dialog.
 *
 * Allows configuring:
 * - Group Name and Base Path
 * - Accent Color token from preset swatches
 * - Full browsing and search across 990+ Pikaicons (https://pikaicons.com/) with pagination
 * - Group deletion with cascade route count notice
 */
export const EndpointGroupCustomizer = ({
  endpoint,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: EndpointGroupCustomizerProps): React.JSX.Element => {
  const [name, setName] = React.useState(endpoint.name);
  const [basePath, setBasePath] = React.useState(endpoint.basePath);
  const [color, setColor] = React.useState(endpoint.color || "var(--primary)");
  const [icon, setIcon] = React.useState(endpoint.icon || "FolderIcon");

  const [searchQuery, setSearchQuery] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [loading, setLoading] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Sync state when endpoint prop changes without useEffect
  const [prevEndpoint, setPrevEndpoint] = React.useState(endpoint);
  if (endpoint !== prevEndpoint) {
    setPrevEndpoint(endpoint);
    setName(endpoint.name);
    setBasePath(endpoint.basePath);
    setColor(endpoint.color || "var(--primary)");
    setIcon(endpoint.icon || "FolderIcon");
    setConfirmDelete(false);
    setVisibleCount(PAGE_SIZE);
  }

  // Filter full catalog based on active search query
  const filteredIcons = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      return ALL_ICON_KEYS.filter((k) => k.toLowerCase().includes(query));
    }
    return ALL_ICON_KEYS;
  }, [searchQuery]);

  // Keep pagination bounded to filtered result count
  const displayedIcons = React.useMemo(() => {
    return filteredIcons.slice(0, visibleCount);
  }, [filteredIcons, visibleCount]);

  const hasMore = visibleCount < filteredIcons.length;

  const handleLoadMore = (): void => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredIcons.length));
  };

  const handleSelectIcon = React.useCallback((selectedName: string): void => {
    setIcon(selectedName);
  }, []);

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) {
      toast.error("Group name cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const updated = await updateEndpoint({
        id: endpoint.id,
        name: name.trim(),
        basePath: basePath.trim(),
        color,
        icon,
      });

      onUpdated({
        id: updated.id,
        name: updated.name,
        basePath: updated.basePath,
        color: updated.color ?? color,
        icon: updated.icon ?? icon,
      });

      toast.success("Route group updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update route group");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    setLoading(true);
    try {
      await deleteEndpoint(endpoint.id);
      onDeleted(endpoint.id);
      toast.success(`Group "${endpoint.name}" deleted`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete route group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-185 max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {/* Header with live Icon + Color preview badge */}
        <DialogHeader className="border-border/60 bg-muted/20 shrink-0 border-b p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-xs transition-all"
                style={{
                  backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`,
                  borderColor: `color-mix(in oklch, ${color} 30%, transparent)`,
                  color: color,
                }}
              >
                <PikaiconRenderer name={icon} size={22} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Customize Route Group
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-0.5 text-xs">
                  Pick an accent color and choose from 990+ Pikaicons
                  (pikaicons.com) to distinguish this group on canvas.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="scrollbar-subtle flex-1 space-y-5 overflow-y-auto p-5">
          {/* Section 1: Basic Info */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="group-name" className="text-xs font-semibold">
                Group Name
              </Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSave();
                  }
                }}
                placeholder="e.g. Users API, Auth"
                className="h-8.5 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-path" className="text-xs font-semibold">
                Base Path
              </Label>
              <Input
                id="group-path"
                value={basePath}
                onChange={(e) => setBasePath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSave();
                  }
                }}
                placeholder="/api/v1/users"
                className="h-8.5 font-mono text-xs"
              />
            </div>
          </div>

          {/* Section 2: Color Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Group Accent Color
              </Label>
            </div>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {PRESET_COLORS.map((c) => {
                const isSelected = color === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    title={c.label}
                    aria-label={`Select color ${c.label}`}
                    aria-pressed={isSelected}
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative",
                      "border border-black/10 dark:border-white/10 hover:scale-110",
                      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-hidden",
                      "pointer-coarse:size-9",
                      isSelected &&
                        "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110",
                    )}
                    style={{ backgroundColor: c.value }}
                  >
                    {isSelected && (
                      <PikaIcon
                        icon={PikaCore.CheckTickCircleIcon}
                        size={14}
                        className="text-white drop-shadow-sm"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Pikaicons Library (990+ Hand-crafted Icons) */}
          <div className="border-border/40 space-y-4 border-t pt-4">
            {/* Search Input */}
            <div className="relative">
              <PikaIcon
                icon={PikaCore.SearchIcon}
                size={14}
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Search across all 990+ icons (e.g. user, database, lock, credit, cloud, apple, git)..."
                aria-label="Search icons"
                className="h-8.5 pr-8 pl-8 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setVisibleCount(PAGE_SIZE);
                  }}
                  aria-label="Clear icon search"
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer transition-colors"
                >
                  <PikaIcon
                    icon={PikaCore.MultipleCrossCancelIcon}
                    size={14}
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>

            {/* Icon Grid */}
            <div className="border-border/60 bg-muted/15 scrollbar-subtle max-h-78 space-y-3 overflow-y-auto rounded-lg border p-2.5">
              {displayedIcons.length === 0 ? (
                <div className="text-muted-foreground space-y-1 py-8 text-center text-xs">
                  <p className="font-semibold">
                    No icons matched &quot;{searchQuery}&quot;
                  </p>
                  <p className="text-muted-foreground/80 text-xs">
                    Try another keyword like &quot;folder&quot;,
                    &quot;database&quot;, &quot;chart&quot;, or
                    &quot;user&quot;.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-9">
                  {displayedIcons.map((iconName) => (
                    <EndpointGroupIconCell
                      key={iconName}
                      iconName={iconName}
                      isSelected={icon === iconName}
                      onSelect={handleSelectIcon}
                    />
                  ))}
                </div>
              )}

              {/* Load More Button */}
              {hasMore && (
                <div className="pt-2 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleLoadMore}
                    className="hover:bg-muted h-7 px-4 text-xs"
                  >
                    Load More (
                    {(filteredIcons.length - visibleCount).toLocaleString()}{" "}
                    remaining)
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-border/60 bg-muted/20 m-0 flex shrink-0 items-center justify-between border-t p-4 sm:justify-between">
          {/* Left: Delete Group action with inline confirmation */}
          <div className="flex items-center">
            {confirmDelete ? (
              <div className="flex items-center gap-1.5" role="alert">
                <span className="text-destructive text-xs font-medium">
                  Delete
                  {endpoint.routesCount && endpoint.routesCount > 0
                    ? ` with ${endpoint.routesCount} routes`
                    : ""}
                  ?
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="xs"
                  onClick={handleDelete}
                  disabled={loading}
                  className="h-7 px-2 text-xs"
                >
                  {loading ? (
                    <PikaIcon
                      icon={PikaCore.RefreshIcon}
                      size={12}
                      className="mr-1 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <PikaIcon
                      icon={PikaCore.DeleteDustbin01Icon}
                      size={12}
                      className="mr-1"
                      aria-hidden="true"
                    />
                  )}
                  Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setConfirmDelete(false)}
                  disabled={loading}
                  className="h-7 px-2 text-xs"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                disabled={loading}
                className="text-destructive/80 hover:text-destructive hover:bg-destructive/10 -ml-1 text-xs font-medium transition-colors"
                title="Delete this route group"
                aria-label="Delete this route group"
              >
                <PikaIcon
                  icon={PikaCore.DeleteDustbin01Icon}
                  size={14}
                  className="mr-1.5"
                  aria-hidden="true"
                />
                <span>Delete Group</span>
              </Button>
            )}
          </div>

          {/* Right: Cancel and Save Changes */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={loading || !name.trim()}
              className="min-w-28 text-xs font-semibold shadow-xs"
            >
              {loading ? (
                <PikaIcon
                  icon={PikaCore.RefreshIcon}
                  size={14}
                  className="mr-1.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <PikaIcon
                  icon={PikaCore.CheckTickCircleIcon}
                  size={14}
                  className="mr-1.5"
                  aria-hidden="true"
                />
              )}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EndpointGroupCustomizer;
