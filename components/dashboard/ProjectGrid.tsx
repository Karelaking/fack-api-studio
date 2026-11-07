"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryState, parseAsString, parseAsStringEnum } from "nuqs";
import {
  RiTerminalBoxLine,
  RiSearchLine,
  RiLoader2Line,
  RiDeleteBin6Line,
  RiSettings3Line,
  RiAddLine,
  RiCloseLine,
  RiLayoutGridLine,
  RiListUnordered,
  RiArrowUpDownLine,
  RiArrowRightSLine,
  RiPulseLine,
  RiRouteLine,
  RiTimeLine,
  RiFileList3Line,
  RiCommandLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { deleteProject, updateProject } from "@/lib/actions/projects";
import { cn, formatRelativeTime } from "@/lib/utils";
import { getProjectUrl } from "@/lib/utils/project-slug";
import type { Project, Route } from "@/db/schema";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// The dashboard list query projects only the fields the overview needs
// (`endpoint.id` and `route.method`), so the relations are modeled narrowly
// instead of pretending every full route row is present.
type ProjectWithRelations = Project & {
  endpoints?: {
    id: string;
    routes?: { method: Route["method"] }[];
  }[];
};

type SortOption = "updated" | "name";

const METHOD_ORDER: Route["method"][] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
];

interface MethodStyleConfig {
  label: Route["method"];
  color: string;
  bgTint: string;
  borderTint: string;
  trackBg: string;
}

const METHOD_M3_CONFIGS: Record<Route["method"], MethodStyleConfig> = {
  GET: {
    label: "GET",
    color: "var(--method-get)",
    bgTint: "color-mix(in oklch, var(--method-get) 12%, transparent)",
    borderTint: "color-mix(in oklch, var(--method-get) 24%, transparent)",
    trackBg: "color-mix(in oklch, var(--method-get) 10%, var(--color-muted))",
  },
  POST: {
    label: "POST",
    color: "var(--method-post)",
    bgTint: "color-mix(in oklch, var(--method-post) 12%, transparent)",
    borderTint: "color-mix(in oklch, var(--method-post) 24%, transparent)",
    trackBg: "color-mix(in oklch, var(--method-post) 10%, var(--color-muted))",
  },
  PUT: {
    label: "PUT",
    color: "var(--method-put)",
    bgTint: "color-mix(in oklch, var(--method-put) 12%, transparent)",
    borderTint: "color-mix(in oklch, var(--method-put) 24%, transparent)",
    trackBg: "color-mix(in oklch, var(--method-put) 10%, var(--color-muted))",
  },
  PATCH: {
    label: "PATCH",
    color: "var(--method-patch)",
    bgTint: "color-mix(in oklch, var(--method-patch) 12%, transparent)",
    borderTint: "color-mix(in oklch, var(--method-patch) 24%, transparent)",
    trackBg: "color-mix(in oklch, var(--method-patch) 10%, var(--color-muted))",
  },
  DELETE: {
    label: "DELETE",
    color: "var(--method-delete)",
    bgTint: "color-mix(in oklch, var(--method-delete) 12%, transparent)",
    borderTint: "color-mix(in oklch, var(--method-delete) 24%, transparent)",
    trackBg:
      "color-mix(in oklch, var(--method-delete) 10%, var(--color-muted))",
  },
};

interface ProjectGridProps {
  initialProjects: ProjectWithRelations[];
}

/**
 * The dashboard's workspace browser.
 *
 * Overview widgets are derived from the same project list the grid renders, so
 * every number on this page can be traced to the database — there are no
 * placeholder quotas, alerts, or previews here.
 */
