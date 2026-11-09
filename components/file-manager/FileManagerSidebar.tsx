"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  RiHardDrive2Line,
  RiAddLine,
  RiFolderOpenLine,
  RiSave3Line,
  RiFileCodeLine,
  RiSettings3Line,
  RiLayoutGridLine,
  RiLoader2Line,
  RiCloseLine,
  RiDownload2Line,
} from "@remixicon/react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProjectUrl } from "@/lib/utils/project-slug";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type {
  OpenProjectSummary,
  RecentFileEntry,
} from "@/lib/file-manager/types";

interface FileManagerSidebarProps {
  workspaceName: string;
}

export function FileManagerSidebar({
  workspaceName,
}: FileManagerSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();

  const [openProjects, setOpenProjects] = React.useState<OpenProjectSummary[]>(
    [],
  );
  const [recents, setRecents] = React.useState<RecentFileEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [savingProjectId, setSavingProjectId] = React.useState<string | null>(
    null,
  );
  const [isOpening, setIsOpening] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch status on mount
  const refreshStatus = React.useCallback(async () => {
    try {
      const response = await fetch("/api/file-manager");
      if (response.ok) {
        const payload = await response.json();
        setOpenProjects(payload.openProjects ?? []);
        setRecents(payload.recents ?? []);
      }
    } catch {
      // Ignore initial fetch errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    void refreshStatus();
  }, [refreshStatus]);

  // Auto-save timer: checks every 30 seconds for dirty projects
  React.useEffect(() => {
    const timer = setInterval(async () => {
      const dirty = openProjects.filter((p) => p.isDirty);
      for (const project of dirty) {
        try {
          const response = await fetch("/api/file-manager", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "save",
              projectId: project.projectId,
            }),
          });
          if (response.ok) {
            setOpenProjects((prev) =>
              prev.map((p) =>
                p.projectId === project.projectId
                  ? {
                      ...p,
                      isDirty: false,
                      lastSavedAt: new Date().toISOString(),
                    }
                  : p,
              ),
            );
          }
        } catch {
          // Ignore auto-save error silently
        }
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [openProjects]);

  // Save project manually
  const handleSave = async (projectId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setSavingProjectId(projectId);
    try {
      const response = await fetch("/api/file-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", projectId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Save failed");
      }
      toast.success("Project saved to file", {
        description: payload.filePath,
      });
      setOpenProjects((prev) =>
        prev.map((p) =>
          p.projectId === projectId
            ? {
                ...p,
                isDirty: false,
                lastSavedAt: payload.savedAt,
                filePath: payload.filePath,
              }
            : p,
        ),
      );
      void refreshStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save file");
    } finally {
      setSavingProjectId(null);
    }
  };

  // Open .fack file from disk
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsOpening(true);
    try {
      const text = await file.text();
      const parsedData = JSON.parse(text);

      const response = await fetch("/api/file-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import-json", data: parsedData }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load project file");
      }

      toast.success(`Project "${payload.project.name}" opened successfully`);
      await refreshStatus();
      router.push(getProjectUrl(payload.project.slug, "canvas"));
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Invalid .fack project file",
      );
    } finally {
      setIsOpening(false);
    }
  };

  // Remove recent file
  const handleRemoveRecent = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await fetch("/api/file-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove-recent", filePath }),
      });
      setRecents((prev) => prev.filter((r) => r.filePath !== filePath));
    } catch {
      // Ignore
    }
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <div className="flex flex-col gap-3 px-2 pt-2">
          {/* Logo & Workspace Title */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="group flex items-center gap-2 text-base font-bold tracking-tight"
            >
              <span className="flex size-6 shrink-0 items-center justify-center transition-transform group-hover:scale-105">
                <BrandLogo size={22} />
              </span>
              <span className="truncate group-data-[collapsible=icon]:hidden">
                {workspaceName}
              </span>
            </Link>
            <Badge
              variant="secondary"
              className="text-mini px-1.5 py-0 font-medium group-data-[collapsible=icon]:hidden"
            >
              <RiHardDrive2Line className="mr-1 h-3 w-3" />
              Local
            </Badge>
          </div>

          {/* Quick File Action Buttons */}
          <div className="grid grid-cols-2 gap-2 group-data-[collapsible=icon]:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("open-new-project-dialog"),
                );
              }}
            >
              <RiAddLine className="mr-1 h-3.5 w-3.5" />
              New Project
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isOpening}
              className="h-8 text-xs font-medium"
              onClick={() => fileInputRef.current?.click()}
            >
              {isOpening ? (
                <RiLoader2Line className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RiFolderOpenLine className="mr-1 h-3.5 w-3.5" />
              )}
              Open .fack
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".fack,.json,application/json"
              className="hidden"
              aria-label="Open .fack file"
              onChange={(e) => void handleFileChange(e)}
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Open Projects Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Open Projects ({openProjects.length})</span>
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            {isLoading ? (
              <div className="text-muted-foreground px-3 py-2 text-xs italic">
                Loading files...
              </div>
            ) : openProjects.length === 0 ? (
              <div className="text-muted-foreground px-3 py-2 text-xs italic">
                No active projects. Open or create a project above.
              </div>
            ) : (
              <SidebarMenu>
                {openProjects.map((project) => {
                  const isActive = pathname.startsWith(
                    `/projects/${project.slug}`,
                  );
                  const isSavingThis = savingProjectId === project.projectId;

                  return (
                    <SidebarMenuItem key={project.projectId}>
                      <SidebarMenuButton
                        isActive={isActive}
                        render={
                          <Link
                            href={getProjectUrl(project.slug, "canvas")}
                            aria-label={project.name}
                          />
                        }
                        className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary group/item relative flex items-center justify-between pr-1 transition-colors"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          {/* Saved / Unsaved Indicator */}
                          <span
                            title={
                              project.isDirty ? "Unsaved changes" : "Saved"
                            }
                            className={`size-2 shrink-0 rounded-full ${
                              project.isDirty
                                ? "bg-warning animate-pulse motion-reduce:animate-none"
                                : "bg-success"
                            }`}
                          />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-xs font-semibold">
                              {project.name}
                            </span>
                            <span className="text-muted-foreground text-mini truncate">
                              {project.routeCount} routes ·{" "}
                              {project.endpointCount} endpoints
                            </span>
                          </div>
                        </div>

                        {/* Save Action Button */}
                        <div className="flex items-center gap-0.5 group-data-[collapsible=icon]:hidden">
                          <button
                            type="button"
                            title="Save to file"
                            aria-label={`Save ${project.name}`}
                            disabled={isSavingThis}
                            onClick={(e) =>
                              void handleSave(project.projectId, e)
                            }
                            className="text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded p-1 transition-colors"
                          >
                            {isSavingThis ? (
                              <RiLoader2Line className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RiSave3Line className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <a
                            href={`/api/file-manager?action=export-json&projectId=${project.projectId}`}
                            download={`${project.slug}.fack`}
                            onClick={(e) => e.stopPropagation()}
                            title="Download .fack file"
                            className="text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded p-1 transition-colors"
                          >
                            <RiDownload2Line className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="px-4">
          <SidebarSeparator />
        </div>

        {/* Recent Files Section */}
        {recents.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>Recent Files</span>
            </SidebarGroupLabel>
            <SidebarGroupContent className="mt-1">
              <SidebarMenu>
                {recents.slice(0, 5).map((recent) => (
                  <SidebarMenuItem key={recent.filePath}>
                    <SidebarMenuButton
                      onClick={() => {
                        router.push(getProjectUrl(recent.slug, "canvas"));
                      }}
                      className="group/recent flex items-center justify-between text-xs"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <RiFileCodeLine className="text-muted-foreground size-3.5 shrink-0" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {recent.fileName}
                          </span>
                          <span className="text-muted-foreground text-mini truncate">
                            {recent.projectName}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove from recents"
                        onClick={(e) =>
                          void handleRemoveRecent(recent.filePath, e)
                        }
                        className="text-muted-foreground hover:text-foreground hidden rounded p-0.5 group-hover/recent:inline-block"
                      >
                        <RiCloseLine className="size-3" />
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className="px-4">
          <SidebarSeparator />
        </div>

        {/* Global Navigation Links */}
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/dashboard"}
                  render={<Link href="/dashboard" aria-label="All Projects" />}
                  className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                >
                  <RiLayoutGridLine className="h-4 w-4" />
                  <span>All Projects</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/settings"}
                  render={
                    <Link href="/settings" aria-label="Settings & Storage" />
                  }
                  className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                >
                  <RiSettings3Line className="h-4 w-4" />
                  <span>Settings &amp; Storage</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="border-border/50 flex w-full items-center justify-between border-t p-3">
          <div className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
            <RiHardDrive2Line className="text-success size-3.5" />
            <span>Local Mode</span>
          </div>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
