"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CheckTickCircleIcon,
  ClockIcon,
  CodeIcon,
  CopyIcon,
  DatabaseIcon,
  ExternalLinkSquareIcon,
  GridDashboard02Icon,
  LaptopIcon,
  MultipleCrossCancelIcon,
  PlusIcon,
  SearchIcon,
  Settings01Icon,
  UploadBarUpIcon,
} from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { toast } from "sonner";
import type { Project } from "@/db/schema";
import { cn } from "@/lib/utils";
import { getProjectUrl } from "@/lib/utils/project-slug";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProjectWithRelations extends Project {
  endpoints?: {
    id: string;
    routes?: { method: string }[];
  }[];
}

interface SidebarProjectsSectionProps {
  projects: Project[];
  activeProject?: Project;
  onNewProjectClick: () => void;
}

export function SidebarProjectsSection({
  projects,
  activeProject,
  onNewProjectClick,
}: SidebarProjectsSectionProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopyCliCommand = React.useCallback(
    (slug: string, id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const cmd = `fack dev --project ${slug}`;
      void navigator.clipboard.writeText(cmd);
      setCopiedId(`cli-${id}`);
      toast.success("CLI command copied to clipboard", { description: cmd });
      setTimeout(() => setCopiedId(null), 1500);
    },
    [],
  );

  const handleCopyMockUrl = React.useCallback(
    (slug: string, id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/api/mock/${slug}`;
      void navigator.clipboard.writeText(url);
      setCopiedId(`url-${id}`);
      toast.success("Mock URL copied to clipboard", { description: url });
      setTimeout(() => setCopiedId(null), 1500);
    },
    [],
  );

  const handleTriggerImport = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-import-openapi-dialog"));
  }, []);

  // Separate active project from other projects for clear visual hierarchy
  const activeProjWithStats = (activeProject ||
    projects.find((p) => pathname.startsWith(`/projects/${p.slug}`))) as
    | ProjectWithRelations
    | undefined;

  const otherProjects = React.useMemo(() => {
    return projects.filter((p) => p.id !== activeProjWithStats?.id);
  }, [projects, activeProjWithStats?.id]);

  const filteredOtherProjects = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return otherProjects;
    return otherProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [otherProjects, search]);

  const getStats = (p?: ProjectWithRelations) => {
    if (!p) return { endpoints: 0, routes: 0 };
    const epCount = p.endpoints?.length ?? 0;
    const rCount =
      p.endpoints?.reduce((acc, ep) => acc + (ep.routes?.length ?? 0), 0) ?? 0;
    return { endpoints: epCount, routes: rCount };
  };

  const activeStats = getStats(activeProjWithStats);

  const originUrl = typeof window !== "undefined" ? window.location.origin : "";
  const fullMockUrl = activeProjWithStats
    ? `${originUrl}/api/mock/${activeProjWithStats.slug}`
    : "";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col select-none">
        {/* ── Section Header & Engine Telemetry ── */}
        <div className="border-border/60 bg-muted/20 border-b p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-sm font-semibold tracking-tight">
                Local Workspace
              </span>
              <span className="border-primary/25 bg-primary/10 text-primary text-mini rounded border px-2 py-0.5 font-mono font-semibold">
                Tier 1 · Local
              </span>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onNewProjectClick}
                  className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold shadow-2xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
                  aria-label="Create New Local Project"
                >
                  <PikaIcon icon={PlusIcon} className="size-3.5" />
                  <span>New</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                Create New Local Project
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Engine status strip */}
          <div className="border-border/50 bg-background/80 text-muted-foreground mt-2.5 flex items-center justify-between rounded-md border px-3 py-2 text-xs font-medium">
            <div className="flex items-center gap-2">
              <PikaIcon
                icon={DatabaseIcon}
                className="text-primary size-3.5 shrink-0"
              />
              <span className="truncate">In-Memory Engine & SQLite</span>
            </div>
            <span className="text-muted-foreground/80 text-mini font-mono">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </span>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="scrollbar-subtle flex-1 space-y-5 overflow-y-auto p-3.5">
          {/* ── Active Project Featured Specimen Card ── */}
          {activeProjWithStats && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-muted-foreground/80 text-mini font-mono font-bold tracking-wider uppercase">
                  Active On Canvas
                </span>
                <span className="border-success/30 bg-success/10 text-success text-mini flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono font-semibold">
                  <span className="bg-success relative flex size-2 rounded-full">
                    <span className="bg-success/60 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none" />
                  </span>
                  Live
                </span>
              </div>

              <div className="border-primary/30 bg-primary/3 dark:bg-primary/5 space-y-3.5 rounded-lg border p-4 shadow-2xs">
                {/* Active Project Title & Description */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-foreground truncate text-base font-bold">
                      {activeProjWithStats.name}
                    </h4>
                    <span className="border-primary/25 bg-primary/15 text-primary text-mini rounded border px-2 py-0.5 font-mono font-bold tracking-wider uppercase">
                      Current
                    </span>
                  </div>
                  {activeProjWithStats.description && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {activeProjWithStats.description}
                    </p>
                  )}
                </div>

                {/* Telemetry metric pills */}
                <div className="border-border/40 grid grid-cols-3 gap-2 border-t pt-3">
                  <div className="border-border/50 bg-background/80 flex flex-col rounded-md border p-2 text-center">
                    <span className="text-foreground font-mono text-sm font-bold">
                      {activeStats.endpoints}
                    </span>
                    <span className="text-muted-foreground/80 text-mini font-mono uppercase">
                      Endpoints
                    </span>
                  </div>
                  <div className="border-border/50 bg-background/80 flex flex-col rounded-md border p-2 text-center">
                    <span className="text-foreground font-mono text-sm font-bold">
                      {activeStats.routes}
                    </span>
                    <span className="text-muted-foreground/80 text-mini font-mono uppercase">
                      Routes
                    </span>
                  </div>
                  <div className="border-border/50 bg-background/80 flex flex-col rounded-md border p-2 text-center">
                    <span
                      className={cn(
                        "font-mono text-sm font-bold",
                        activeProjWithStats.isLoggingEnabled
                          ? "text-success"
                          : "text-muted-foreground",
                      )}
                    >
                      {activeProjWithStats.isLoggingEnabled ? "ON" : "OFF"}
                    </span>
                    <span className="text-muted-foreground/80 text-mini font-mono uppercase">
                      Logs
                    </span>
                  </div>
                </div>

                {/* Mock Server URL Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-muted-foreground/80 text-mini font-mono font-semibold tracking-wider uppercase">
                      Mock Server URL
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) =>
                          handleCopyMockUrl(
                            activeProjWithStats.slug,
                            activeProjWithStats.id,
                            e,
                          )
                        }
                        className="text-muted-foreground hover:bg-background hover:text-foreground border-border/40 flex h-6.5 items-center gap-1 rounded border px-2 text-xs font-medium transition-colors"
                        title="Copy Mock URL"
                        aria-label="Copy Mock URL"
                      >
                        <PikaIcon
                          icon={
                            copiedId === `url-${activeProjWithStats.id}`
                              ? CheckTickCircleIcon
                              : CopyIcon
                          }
                          className={cn(
                            "size-3.5",
                            copiedId === `url-${activeProjWithStats.id}` &&
                              "text-success",
                          )}
                        />
                        <span>
                          {copiedId === `url-${activeProjWithStats.id}`
                            ? "Copied!"
                            : "Copy"}
                        </span>
                      </button>

                      {fullMockUrl && (
                        <a
                          href={fullMockUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:bg-background hover:text-foreground border-border/40 flex size-6.5 items-center justify-center rounded border transition-colors"
                          title="Open Mock URL in browser tab"
                          aria-label="Open Mock URL in browser tab"
                        >
                          <PikaIcon
                            icon={ExternalLinkSquareIcon}
                            className="size-3.5"
                          />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="border-border/60 bg-background/90 text-foreground flex items-center rounded-md border px-3 py-2 font-mono text-xs select-all">
                    <span className="text-primary mr-1.5 font-bold">GET</span>
                    <span className="truncate">
                      /api/mock/{activeProjWithStats.slug}
                    </span>
                  </div>
                </div>

                {/* Local CLI Command Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-muted-foreground/80 text-mini font-mono font-semibold tracking-wider uppercase">
                      Local CLI Runner
                    </span>
                    <button
                      type="button"
                      onClick={(e) =>
                        handleCopyCliCommand(
                          activeProjWithStats.slug,
                          activeProjWithStats.id,
                          e,
                        )
                      }
                      className="text-muted-foreground hover:bg-background hover:text-foreground border-border/40 flex h-6.5 items-center gap-1 rounded border px-2 text-xs font-medium transition-colors"
                      title="Copy CLI command"
                      aria-label="Copy CLI command"
                    >
                      <PikaIcon
                        icon={
                          copiedId === `cli-${activeProjWithStats.id}`
                            ? CheckTickCircleIcon
                            : LaptopIcon
                        }
                        className={cn(
                          "size-3.5",
                          copiedId === `cli-${activeProjWithStats.id}` &&
                            "text-success",
                        )}
                      />
                      <span>
                        {copiedId === `cli-${activeProjWithStats.id}`
                          ? "Copied!"
                          : "Copy"}
                      </span>
                    </button>
                  </div>

                  <div className="border-border/60 bg-muted/40 text-foreground flex items-center justify-between rounded-md border px-3 py-2 font-mono text-xs select-all">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-primary font-bold">$</span>
                      <span className="truncate">
                        fack dev --project {activeProjWithStats.slug}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subpage Navigation Grid */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-muted-foreground/80 text-mini px-0.5 font-mono font-semibold tracking-wider uppercase">
                    Workspace Views
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        sub: "canvas",
                        label: "Visual Canvas",
                        icon: GridDashboard02Icon,
                      },
                      {
                        sub: "endpoints",
                        label: "Endpoints",
                        icon: CodeIcon,
                      },
                      {
                        sub: "logs",
                        label: "Request Logs",
                        icon: ClockIcon,
                      },
                      {
                        sub: "settings",
                        label: "Settings",
                        icon: Settings01Icon,
                      },
                    ].map((tab) => {
                      const isTabActive = pathname.endsWith(`/${tab.sub}`);
                      return (
                        <Link
                          key={tab.sub}
                          href={getProjectUrl(
                            activeProjWithStats.slug,
                            tab.sub as
                              | "canvas"
                              | "endpoints"
                              | "logs"
                              | "settings",
                          )}
                          className={cn(
                            "flex h-10 items-center gap-2.5 rounded-md border px-3 transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden",
                            isTabActive
                              ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "border-border/50 bg-background/80 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <PikaIcon
                            icon={tab.icon}
                            className="size-4 shrink-0"
                          />
                          <span className="text-xs font-medium">
                            {tab.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Other Local Projects Section ── */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-foreground text-sm font-semibold tracking-tight">
                All Local Projects
              </span>
              <span className="bg-muted text-muted-foreground text-mini rounded-full px-2 py-0.5 font-mono font-medium">
                {otherProjects.length}
              </span>
            </div>

            {/* Project Filter */}
            {otherProjects.length > 0 && (
              <search className="relative">
                <PikaIcon
                  icon={SearchIcon}
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter local projects..."
                  aria-label="Filter local projects"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="border-border/60 bg-background text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-ring focus-visible:border-primary/50 h-9 w-full rounded-md border pr-8 pl-9.5 font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1"
                    aria-label="Clear filter"
                  >
                    <PikaIcon
                      icon={MultipleCrossCancelIcon}
                      className="size-3.5"
                    />
                  </button>
                )}
              </search>
            )}

            {/* List of other projects */}
            {filteredOtherProjects.length === 0 ? (
              <div className="border-border/50 bg-muted/10 rounded-lg border border-dashed px-4 py-6 text-center">
                <p className="text-muted-foreground text-xs font-medium">
                  {search
                    ? "No matching projects found"
                    : "No other local projects"}
                </p>
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-primary mt-2 text-xs font-semibold hover:underline"
                  >
                    Clear search filter
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onNewProjectClick}
                    className="text-primary mt-2 text-xs font-semibold hover:underline"
                  >
                    + Create another project
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-2.5" aria-label="Other local projects">
                {filteredOtherProjects.map((p) => {
                  const stats = getStats(p as ProjectWithRelations);

                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(getProjectUrl(p.slug, "canvas"))
                        }
                        className="group/item border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-ring block w-full cursor-pointer rounded-lg border p-3.5 text-left transition-all focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-hidden"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-foreground group-hover/item:text-primary truncate text-sm font-semibold transition-colors">
                                {p.name}
                              </span>
                            </div>
                            <p className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
                              /api/mock/{p.slug}
                            </p>
                            <div className="text-muted-foreground/80 text-mini mt-2 flex items-center gap-2 font-mono">
                              <span className="border-border/40 bg-muted/40 rounded border px-1.5 py-0.5">
                                {stats.endpoints} endpoints
                              </span>
                              <span className="border-border/40 bg-muted/40 rounded border px-1.5 py-0.5">
                                {stats.routes} routes
                              </span>
                            </div>
                          </div>

                          {/* Quick switch button */}
                          <div className="flex shrink-0 items-center">
                            <span className="border-border/50 bg-muted group-hover/item:bg-primary group-hover/item:text-primary-foreground text-foreground flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-all">
                              <span>Open</span>
                              <PikaIcon
                                icon={ArrowRightIcon}
                                className="size-3.5 transition-transform group-hover/item:translate-x-0.5"
                              />
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Footer Quick Actions ── */}
        <div className="border-border/60 bg-muted/20 grid grid-cols-2 gap-2.5 border-t p-3.5">
          <button
            type="button"
            onClick={onNewProjectClick}
            className="border-border/60 bg-background text-foreground hover:bg-muted focus-visible:ring-ring flex h-9 items-center justify-center gap-2 rounded-md border text-xs font-semibold shadow-2xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
          >
            <PikaIcon icon={PlusIcon} className="size-4" />
            <span>New Project</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerImport}
            className="border-border/60 bg-background text-foreground hover:bg-muted focus-visible:ring-ring flex h-9 items-center justify-center gap-2 rounded-md border text-xs font-semibold shadow-2xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
          >
            <PikaIcon icon={UploadBarUpIcon} className="size-4" />
            <span>Import API</span>
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default SidebarProjectsSection;
