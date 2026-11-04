"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryState, parseAsBoolean } from "nuqs";
import { RiLoader2Line, RiFileCopyLine } from "@remixicon/react";
import { toast } from "sonner";
import { createProject } from "@/lib/actions/projects";
import type { Project } from "@/db/schema";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, slugifyPath } from "@/lib/utils";
import { getProjectUrl } from "@/lib/utils/project-slug";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
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

export const DashboardSidebar = ({
  initialProjects,
  appVersion,
}: DashboardSidebarProps): React.JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();
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
      <Sidebar>
        <SidebarHeader className="border-border/50 flex flex-row items-center justify-between border-b px-3 py-3">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-base font-bold tracking-tight"
          >
            <span className="flex size-6 shrink-0 items-center justify-center transition-transform group-hover:scale-105">
              <BrandLogo size={24} />
            </span>
            <span className="text-foreground">Fack API&apos;s</span>
          </Link>
          {activeProject && (
            <span className="bg-muted text-muted-foreground max-w-36 truncate rounded-md px-2 py-0.5 font-mono text-[11px] font-medium">
              {activeProject.name}
            </span>
          )}
        </SidebarHeader>

        <SidebarContent className="scrollbar-subtle flex-1 overflow-y-auto px-1 py-1">
          {/* Canvas Mock Data Providers (displayed in the left sidebar) */}
          <SidebarProvidersSection selectedRoute={selectedRoute} />

          {/* Dynamic Selected Route Links Section */}
          {selectedRoute && (
            <SidebarGroup className="mt-3">
              <div className="border-border/50 border-t pt-3">
                <SidebarGroupLabel className="flex items-center justify-between">
                  <span>Selected Route Link</span>
                </SidebarGroupLabel>
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
                        ) &&
                          "border-border/50 bg-muted/20 text-muted-foreground",
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
                        className="h-9 w-9 shrink-0 md:h-7 md:w-7"
                        title="Copy Mock Endpoint URL"
                        aria-label="Copy Mock Endpoint URL"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              selectedRoute.mockUrl,
                            );
                            toast.success("Mock link copied!");
                          } catch {
                            toast.error("Failed to copy link");
                          }
                        }}
                      >
                        <RiFileCopyLine
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
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
                              className="h-9 w-9 shrink-0 md:h-6 md:w-6"
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
                              <RiFileCopyLine
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="flex flex-row items-center justify-between">
          <div className="text-muted-foreground truncate font-mono text-xs">
            v{appVersion}
          </div>
          <ThemeToggle />
        </SidebarFooter>
      </Sidebar>

      {/* New Project Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="sm:max-w-106.25">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>New Workspace</DialogTitle>
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
                title="Create Workspace"
                aria-label="Create Workspace"
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
                  <span>Create Workspace</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
