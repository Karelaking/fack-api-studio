"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  RiGitBranchLine,
  RiPulseLine,
  RiFileHistoryLine,
  RiStickyNoteLine,
  RiSettings2Line,
  RiSaveLine,
  RiSave3Line,
  RiSparkling2Fill,
  RiUploadCloud2Line,
  RiDownloadLine,
  RiAddLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getProjectUrl } from "@/lib/utils/project-slug";
import {
  Menubar,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { OPEN_AGENT_COMPOSER_EVENT } from "@/lib/ai/agent-events";
import { useOptionalProject } from "@/components/project/ProjectContext";

interface SectionMenuBarProps {
  projectSlug: string;
}

/**
 * Unified Section Menu Bar for the project top navigation bar.
 *
 * Consolidates all navigation tabs (Canvas, Endpoints, Logs, Notes, Settings)
 * and all action controls (Save .fack, Save Layout, Add Route, AI Architect,
 * OpenAPI Import/Export) into a clean, desktop-grade Menubar component.
 */
export const SectionMenuBar = ({
  projectSlug,
}: SectionMenuBarProps): React.JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();
  const currentProject = useOptionalProject();

  const isCanvasActive = pathname.endsWith("/canvas");
  const isEndpointsActive = pathname.endsWith("/endpoints");
  const isLogsActive = pathname.endsWith("/logs");
  const isNotesActive = pathname.endsWith("/notes");
  const isSettingsActive = pathname.endsWith("/settings");

  const [isSavingLayout, setIsSavingLayout] = React.useState(false);
  const [isSavingFack, setIsSavingFack] = React.useState(false);

  React.useEffect(() => {
    const handleSaveStart = () => setIsSavingLayout(true);
    const handleSaveEnd = () => setIsSavingLayout(false);

    window.addEventListener("canvas-save-start", handleSaveStart);
    window.addEventListener("canvas-save-end", handleSaveEnd);

    return () => {
      window.removeEventListener("canvas-save-start", handleSaveStart);
      window.removeEventListener("canvas-save-end", handleSaveEnd);
    };
  }, []);

  const dispatchCanvasCommand = (command: string) => {
    window.dispatchEvent(new CustomEvent(command));
  };

  const projectId = currentProject?.id;

  const handleSaveFack = React.useCallback(async () => {
    if (!projectId) return;
    setIsSavingFack(true);
    try {
      const res = await fetch("/api/file-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          projectId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Saved to .fack file", {
          description: data.filePath,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save project",
      );
    } finally {
      setIsSavingFack(false);
    }
  }, [projectId]);

  const handleOpenAiArchitect = React.useCallback(() => {
    dispatchCanvasCommand(OPEN_AGENT_COMPOSER_EVENT);
  }, []);

  const handleOpenImportOpenApi = React.useCallback(() => {
    dispatchCanvasCommand("open-import-openapi-dialog");
  }, []);

  const handleExportOpenApi = React.useCallback(() => {
    window.open(`/api/projects/${projectSlug}/openapi`, "_blank");
  }, [projectSlug]);

  const handleAddRoute = React.useCallback(() => {
    dispatchCanvasCommand("open-add-route-dialog");
  }, []);

  const handleSaveCanvasLayout = React.useCallback(() => {
    dispatchCanvasCommand("canvas-save");
  }, []);

  // Keyboard navigation shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when actively typing in input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const isModifier = e.metaKey || e.ctrlKey;
      if (isModifier) {
        if (e.key === "1") {
          e.preventDefault();
          router.push(getProjectUrl(projectSlug, "canvas"));
        } else if (e.key === "2") {
          e.preventDefault();
          router.push(getProjectUrl(projectSlug, "endpoints"));
        } else if (e.key === "3") {
          e.preventDefault();
          router.push(getProjectUrl(projectSlug, "logs"));
        } else if (e.key === "4") {
          e.preventDefault();
          router.push(getProjectUrl(projectSlug, "notes"));
        } else if (e.key === "5") {
          e.preventDefault();
          router.push(getProjectUrl(projectSlug, "settings"));
        } else if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          void handleSaveFack();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [projectSlug, router, handleSaveFack]);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Menubar className="border-border/60 bg-muted/20 flex h-8 items-center rounded-md border px-1">
        {/* ── File Menu ────────────────────────────────────────────── */}
        <MenubarMenu>
          <MenubarTrigger className="h-6 cursor-pointer px-2 text-xs font-medium">
            File
          </MenubarTrigger>
          <MenubarContent align="start" className="min-w-52">
            <MenubarGroup>
              <MenubarItem
                onClick={handleSaveFack}
                disabled={isSavingFack || !currentProject}
                className="cursor-pointer text-xs"
              >
                <RiSave3Line
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Save to .fack</span>
                <MenubarShortcut>⌘S</MenubarShortcut>
              </MenubarItem>
              {isCanvasActive && (
                <MenubarItem
                  onClick={handleSaveCanvasLayout}
                  disabled={isSavingLayout}
                  className="cursor-pointer text-xs"
                >
                  <RiSaveLine
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>Save Canvas Layout</span>
                  <MenubarShortcut>⌘L</MenubarShortcut>
                </MenubarItem>
              )}
            </MenubarGroup>
            <MenubarSeparator />
            <MenubarGroup>
              <MenubarItem
                onClick={handleOpenImportOpenApi}
                className="cursor-pointer text-xs"
              >
                <RiUploadCloud2Line
                  className="text-info h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Import OpenAPI</span>
              </MenubarItem>
              <MenubarItem
                onClick={handleExportOpenApi}
                className="cursor-pointer text-xs"
              >
                <RiDownloadLine
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Export OpenAPI</span>
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Canvas Section Menu ──────────────────────────────────── */}
        <MenubarMenu>
          <MenubarTrigger
            className={cn(
              "flex h-6 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors",
              isCanvasActive &&
                "bg-secondary text-secondary-foreground font-semibold shadow-xs",
            )}
          >
            <RiGitBranchLine className="size-3.5 shrink-0" aria-hidden="true" />
            <span>Canvas</span>
          </MenubarTrigger>
          <MenubarContent align="start" className="min-w-56">
            <MenubarGroup>
              <MenubarItem
                onClick={() =>
                  router.push(getProjectUrl(projectSlug, "canvas"))
                }
                className="cursor-pointer text-xs font-medium"
              >
                <RiGitBranchLine
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Go to Canvas</span>
                <MenubarShortcut>⌘1</MenubarShortcut>
              </MenubarItem>
            </MenubarGroup>
            <MenubarSeparator />
            <MenubarGroup>
              <MenubarItem
                onClick={handleAddRoute}
                className="cursor-pointer text-xs"
              >
                <RiAddLine
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Add Route Node</span>
                <MenubarShortcut>⌘R</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                onClick={handleOpenAiArchitect}
                className="cursor-pointer text-xs"
              >
                <RiSparkling2Fill
                  className="text-primary h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>AI Architect</span>
                <MenubarShortcut>⌘K</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                onClick={handleSaveCanvasLayout}
                disabled={isSavingLayout}
                className="cursor-pointer text-xs"
              >
                <RiSaveLine
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Save Canvas Layout</span>
                <MenubarShortcut>⌘L</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                onClick={handleExportOpenApi}
                className="cursor-pointer text-xs"
              >
                <RiDownloadLine
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Export OpenAPI Specs</span>
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Endpoints Section Menu ──────────────────────────────── */}
        <MenubarMenu>
          <MenubarTrigger
            className={cn(
              "flex h-6 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors",
              isEndpointsActive &&
                "bg-secondary text-secondary-foreground font-semibold shadow-xs",
            )}
          >
            <RiPulseLine className="size-3.5 shrink-0" aria-hidden="true" />
            <span>Endpoints</span>
          </MenubarTrigger>
          <MenubarContent align="start" className="min-w-52">
            <MenubarGroup>
              <MenubarItem
                onClick={() =>
                  router.push(getProjectUrl(projectSlug, "endpoints"))
                }
                className="cursor-pointer text-xs font-medium"
              >
                <RiPulseLine
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Go to Endpoints</span>
                <MenubarShortcut>⌘2</MenubarShortcut>
              </MenubarItem>
            </MenubarGroup>
            <MenubarSeparator />
            <MenubarGroup>
              <MenubarItem
                onClick={handleExportOpenApi}
                className="cursor-pointer text-xs"
              >
                <RiDownloadLine
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Export OpenAPI Specs</span>
              </MenubarItem>
              <MenubarItem
                onClick={handleOpenImportOpenApi}
                className="cursor-pointer text-xs"
              >
                <RiUploadCloud2Line
                  className="text-info h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Import OpenAPI Specs</span>
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Logs Section Menu ────────────────────────────────────── */}
        <MenubarMenu>
          <MenubarTrigger
            className={cn(
              "flex h-6 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors",
              isLogsActive &&
                "bg-secondary text-secondary-foreground font-semibold shadow-xs",
            )}
          >
            <RiFileHistoryLine
              className="size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>Logs</span>
          </MenubarTrigger>
          <MenubarContent align="start" className="min-w-48">
            <MenubarGroup>
              <MenubarItem
                onClick={() => router.push(getProjectUrl(projectSlug, "logs"))}
                className="cursor-pointer text-xs font-medium"
              >
                <RiFileHistoryLine
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Go to Request Logs</span>
                <MenubarShortcut>⌘3</MenubarShortcut>
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Notes Section Menu ───────────────────────────────────── */}
        <MenubarMenu>
          <MenubarTrigger
            className={cn(
              "flex h-6 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors",
              isNotesActive &&
                "bg-secondary text-secondary-foreground font-semibold shadow-xs",
            )}
          >
            <RiStickyNoteLine
              className="size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>Notes</span>
          </MenubarTrigger>
          <MenubarContent align="start" className="min-w-48">
            <MenubarGroup>
              <MenubarItem
                onClick={() => router.push(getProjectUrl(projectSlug, "notes"))}
                className="cursor-pointer text-xs font-medium"
              >
                <RiStickyNoteLine
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Go to Project Notes</span>
                <MenubarShortcut>⌘4</MenubarShortcut>
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Settings Section Menu ────────────────────────────────── */}
        <MenubarMenu>
          <MenubarTrigger
            className={cn(
              "flex h-6 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors",
              isSettingsActive &&
                "bg-secondary text-secondary-foreground font-semibold shadow-xs",
            )}
          >
            <RiSettings2Line className="size-3.5 shrink-0" aria-hidden="true" />
            <span>Settings</span>
          </MenubarTrigger>
          <MenubarContent align="start" className="min-w-48">
            <MenubarGroup>
              <MenubarItem
                onClick={() =>
                  router.push(getProjectUrl(projectSlug, "settings"))
                }
                className="cursor-pointer text-xs font-medium"
              >
                <RiSettings2Line
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Go to Settings</span>
                <MenubarShortcut>⌘5</MenubarShortcut>
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  );
};

export default SectionMenuBar;
