"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryState, parseAsBoolean } from "nuqs";
import {
  RiLoader2Line,
  RiFileCopyLine,
  RiDatabase2Line,
  RiRouteLine,
  RiSearchLine,
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiSubtractLine,
  RiPushpinLine,
  RiFocus2Line,
} from "@remixicon/react";
import { toast } from "sonner";
import { createProject } from "@/lib/actions/projects";
import type { Project } from "@/db/schema";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, slugifyPath } from "@/lib/utils";
import { getProjectUrl } from "@/lib/utils/project-slug";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Sidebar, useSidebar } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SidebarProvidersSection } from "./SidebarProvidersSection";

interface DashboardSidebarProps {
  initialProjects: Project[];
  /** Shown in the footer so the running build is identifiable. */
  appVersion: string;
}

interface SelectedRouteDetailsProps {
  selectedRoute: {
    id: string;
    path: string;
    method: string;
    mockUrl: string;
  } | null;
}

const SelectedRouteDetails = ({
  selectedRoute,
}: SelectedRouteDetailsProps): React.JSX.Element => {
  if (!selectedRoute) {
    return (
      <div className="bg-muted/20 border-border/40 mx-2 my-4 flex flex-col items-center justify-center rounded-lg border p-6 text-center">
        <RiRouteLine
          className="text-muted-foreground/60 mb-2 size-8"
          aria-hidden="true"
        />
        <p className="text-foreground text-xs font-semibold">
          No Route Selected
        </p>
        <p className="text-muted-foreground text-caption mt-1 max-w-44 leading-snug">
          Click any route node on the canvas to inspect its mock URL and query
          parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 px-2 py-2">
      {/* Method & Path Display */}
      <div className="bg-muted/30 border-border/50 flex items-center gap-2 rounded-md border p-2">
        <span
          className={cn(
            "shrink-0 rounded-sm border px-2 py-0.5 text-mini font-extrabold tracking-wider uppercase",
            selectedRoute.method.toUpperCase() === "GET" &&
              "border-method-get/25 bg-method-get/10 text-method-get",
            selectedRoute.method.toUpperCase() === "POST" &&
              "border-method-post/25 bg-method-post/10 text-method-post",
            selectedRoute.method.toUpperCase() === "PUT" &&
              "border-method-put/25 bg-method-put/10 text-method-put",
            selectedRoute.method.toUpperCase() === "DELETE" &&
              "border-method-delete/25 bg-method-delete/10 text-method-delete",
            selectedRoute.method.toUpperCase() === "PATCH" &&
              "border-method-patch/25 bg-method-patch/10 text-method-patch",
            !["GET", "POST", "PUT", "DELETE", "PATCH"].includes(
              selectedRoute.method.toUpperCase(),
            ) && "border-border/50 bg-muted/20 text-muted-foreground",
          )}
        >
          {selectedRoute.method}
        </span>
        <span className="text-foreground flex-1 truncate font-mono text-xs font-bold">
          {selectedRoute.path}
        </span>
      </div>

      {/* Base Link (Copyable Input-like box) */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-caption block px-0.5 font-bold tracking-wider uppercase">
          Mock URL
        </span>
        <div className="bg-card border-border/50 flex items-center gap-1.5 rounded-md border p-1.5 shadow-xs">
          <span className="text-foreground flex-1 truncate pl-1 font-mono text-xs leading-normal font-bold select-all">
            {selectedRoute.mockUrl}
          </span>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="h-9 w-9 shrink-0 transition-transform active:scale-90 md:h-7 md:w-7"
            title="Copy Mock Endpoint URL"
            aria-label="Copy Mock Endpoint URL"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(selectedRoute.mockUrl);
                toast.success("Mock link copied!");
              } catch {
                toast.error("Failed to copy link");
              }
            }}
          >
            <RiFileCopyLine className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Query Parameters Helper List */}
      <div className="space-y-1.5">
        <span className="text-muted-foreground text-caption block px-0.5 font-bold tracking-wider uppercase">
          Query Parameters
        </span>
        <div className="bg-muted/20 border-border/50 scrollbar-subtle max-h-48 space-y-1 overflow-y-auto rounded-md border p-2 pr-0.5">
          {[
            { param: "?limit=5", desc: "Limit output array items" },
            { param: "?q=search", desc: "Global text search" },
            {
              param: "?page=2&limit=5",
              desc: "Paginate mock output",
            },
            { param: "?sort=id&order=desc", desc: "Sort records" },
            { param: "?field=value", desc: "Exact field match" },
          ].map((opt, oIdx) => {
            const optUrl = `${selectedRoute.mockUrl}${opt.param}`;
            return (
              <div
                key={oIdx}
                className="hover:bg-background flex items-center justify-between gap-2 rounded-sm border border-transparent px-1.5 py-1 transition-colors"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-primary text-caption truncate font-mono leading-normal font-bold">
                    {opt.param}
                  </span>
                  <span className="text-muted-foreground text-mini truncate leading-normal">
                    {opt.desc}
                  </span>
                </div>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 transition-transform active:scale-90 md:h-6 md:w-6"
                  title="Copy parameter URL"
                  aria-label="Copy parameter URL"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(optUrl);
                      toast.success(`Copied parameter URL`);
                    } catch {
                      toast.error("Failed to copy link");
                    }
                  }}
                >
                  <RiFileCopyLine className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const DashboardSidebar = ({
  initialProjects,
  appVersion,
}: DashboardSidebarProps): React.JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();
  const { open, setOpen, toggleSidebar, isMobile, setOpenMobile } =
    useSidebar();
  const [activeTab, setActiveTab] = React.useState<"providers" | "route">(
    "providers",
  );

  const handleRailTabClick = React.useCallback(
    (tab: "providers" | "route") => {
      if (isMobile) {
        setActiveTab(tab);
        setOpenMobile(true);
        return;
      }
      if (!open) {
        setActiveTab(tab);
        setOpen(true);
      } else if (activeTab === tab) {
        setOpen(false);
      } else {
        setActiveTab(tab);
      }
    },
    [open, activeTab, setOpen, isMobile, setOpenMobile],
  );

  const handleCloseDrawer = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  }, [isMobile, setOpenMobile, setOpen]);

  // Direction C: Floating Canvas Dock mode state
  const [isFloatingMode, setIsFloatingMode] = React.useState(false);
  const [isDockMinimized, setIsDockMinimized] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("fack_sidebar_mode");
      if (saved === "floating" && !isMobile) {
        // localStorage is unavailable during SSR, so the persisted mode
        // cannot be derived during the initial render.
        // eslint-disable-next-line react/set-state-in-effect
        setIsFloatingMode(true);
        // eslint-disable-next-line react/set-state-in-effect
        setOpen(false);
      }
    } catch {
      // Local storage might be blocked or unavailable in some environments
    }
  }, [isMobile, setOpen]);

  const handleToggleFloating = React.useCallback(
    (floating: boolean) => {
      setIsFloatingMode(floating);
      setIsDockMinimized(false);
      try {
        localStorage.setItem(
          "fack_sidebar_mode",
          floating ? "floating" : "rail",
        );
      } catch {
        // ignore
      }
      if (floating) {
        setOpen(false);
      } else {
        setOpen(true);
      }
    },
    [setOpen],
  );

  // Direction C: Keyboard interactions (Escape minimizes dock, "/" un-minimizes to search)
  React.useEffect(() => {
    if (!isFloatingMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "Escape" && !isDockMinimized && !isInput) {
        setIsDockMinimized(true);
      } else if (
        e.key === "/" &&
        isDockMinimized &&
        !isInput &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setIsDockMinimized(false);
        setActiveTab("providers");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFloatingMode, isDockMinimized]);

  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [newProjectQuery, setNewProjectQuery] = useQueryState(
    "new",
    parseAsBoolean.withDefault(false),
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");

  const isCreateOpen = dialogOpen || newProjectQuery;

  const handleCreateOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open && newProjectQuery) {
      void setNewProjectQuery(null);
    }
  };

  const [selectedRoute, setSelectedRoute] = React.useState<{
    id: string;
    path: string;
    method: string;
    mockUrl: string;
  } | null>(null);

  // Sync projects list when server list updates
  React.useEffect(() => {
    const handleSelected = (e: Event) => {
      const customEvent = e as CustomEvent;
      setSelectedRoute(customEvent.detail);
    };

    window.addEventListener("route-selected", handleSelected);
    return () => window.removeEventListener("route-selected", handleSelected);
  }, []);
  React.useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setProjects(initialProjects);
  }, [initialProjects]);

  // Listen for global open-new-project event
  React.useEffect(() => {
    const handleOpen = () => setDialogOpen(true);
    window.addEventListener("open-new-project-dialog", handleOpen);
    return () =>
      window.removeEventListener("open-new-project-dialog", handleOpen);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    const cleanedSlug = slug.trim()
      ? slug.trim().replace(/^\/+|\/+$/g, "")
      : undefined;
    if (cleanedSlug && !/^[a-z0-9_/-]+$/.test(cleanedSlug)) {
      toast.error(
        "Slug must be lowercase alphanumeric with hyphens, underscores, or slashes",
      );
      return;
    }

    setLoading(true);
    try {
      const newProj = await createProject({
        name: name.trim(),
        description: description.trim(),
        slug: cleanedSlug,
      });
      toast.success(`Project "${newProj.name}" created successfully!`);
      setProjects([newProj, ...projects]);
      handleCreateOpenChange(false);
      setName("");
      setSlug("");
      setDescription("");
      router.push(getProjectUrl(newProj.slug, "canvas"));
      router.refresh();
    } catch (err) {
      toast.error("Failed to create project");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeProject = projects.find((proj) =>
    pathname.startsWith(`/projects/${proj.slug}`),
  );

  return (
    <>
      <Sidebar
        collapsible={isFloatingMode && !isMobile ? "offcanvas" : "icon"}
        className="overflow-hidden border-r-0"
        aria-label="Mock providers and project navigation"
      >
        <TooltipProvider delay={300}>
          <div className="flex h-full w-full overflow-hidden">
            {/* ── Tier 1: 48px Fixed Tool Rail (Always Visible) ── */}
            <div
              className="border-border/50 bg-sidebar z-20 flex h-full w-12 shrink-0 flex-col items-center justify-between border-r py-3 select-none"
              role="toolbar"
              aria-label="Canvas workspace tools"
            >
              {/* Top: Brand Logo / Home */}
              <div className="flex flex-col items-center gap-2.5">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Link
                        href="/"
                        className="hover:bg-muted/80 focus-visible:ring-ring flex size-8 items-center justify-center rounded-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-1"
                        aria-label="Fack API Home"
                      >
                        <BrandLogo size={22} />
                      </Link>
                    }
                  />
                  <TooltipContent side="right">Fack API Home</TooltipContent>
                </Tooltip>

                <div className="bg-border/60 h-px w-6" aria-hidden="true" />

                {/* Main Action Tabs */}
                <div className="flex flex-col items-center gap-1.5">
                  {/* Providers Palette Tab */}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          onClick={() => handleRailTabClick("providers")}
                          aria-pressed={open && activeTab === "providers"}
                          className={cn(
                            "flex size-8 items-center justify-center rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                            open && activeTab === "providers"
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                          aria-label="Mock Data Providers"
                        >
                          <RiDatabase2Line className="size-4" />
                        </button>
                      }
                    />
                    <TooltipContent side="right">
                      Mock Data Providers
                    </TooltipContent>
                  </Tooltip>

                  {/* Selected Route Inspector Tab */}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          onClick={() => handleRailTabClick("route")}
                          aria-pressed={open && activeTab === "route"}
                          className={cn(
                            "relative flex size-8 items-center justify-center rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                            open && activeTab === "route"
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                          aria-label="Selected Route Links & Params"
                        >
                          <RiRouteLine className="size-4" />
                          {selectedRoute && (
                            <span
                              className="border-sidebar bg-success absolute top-1 right-1 size-2 rounded-full border-2"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      }
                    />
                    <TooltipContent side="right">
                      {selectedRoute
                        ? `Route: ${selectedRoute.method} ${selectedRoute.path}`
                        : "Route Links (None selected)"}
                    </TooltipContent>
                  </Tooltip>

                  {/* Command Menu Shortcut */}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          onClick={() =>
                            window.dispatchEvent(
                              new CustomEvent("open-command-menu"),
                            )
                          }
                          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
                          aria-label="Command Menu (⌘K / Ctrl+K)"
                        >
                          <RiSearchLine className="size-4" />
                        </button>
                      }
                    />
                    <TooltipContent side="right">
                      Command Menu (⌘K)
                    </TooltipContent>
                  </Tooltip>

                  {/* New Project Dialog Trigger */}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          onClick={() => setDialogOpen(true)}
                          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
                          aria-label="Create Project"
                        >
                          <RiAddLine className="size-4" />
                        </button>
                      }
                    />
                    <TooltipContent side="right">New Project</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Bottom: Theme Toggle, Float Toggle, & Expand/Collapse Toggle */}
              <div className="flex flex-col items-center gap-2">
                <ThemeToggle />

                {/* Float over Canvas Toggle */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => handleToggleFloating(true)}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
                        aria-label="Detach & Float palette over canvas"
                      >
                        <RiFocus2Line className="size-4" />
                      </button>
                    }
                  />
                  <TooltipContent side="right">
                    Detach & Float over Canvas
                  </TooltipContent>
                </Tooltip>

                {/* Drawer Expand/Collapse Toggle */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={toggleSidebar}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
                        aria-label={
                          open
                            ? "Collapse drawer (Ctrl+B)"
                            : "Expand drawer (Ctrl+B)"
                        }
                      >
                        {open ? (
                          <RiArrowLeftSLine className="size-4" />
                        ) : (
                          <RiArrowRightSLine className="size-4" />
                        )}
                      </button>
                    }
                  />
                  <TooltipContent side="right">
                    {open ? "Collapse drawer" : "Expand drawer"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* ── Tier 2: Expandable Secondary Drawer (Visible when expanded) ── */}
            <div
              className={cn(
                "bg-sidebar flex h-full min-w-0 flex-1 flex-col overflow-hidden transition-opacity duration-150",
                !open &&
                  !isMobile &&
                  "invisible pointer-events-none w-0 opacity-0",
              )}
            >
              {/* Drawer Sub-Header */}
              <div className="border-border/50 flex h-12 shrink-0 items-center justify-between border-b px-3">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="text-foreground text-xs font-semibold">
                    {activeTab === "providers"
                      ? "Mock Providers"
                      : "Route Inspector"}
                  </span>
                  {activeProject && (
                    <span className="bg-muted text-muted-foreground text-mini max-w-28 truncate rounded px-1.5 py-0.5 font-mono">
                      {activeProject.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleFloating(true)}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring rounded p-1 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
                    aria-label="Float palette over canvas"
                    title="Float palette over canvas"
                  >
                    <RiFocus2Line className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseDrawer}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring rounded p-1 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
                    aria-label="Close drawer"
                    title="Close drawer"
                  >
                    <RiCloseLine className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="scrollbar-subtle flex-1 overflow-y-auto px-1 py-1">
                {activeTab === "providers" ? (
                  <SidebarProvidersSection selectedRoute={selectedRoute} />
                ) : (
                  <SelectedRouteDetails selectedRoute={selectedRoute} />
                )}
              </div>

              {/* Drawer Footer with Version */}
              <div className="border-border/50 text-muted-foreground text-caption flex h-9 shrink-0 items-center justify-between border-t px-3 font-mono">
                <span>Fack API Studio</span>
                <span>v{appVersion}</span>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </Sidebar>

      {/* ── Direction C: Floating Canvas Dock (Active when unpinned & floating) ── */}
      {isFloatingMode && !isMobile && (
        <aside
          aria-label="Floating Providers and Route Inspector Dock"
          className="animate-in fade-in-50 zoom-in-95 fixed top-18 left-4 z-40 duration-150 select-none"
        >
          {isDockMinimized ? (
            /* Minimized Pill Badge */
            <div className="bg-card/90 dark:bg-card/85 border-border/80 hover:border-primary/50 flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-lg backdrop-blur-md transition-all">
              <button
                type="button"
                onClick={() => setIsDockMinimized(false)}
                className="text-foreground hover:text-primary focus-visible:ring-ring flex items-center gap-2 rounded-full px-1 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
                aria-label="Expand Providers Dock"
              >
                <RiDatabase2Line className="text-primary size-4" />
                <span>Providers Dock</span>
                {selectedRoute ? (
                  <span className="border-success/30 bg-success/10 text-success text-mini flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono">
                    <span className="bg-success size-1.5 rounded-full" />
                    {selectedRoute.method} {selectedRoute.path}
                  </span>
                ) : (
                  <span className="bg-muted text-muted-foreground text-mini rounded-full px-1.5 py-0.5 font-mono">
                    250
                  </span>
                )}
              </button>
              <div className="bg-border/60 h-3.5 w-px" aria-hidden="true" />
              <button
                type="button"
                onClick={() => handleToggleFloating(false)}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-full p-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
                title="Dock to side rail"
                aria-label="Dock to side rail"
              >
                <RiPushpinLine className="size-3.5" />
              </button>
            </div>
          ) : (
            /* Expanded Floating Dock Window */
            <div className="bg-card/95 dark:bg-card/90 border-border/80 flex max-h-[calc(100vh-6rem)] w-80 flex-col overflow-hidden rounded-xl border shadow-2xl backdrop-blur-md">
              {/* Floating Dock Header */}
              <div className="bg-muted/30 border-border/60 flex h-11 shrink-0 items-center justify-between border-b px-3">
                {/* Tab Switcher */}
                <div className="bg-muted/60 border-border/40 flex items-center gap-1 rounded-md border p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab("providers")}
                    aria-pressed={activeTab === "providers"}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      activeTab === "providers"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <RiDatabase2Line className="text-primary size-3.5" />
                    <span>Providers</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("route")}
                    aria-pressed={activeTab === "route"}
                    className={cn(
                      "relative flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      activeTab === "route"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <RiRouteLine className="size-3.5" />
                    <span>Route</span>
                    {selectedRoute && (
                      <span
                        className="bg-success size-1.5 animate-pulse rounded-full motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </div>

                {/* Dock Window Actions: Minimize & Dock */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsDockMinimized(true)}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring rounded p-1 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
                    title="Minimize to pill (Esc)"
                    aria-label="Minimize to pill"
                  >
                    <RiSubtractLine className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFloating(false)}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring rounded p-1 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
                    title="Dock to side rail"
                    aria-label="Dock to side rail"
                  >
                    <RiPushpinLine className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Floating Dock Body */}
              <div className="scrollbar-subtle flex-1 overflow-y-auto p-2">
                {activeTab === "providers" ? (
                  <SidebarProvidersSection selectedRoute={selectedRoute} />
                ) : (
                  <SelectedRouteDetails selectedRoute={selectedRoute} />
                )}
              </div>

              {/* Floating Dock Footer */}
              <div className="border-border/50 text-muted-foreground bg-muted/20 text-mini flex h-8 shrink-0 items-center justify-between border-t px-3 font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="bg-success size-1.5 rounded-full" />
                  <span>Floating Canvas Dock</span>
                </div>
                <span>
                  {activeTab === "providers"
                    ? "Drag chips to nodes"
                    : "Mock Route URLs"}
                </span>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* New Project Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="sm:max-w-106.25">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>New Project</DialogTitle>
              <DialogDescription>
                Create a new isolated project namespace for your mock routes.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="sidebar-proj-name"
                  className="text-sm font-medium"
                >
                  Name
                </label>
                <Input
                  id="sidebar-proj-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Billing Service"
                  maxLength={100}
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="sidebar-proj-slug"
                  className="text-sm font-medium"
                >
                  Namespace Slug
                </label>
                <Input
                  id="sidebar-proj-slug"
                  value={slug}
                  onChange={(e) => setSlug(slugifyPath(e.target.value))}
                  placeholder="e.g., billing-service"
                  maxLength={100}
                  disabled={loading}
                />
                <span className="text-muted-foreground text-mini">
                  Determines mock base URL: `/
                  {'{slug || "slug-derived-from-name"}'}`. Lowercase with
                  hyphens.
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="sidebar-proj-description"
                  className="text-sm font-medium"
                >
                  Description
                </label>
                <Input
                  id="sidebar-proj-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Mocking stripe endpoints for dev"
                  maxLength={500}
                  disabled={loading}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                title="Cancel creation"
                aria-label="Cancel creation"
                onClick={() => handleCreateOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                aria-disabled={loading}
                title="Create Project"
                aria-label="Create Project"
              >
                {loading ? (
                  <>
                    <RiLoader2Line
                      className="h-4 w-4 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Project</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
