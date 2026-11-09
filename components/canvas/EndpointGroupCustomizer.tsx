"use client";

import * as React from "react";
import { toast } from "sonner";
import * as CoreIcons from "@hugeicons/core-free-icons";
import {
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiLoader2Line,
  RiSearchLine,
  RiSparklingLine,
} from "@remixicon/react";
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
import { HugeiconRenderer } from "./HugeiconRenderer";
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
  oklchHue: string;
}[] = [
  { label: "Default Indigo", value: "var(--primary)", oklchHue: "#4f46e5" },
  { label: "Emerald Green", value: "var(--method-get)", oklchHue: "#10b981" },
  { label: "Sky Blue", value: "var(--info)", oklchHue: "#0284c7" },
  { label: "Amber Orange", value: "var(--warning)", oklchHue: "#f59e0b" },
  { label: "Fuchsia Pink", value: "var(--chart-4)", oklchHue: "#d946ef" },
  { label: "Coral Rose", value: "var(--chart-3)", oklchHue: "#f43f5e" },
  { label: "Teal Cyan", value: "var(--chart-5)", oklchHue: "#14b8a6" },
  { label: "Warm Orange", value: "var(--method-patch)", oklchHue: "#ea580c" },
  { label: "Crimson Red", value: "var(--destructive)", oklchHue: "#e11d48" },
  {
    label: "Neutral Slate",
    value: "var(--muted-foreground)",
    oklchHue: "#64748b",
  },
];

const CURATED_CATEGORIES = {
  common: [
    "Folder01Icon",
    "Folder02Icon",
    "FolderLibraryIcon",
    "FolderCodeIcon",
    "DatabaseIcon",
    "Server01Icon",
    "GlobeIcon",
    "CloudIcon",
    "UserIcon",
    "UserGroupIcon",
    "Shield01Icon",
    "LockIcon",
    "Key01Icon",
    "ShoppingBag01Icon",
    "CreditCardIcon",
    "ChartLineData01Icon",
    "CodeIcon",
    "TerminalIcon",
    "Notification01Icon",
    "Mail01Icon",
    "Settings01Icon",
    "CpuIcon",
    "Layers01Icon",
    "FileCodeIcon",
  ],
  auth: [
    "UserIcon",
    "UserGroupIcon",
    "UserCheck01Icon",
    "UserSharingIcon",
    "LockIcon",
    "LockPasswordIcon",
    "Key01Icon",
    "Shield01Icon",
    "ShieldSecurityIcon",
    "PassportIcon",
    "FingerprintIcon",
    "Security01Icon",
    "FaceIdIcon",
    "AiSecurityIcon",
    "IdCardIcon",
    "AccessIcon",
  ],
  commerce: [
    "ShoppingBag01Icon",
    "ShoppingCart01Icon",
    "CreditCardIcon",
    "InvoiceIcon",
    "Coins01Icon",
    "ReceiptIcon",
    "Wallet01Icon",
    "BankIcon",
    "Tag01Icon",
    "Discount01Icon",
    "DollarCircleIcon",
    "PackageIcon",
    "DeliveryBox01Icon",
    "Store01Icon",
    "BarcodeIcon",
    "Cash01Icon",
  ],
  data: [
    "DatabaseIcon",
    "DatabaseSyncIcon",
    "DatabaseRestoreIcon",
    "Server01Icon",
    "ServerStack01Icon",
    "HardDriveIcon",
    "CloudIcon",
    "CloudSyncIcon",
    "Layers01Icon",
    "Archive01Icon",
    "File01Icon",
    "TableIcon",
    "ChartLineData01Icon",
    "ChartBarLineIcon",
    "ChartPieIcon",
    "FilterIcon",
  ],
  dev: [
    "CodeIcon",
    "CodeSquareIcon",
    "FileCodeIcon",
    "TerminalIcon",
    "GitBranchIcon",
    "GitCommitIcon",
    "GitPullRequestIcon",
    "CpuIcon",
    "MicroscopeIcon",
    "Bug01Icon",
    "Rocket01Icon",
    "Plug01Icon",
    "Sliders01Icon",
    "Wrench01Icon",
    "Settings01Icon",
    "ApiIcon",
  ],
} as const;

// Cache all icon keys ending in "Icon" for fast searching
const ALL_ICON_KEYS: string[] = Object.keys(CoreIcons).filter(
  (k) => k.endsWith("Icon") && !k.includes("FreeIcons"),
);