export function ProjectGrid({
  initialProjects,
}: ProjectGridProps): React.JSX.Element | null {
  const router = useRouter();
  const [projects, setProjects] =
    React.useState<ProjectWithRelations[]>(initialProjects);
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [sortBy, setSortBy] = useQueryState(
    "sort",
    parseAsStringEnum<SortOption>(["updated", "name"]).withDefault("updated"),
  );

  const searchRef = React.useRef<HTMLInputElement>(null);

  // Deletion states
  const [projectToDelete, setProjectToDelete] =
    React.useState<ProjectWithRelations | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Edit/Settings states
  const [projectToEdit, setProjectToEdit] =
    React.useState<ProjectWithRelations | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editSlug, setEditSlug] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editLoading, setEditLoading] = React.useState(false);

  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  // Sync initial projects
  React.useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setProjects(initialProjects);
  }, [initialProjects]);

  React.useEffect(() => {
    if (projectToEdit) {
      // eslint-disable-next-line react/set-state-in-effect
      setEditName(projectToEdit.name);
      setEditSlug(projectToEdit.slug);
      setEditDescription(projectToEdit.description ?? "");
    }
  }, [projectToEdit]);

  // The hint in the search field is a real shortcut: `/` focuses the field
  // from anywhere on the page unless the user is already typing somewhere.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const stats = React.useMemo(() => {
    const methodCounts: Record<Route["method"], number> = {
      GET: 0,
      POST: 0,
      PUT: 0,
      PATCH: 0,
      DELETE: 0,
    };
    let endpointCount = 0;
    let routeCount = 0;

    for (const project of projects) {
      const endpoints = project.endpoints ?? [];
      endpointCount += endpoints.length;
      for (const endpoint of endpoints) {
        const routes = endpoint.routes ?? [];
        routeCount += routes.length;
        for (const route of routes) {
          methodCounts[route.method] += 1;
        }
      }
    }

    return { endpointCount, routeCount, methodCounts };
  }, [projects]);

  const recentProjects = React.useMemo(
    () =>
      [...projects]
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 4),
    [projects],
  );

  const filteredProjects = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? projects.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.description?.toLowerCase().includes(term) ||
            p.slug.toLowerCase().includes(term),
        )
      : projects;

    if (sortBy === "name") {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    return [...filtered].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }, [projects, search, sortBy]);

  const [isPending, startTransition] = React.useTransition();

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.key === "Escape") {
      if (search) {
        void setSearch(null);
      } else {
        event.currentTarget.blur();
      }
    }
  };

  const handleEditSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!projectToEdit) return;
    if (!editName.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (!editSlug.trim()) {
      toast.error("Namespace slug is required");
      return;
    }

    setEditLoading(true);
    startTransition(async () => {
      try {
        const updated = await updateProject({
          id: projectToEdit.id,
          name: editName.trim(),
          slug: editSlug.trim(),
          description: editDescription.trim(),
        });
        toast.success("Workspace settings updated successfully!");
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectToEdit.id ? { ...p, ...updated } : p,
          ),
        );
        setProjectToEdit(null);
        router.refresh();
      } catch (err) {
        toast.error("Failed to update workspace settings");
        console.error(err);
      } finally {
        setEditLoading(false);
      }
    });
  };

  const handleDeleteProject = (): void => {
    if (!projectToDelete) return;
    if (deleteConfirmText !== projectToDelete.name) {
      toast.error("Please type the project name correctly to confirm.");
      return;
    }
    setDeleteLoading(true);
    startTransition(async () => {
      try {
        await deleteProject(projectToDelete.id);
        toast.success(
          `Project "${projectToDelete.name}" deleted successfully.`,
        );
        setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
        setProjectToDelete(null);
        setDeleteConfirmText("");
        router.refresh();
      } catch (err) {
        toast.error("Failed to delete workspace");
        console.error(err);
      } finally {
        setDeleteLoading(false);
      }
    });
  };

  const triggerCreateProject = (): void => {
    window.dispatchEvent(new CustomEvent("open-new-project-dialog"));
  };

  const openCommandMenu = (): void => {
    window.dispatchEvent(new CustomEvent("open-command-menu"));
  };

  const hasProjects = projects.length > 0;

  return (
    <PageShell>
      <header className="space-y-1">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Workspaces
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Every workspace is an isolated namespace with its own mock endpoints,
          routes, and request logs.
        </p>
      </header>

      {/* Search and view controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <RiSearchLine
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => void setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search workspaces..."
            aria-label="Search workspaces"
            aria-keyshortcuts="/"
            className="bg-card/30 border-border/50 h-11 pr-12 pl-9 text-base sm:h-10 sm:text-sm"
          />
          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  void setSearch(null);
                  searchRef.current?.focus();
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:h-7 sm:w-7"
              >
                <RiCloseLine aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="bg-muted text-muted-foreground border-border/50 text-mini hidden h-5 min-w-5 items-center justify-center rounded-sm border px-1.5 font-mono font-medium sm:flex"
              >
                /
              </kbd>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Sort workspaces by ${
                    sortBy === "name" ? "name" : "last updated"
                  }`}
                  className="h-11 min-w-11 justify-center px-0 sm:h-10 sm:min-w-0 sm:px-3"
                />
              }
            >
              <RiArrowUpDownLine aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">
                {sortBy === "name" ? "Name" : "Last updated"}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuRadioGroup
                value={sortBy}
                onValueChange={(value) => {
                  void setSortBy(value as SortOption);
                }}
              >
                <DropdownMenuRadioItem value="updated">
                  Last updated
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name">
                  Name (A–Z)
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <fieldset className="border-border/50 bg-card/30 flex h-11 min-w-0 items-center rounded-lg border p-0 sm:h-10 sm:p-1">
            <legend className="sr-only">Workspace layout</legend>
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
              className={cn(
                "focus-visible:ring-ring focus-visible:ring-offset-background flex h-full w-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none sm:h-8 sm:w-8",
                viewMode === "grid"
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <RiLayoutGridLine aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={cn(
                "focus-visible:ring-ring focus-visible:ring-offset-background flex h-full w-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none sm:h-8 sm:w-8",
                viewMode === "list"
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <RiListUnordered aria-hidden="true" className="h-4 w-4" />
            </button>
          </fieldset>
        </div>
      </div>

      {hasProjects ? (
        <div className="flex flex-col gap-6 md:flex-row md:gap-6 lg:gap-8">
          {/* Overview rail — real counts only */}
          <aside
            aria-label="Workspace overview"
            className="order-2 flex w-full shrink-0 flex-col gap-5 md:order-1 md:w-70 lg:w-[320px] xl:w-85 2xl:w-90"
          >
            <section aria-labelledby="overview-heading" className="space-y-3">
              <h2
                id="overview-heading"
                className="text-foreground text-base font-semibold tracking-tight"
              >
                Overview
              </h2>
              <div className="bg-card/30 border-border/50 rounded-xl border p-4 shadow-sm">
                <dl className="divide-border/50 divide-y">
                  <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <dt className="text-muted-foreground text-sm">Projects</dt>
                    <dd className="text-foreground text-sm font-semibold tabular-nums">
                      {projects.length}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <dt className="text-muted-foreground text-sm">Endpoints</dt>
                    <dd className="text-foreground text-sm font-semibold tabular-nums">
                      {stats.endpointCount}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <dt className="text-muted-foreground text-sm">Routes</dt>
                    <dd className="text-foreground text-sm font-semibold tabular-nums">
                      {stats.routeCount}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <section aria-labelledby="methods-heading" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2
                  id="methods-heading"
                  className="text-foreground text-base font-semibold tracking-tight"
                >
                  Routes by method
                </h2>
                {stats.routeCount > 0 ? (
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">
                    {stats.routeCount} total
                  </span>
                ) : null}
              </div>

              <div className="bg-card/40 border-border/60 space-y-4 rounded-2xl border p-4 shadow-xs backdrop-blur-xs">
                {stats.routeCount === 0 ? (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    No routes yet. Add your first route from a project canvas.
                  </p>
                ) : (
                  <>
                    {/* Material 3 Segmented Distribution Strip */}
                    <div
                      aria-hidden="true"
                      className="bg-muted/50 border-border/40 flex h-2.5 w-full items-center gap-1 overflow-hidden rounded-full border p-0.5"
                    >
                      {METHOD_ORDER.map((method) => {
                        const count = stats.methodCounts[method];
                        if (count === 0) return null;
                        const config = METHOD_M3_CONFIGS[method];
                        return (
                          <div
                            key={method}
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              flex: count,
                              backgroundColor: config.color,
                            }}
                            title={`${method}: ${count} routes`}
                          />
                        );
                      })}
                    </div>

                    {/* Method rows with Material Design 3 Linear Progress Indicators */}
                    <div className="space-y-3">
                      {METHOD_ORDER.map((method) => {
                        const count = stats.methodCounts[method];
                        const percent =
                          stats.routeCount > 0
                            ? Math.round((count / stats.routeCount) * 100)
                            : 0;
                        const config = METHOD_M3_CONFIGS[method];

                        return (
                          <div
                            key={method}
                            className="group hover:bg-muted/30 -mx-1.5 space-y-1.5 rounded-lg px-1.5 py-1 transition-colors"
                          >
                            <div className="flex items-center justify-between text-xs">
                              {/* M3 Tonal Assist Chip */}
                              <span
                                className="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider transition-transform group-hover:scale-[1.02]"
                                style={{
                                  backgroundColor: config.bgTint,
                                  color: config.color,
                                  border: `1px solid ${config.borderTint}`,
                                }}
                              >
                                {method}
                              </span>

                              {/* M3 Metrics Display */}
                              <div className="flex items-baseline gap-1.5 tabular-nums">
                                <span className="text-foreground text-xs font-semibold">
                                  {count}
                                </span>
                                <span className="text-muted-foreground/70 text-[11px]">
                                  {percent}%
                                </span>
                              </div>
                            </div>

                            {/* M3 Tactile Linear Progress Track */}
                            <div
                              aria-hidden="true"
                              className="relative h-2 w-full overflow-hidden rounded-full transition-colors"
                              style={{
                                backgroundColor: config.trackBg,
                              }}
                            >
                              <div
                                className="relative h-full rounded-full transition-[width] duration-500 ease-out"
                                style={{
                                  width: `${percent}%`,
                                  backgroundColor: config.color,
                                }}
                              >
                                {percent > 0 ? (
                                  <div
                                    className="absolute top-1/2 right-0.5 size-1 -translate-y-1/2 rounded-full bg-white/70 shadow-xs"
                                    aria-hidden="true"
                                  />
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </section>

            <section aria-labelledby="recent-heading" className="space-y-3">
              <h2
                id="recent-heading"
                className="text-foreground text-base font-semibold tracking-tight"
              >
                Recently updated
              </h2>
              <div className="bg-card/30 border-border/50 rounded-xl border p-2 shadow-sm">
                <ul className="divide-border/50 divide-y">
                  {recentProjects.map((project) => (
                    <li key={project.id}>
                      <Link
                        href={getProjectUrl(project.slug, "canvas")}
                        className="group hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-offset-background flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                      >
                        <span className="min-w-0">
                          <span className="text-foreground group-hover:text-primary block truncate text-sm font-medium transition-colors">
                            {project.name}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {formatRelativeTime(project.updatedAt)}
                          </span>
                        </span>
                        <RiArrowRightSLine
                          aria-hidden="true"
                          className="text-muted-foreground group-hover:text-foreground h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section aria-labelledby="actions-heading" className="space-y-3">
              <h2
                id="actions-heading"
                className="text-foreground text-base font-semibold tracking-tight"
              >
                Quick actions
              </h2>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={triggerCreateProject}
                  className="w-full justify-start"
                >
                  <RiAddLine aria-hidden="true" className="h-4 w-4" />
                  New workspace
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={openCommandMenu}
                  className="w-full justify-start"
                >
                  <RiCommandLine aria-hidden="true" className="h-4 w-4" />
                  Search everything
                </Button>
                <Button
                  variant="outline"
                  nativeButton={false}
                  className="w-full justify-start"
                  render={<Link href="/activity" />}
                >
                  <RiFileList3Line aria-hidden="true" className="h-4 w-4" />
                  Activity logs
                </Button>
              </div>
            </section>
          </aside>

          {/* Project list */}
          <div
            aria-busy={isPending}
            className="order-1 min-w-0 flex-1 space-y-4 md:order-2 md:space-y-5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-foreground text-base font-semibold tracking-tight">
                {search ? "Results" : "Projects"}
              </h2>
              <p
                aria-live="polite"
                className="text-muted-foreground flex items-center gap-1.5 text-xs tabular-nums"
              >
                {isPending ? (
                  <RiLoader2Line
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                  />
                ) : null}
                {filteredProjects.length}{" "}
                {filteredProjects.length === 1 ? "workspace" : "workspaces"}
              </p>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="bg-card/30 border-border/50 flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center shadow-sm sm:py-16">
                <div className="bg-primary/10 text-primary mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                  <RiTerminalBoxLine aria-hidden="true" className="h-7 w-7" />
                </div>
                <h3 className="text-foreground text-lg font-semibold">
                  No matching workspaces
                </h3>
                <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
                  Nothing matches “{search}”. Try a different name, slug, or
                  description.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6"
                  onClick={() => {
                    void setSearch(null);
                    searchRef.current?.focus();
                  }}
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div
                className={cn(
                  "transition-opacity duration-200 ease-out motion-reduce:transition-none",
                  isPending && "opacity-60",
                  viewMode === "grid"
                    ? "grid grid-cols-1 gap-4 xl:gap-5 sm:grid-cols-2"
                    : "flex flex-col gap-3",
                )}
              >
                {filteredProjects.map((project, index) => {
                  const endpoints = project.endpoints ?? [];
                  const routeCount = endpoints.reduce(
                    (total, endpoint) => total + (endpoint.routes?.length ?? 0),
                    0,
                  );

                  return (
                    <article
                      key={project.id}
                      style={
                        {
                          "--enter-delay": `${Math.min(index, 8) * 40}ms`,
                        } as React.CSSProperties
                      }
                      className={cn(
                        "dashboard-card-enter group bg-card/30 border-border/50 hover:border-border hover:shadow-md relative flex flex-col gap-4 overflow-hidden rounded-xl border p-5 transition-all duration-200 ease-out",
                        "has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-offset-background has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-offset-2",
                        viewMode === "list" && "sm:p-4",
                      )}
                    >
                      {/* Whole-card navigation target; actions sit above it. */}
                      <Link
                        href={getProjectUrl(project.slug, "canvas")}
                        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none"
                      >
                        <span className="sr-only">
                          Open workspace {project.name}
                        </span>
                      </Link>

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="from-primary/20 to-primary/5 text-primary ring-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-b ring-1">
                            <RiTerminalBoxLine
                              aria-hidden="true"
                              className="h-5 w-5"
                            />
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <h3 className="text-foreground group-hover:text-primary truncate text-base font-semibold tracking-tight transition-colors">
                              {project.name}
                            </h3>
                            <span className="text-muted-foreground truncate font-mono text-xs">
                              /{project.slug}
                            </span>
                          </div>
                        </div>

                        <div className="relative z-20 flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            aria-label={`Workspace settings for ${project.name}`}
                            title="Workspace settings"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setProjectToEdit(project);
                            }}
                            className="border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-11 w-11 items-center justify-center rounded-lg border shadow-sm transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 sm:h-8 sm:w-8"
                          >
                            <RiSettings3Line
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete workspace ${project.name}`}
                            title="Delete workspace"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setProjectToDelete(project);
                            }}
                            className="border-border bg-card text-muted-foreground hover:text-destructive hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-11 w-11 items-center justify-center rounded-lg border shadow-sm transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 sm:h-8 sm:w-8"
                          >
                            <RiDeleteBin6Line
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                          </button>
                        </div>
                      </div>

                      <p
                        className={cn(
                          "text-muted-foreground text-sm leading-relaxed",
                          viewMode === "list" ? "line-clamp-1" : "line-clamp-2",
                        )}
                      >
                        {project.description ||
                          "No description yet. Open the workspace to document what it mocks."}
                      </p>

                      <div className="text-muted-foreground border-border/50 mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <RiPulseLine
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                          <span className="tabular-nums">
                            {endpoints.length}
                          </span>
                          {endpoints.length === 1 ? "endpoint" : "endpoints"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <RiRouteLine
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                          <span className="tabular-nums">{routeCount}</span>
                          {routeCount === 1 ? "route" : "routes"}
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1.5">
                          <RiTimeLine
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                          {formatRelativeTime(project.updatedAt)}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-card/30 border-border/50 flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center shadow-sm">
          <div className="bg-primary/10 text-primary mb-5 flex h-16 w-16 items-center justify-center rounded-full">
            <RiTerminalBoxLine aria-hidden="true" className="h-8 w-8" />
          </div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">
            Create your first workspace
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
            A workspace groups related mock endpoints. Create one, then draw
            routes on the canvas or add them by hand.
          </p>
          <Button type="button" onClick={triggerCreateProject} className="mt-6">
            <RiAddLine aria-hidden="true" className="h-4 w-4" />
            New workspace
          </Button>
        </div>
      )}

      {/* Edit Settings Dialog */}
      <Dialog
        open={!!projectToEdit}
        onOpenChange={(open) => {
          if (!open) {
            setProjectToEdit(null);
            setEditName("");
            setEditSlug("");
            setEditDescription("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Workspace Settings</DialogTitle>
              <DialogDescription>
                Modify workspace metadata and namespace configurations.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="edit-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g., Billing Service"
                  maxLength={100}
                  disabled={editLoading || isPending}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="edit-slug" className="text-sm font-medium">
                  Namespace Slug
                </label>
                <Input
                  id="edit-slug"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  placeholder="e.g., billing-service"
                  maxLength={100}
                  disabled={editLoading || isPending}
                />
                <span className="text-muted-foreground text-xs">
                  Mock base URL:{" "}
                  <code className="bg-muted text-caption rounded-sm px-1 py-0.5 font-mono">
                    /{editSlug || "slug"}
                  </code>
                  . Lowercase alphanumeric with hyphens.
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="edit-description"
                  className="text-sm font-medium"
                >
                  Description
                </label>
                <Input
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="e.g., Mocking stripe endpoints for dev"
                  maxLength={500}
                  disabled={editLoading || isPending}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProjectToEdit(null)}
                disabled={editLoading || isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editLoading || isPending}
                aria-disabled={editLoading || isPending}
              >
                {editLoading || isPending ? (
                  <>
                    <RiLoader2Line
                      className="h-4 w-4 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!projectToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setProjectToDelete(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle variant="destructive">Delete Workspace</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong className="text-foreground font-semibold">
                {projectToDelete?.name}
              </strong>
              ? All endpoints, routes, schemas, and historical logs will be
              permanently wiped.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-muted-foreground text-xs">
              To verify deletion, type the workspace name{" "}
              <strong className="text-foreground select-all">
                {projectToDelete?.name}
              </strong>{" "}
              below:
            </p>
            <Input
              size="sm"
              variant="mono"
              aria-label="Workspace name confirmation"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={projectToDelete?.name}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProjectToDelete(null)}
              disabled={deleteLoading || isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={
                deleteLoading ||
                isPending ||
                deleteConfirmText !== projectToDelete?.name
              }
              aria-disabled={deleteLoading || isPending}
            >
              {(deleteLoading || isPending) && (
                <RiLoader2Line
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              <span>Permanently Delete</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