export function EndpointGroupCustomizer({
  endpoint,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: EndpointGroupCustomizerProps): React.JSX.Element {
  const [name, setName] = React.useState(endpoint.name);
  const [basePath, setBasePath] = React.useState(endpoint.basePath);
  const [color, setColor] = React.useState(endpoint.color || "var(--primary)");
  const [icon, setIcon] = React.useState(endpoint.icon || "Folder01Icon");

  const [activeCategoryTab, setActiveCategoryTab] = React.useState<
    keyof typeof CURATED_CATEGORIES | "all"
  >("common");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const [prevEndpoint, setPrevEndpoint] = React.useState(endpoint);
  if (endpoint !== prevEndpoint) {
    setPrevEndpoint(endpoint);
    setName(endpoint.name);
    setBasePath(endpoint.basePath);
    setColor(endpoint.color || "var(--primary)");
    setIcon(endpoint.icon || "Folder01Icon");
    setConfirmDelete(false);
  }

  // Compute displayed icons based on search query or active category
  const displayedIcons = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      return ALL_ICON_KEYS.filter((k) => k.toLowerCase().includes(query)).slice(
        0,
        72,
      );
    }
    if (activeCategoryTab in CURATED_CATEGORIES) {
      return CURATED_CATEGORIES[
        activeCategoryTab as keyof typeof CURATED_CATEGORIES
      ];
    }
    return ALL_ICON_KEYS.slice(0, 72);
  }, [searchQuery, activeCategoryTab]);

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
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="border-border/60 bg-muted/20 shrink-0 border-b p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="flex size-9 items-center justify-center rounded-lg border shadow-xs transition-colors"
                style={{
                  backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`,
                  borderColor: `color-mix(in oklch, ${color} 30%, transparent)`,
                  color: color,
                }}
              >
                <HugeiconRenderer name={icon} size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Customize Route Group
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-0.5 text-xs">
                  Assign an icon and theme color to visually distinguish this
                  group on canvas.
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
              <span className="text-mini text-muted-foreground font-mono">
                {color}
              </span>
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
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative",
                      "border border-black/10 dark:border-white/10 hover:scale-110",
                      isSelected &&
                        "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110",
                    )}
                    style={{ backgroundColor: c.value }}
                  >
                    {isSelected && (
                      <RiCheckLine
                        className="size-3.5 text-white drop-shadow-sm"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Hugeicons Icon Library */}
          <div className="border-border/40 space-y-2.5 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <RiSparklingLine
                  className="text-primary size-3.5"
                  aria-hidden="true"
                />
                <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Hugeicons Library (6,700+ Icons)
                </Label>
              </div>
              <span className="text-mini text-muted-foreground font-mono">
                Selected: {icon}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <RiSearchLine className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search thousands of icons (e.g. user, lock, cloud, db, payment, cart)..."
                className="h-8.5 pr-8 pl-8 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
                >
                  <RiCloseLine className="size-3.5" />
                </button>
              )}
            </div>

            {/* Curated Category Filter Pills */}
            {!searchQuery && (
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: "common", label: "Common" },
                    { id: "auth", label: "Users & Auth" },
                    { id: "commerce", label: "Commerce & Pay" },
                    { id: "data", label: "Data & Storage" },
                    { id: "dev", label: "Developer & System" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategoryTab(tab.id)}
                    className={cn(
                      "px-2 py-0.5 rounded text-mini font-medium transition-colors",
                      activeCategoryTab === tab.id
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Icon Grid */}
            <div className="border-border/60 bg-muted/15 scrollbar-subtle max-h-48 overflow-y-auto rounded-lg border p-2.5">
              {displayedIcons.length === 0 ? (
                <div className="text-muted-foreground py-6 text-center text-xs">
                  No icons matched &quot;{searchQuery}&quot;. Try a broader
                  keyword like &quot;file&quot;, &quot;shield&quot;, or
                  &quot;circle&quot;.
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-9">
                  {displayedIcons.map((iconName) => {
                    const isSelected = icon === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setIcon(iconName)}
                        title={iconName}
                        className={cn(
                          "size-9 rounded-md flex items-center justify-center transition-all cursor-pointer",
                          "border border-transparent hover:border-border hover:bg-muted/80",
                          isSelected
                            ? "bg-primary/15 text-primary border-primary ring-1 ring-primary shadow-xs"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <HugeiconRenderer name={iconName} size={18} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Danger Zone (Delete Group) */}
          <div className="border-destructive/20 border-t pt-3">
            {confirmDelete ? (
              <div className="bg-destructive/10 border-destructive/30 space-y-2 rounded-lg border p-3">
                <p className="text-destructive text-xs font-semibold">
                  Delete route group &quot;{endpoint.name}&quot;?
                </p>
                <p className="text-mini text-muted-foreground">
                  {endpoint.routesCount && endpoint.routesCount > 0
                    ? `Warning: This group contains ${endpoint.routesCount} routes which will also be deleted.`
                    : "This group has no routes."}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="destructive"
                    size="xs"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    {loading ? (
                      <RiLoader2Line className="mr-1 size-3 animate-spin" />
                    ) : (
                      <RiDeleteBinLine className="mr-1 size-3" />
                    )}
                    Confirm Delete
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setConfirmDelete(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive/80 hover:text-destructive flex items-center gap-1 text-xs font-medium transition-colors"
              >
                <RiDeleteBinLine className="size-3.5" />
                <span>Delete Route Group…</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-border/60 bg-muted/20 flex shrink-0 items-center justify-between border-t p-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={loading || !name.trim()}
          >
            {loading && (
              <RiLoader2Line className="mr-1.5 size-3.5 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EndpointGroupCustomizer;
