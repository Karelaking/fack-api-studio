"use client";

import * as React from "react";
import Link from "next/link";
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
  RiLoader2Line,
} from "@remixicon/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getProjectUrl } from "@/lib/utils/project-slug";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

interface TopNavMenuBarProps {
  projectSlug: string;
}

const SECTIONS = [
  { name: "Canvas", path: "canvas", icon: RiGitBranchLine, shortcut: "⌘1" },
  { name: "Endpoints", path: "endpoints", icon: RiPulseLine, shortcut: "⌘2" },
  { name: "Logs", path: "logs", icon: RiFileHistoryLine, shortcut: "⌘3" },
  { name: "Notes", path: "notes", icon: RiStickyNoteLine, shortcut: "⌘4" },
  { name: "Settings", path: "settings", icon: RiSettings2Line, shortcut: "⌘5" },
] as const;

/**
 * Top navigation bar component unifying the project sections and menubar commands.
 *
 * Implements shadcn / Base UI Menubar to host project navigation, file exports,
 * layout saving, and AI composer actions directly on the top bar.
 */
export const TopNavMenuBar = ({
  projectSlug,
}: TopNavMenuBarProps): React.JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();
  const currentProject = useOptionalProject();

  const isCanvasPage = pathname.endsWith("/canvas");
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

  const handleSaveFack = async () => {
    if (!currentProject?.id) return;
    setIsSavingFack(true);
    try {
      const res = await fetch("/api/file-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          projectId: currentProject.id,
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
  };

  const handleOpenAiArchitect = () => {
    dispatchCanvasCommand(OPEN_AGENT_COMPOSER_EVENT);
  };

  const handleOpenImportOpenApi = () => {
    dispatchCanvasCommand("open-import-openapi-dialog");
  };

  const handleExportOpenApi = () => {
    window.open(`/api/projects/${projectSlug}/openapi`, "_blank");
  };

  const handleAddRoute = () => {
    dispatchCanvasCommand("open-add-route-dialog");
  };

  const handleSaveCanvasLayout = () => {
    dispatchCanvasCommand("canvas-save");
  };

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      {/* ── Left: Section Tabs & Menubar ─────────────────────────── */}
      <div className="flex min-w-0 items-center gap-2">
        {/* Visible Section Navigation Tabs */}
        <nav
          aria-label="Project sections"
          className="hidden items-center gap-1 sm:flex"
        >
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = pathname.endsWith(`/${section.path}`);

            return (
              <Link
                key={section.path}
                href={getProjectUrl(projectSlug, section.path)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{section.name}</span>
              </Link>
            );
          })}
        </nav>

        <Separator
          orientation="vertical"
          className="hidden h-4 shrink-0 sm:block"
        />

        {/* Desktop Application Menubar */}
        <Menubar className="border-border/60 bg-muted/20 flex h-8 items-center rounded-md border px-1">
          {/* File Menu */}
          <MenubarMenu>
            <MenubarTrigger className="h-6 cursor-pointer px-2 text-xs font-medium">
              File
            </MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem
                  onClick={handleSaveFack}
                  disabled={isSavingFack || !currentProject}
                  className="cursor-pointer text-xs"
                >
                  <RiSave3Line className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Save to .fack</span>
                  <MenubarShortcut>⌘S</MenubarShortcut>
                </MenubarItem>
                {isCanvasPage && (
                  <MenubarItem
                    onClick={handleSaveCanvasLayout}
                    disabled={isSavingLayout}
                    className="cursor-pointer text-xs"
                  >
                    <RiSaveLine className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Save Canvas Layout</span>
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
                    className="text-info h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  <span>Import OpenAPI</span>
                </MenubarItem>
                <MenubarItem
                  onClick={handleExportOpenApi}
                  className="cursor-pointer text-xs"
                >
                  <RiDownloadLine className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Export OpenAPI</span>
                </MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>

          {/* Canvas Section Menu */}
          <MenubarMenu>
            <MenubarTrigger className="h-6 cursor-pointer px-2 text-xs font-medium">
              Canvas
            </MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem
                  onClick={() =>
                    router.push(getProjectUrl(projectSlug, "canvas"))
                  }
                  className="cursor-pointer text-xs"
                >
                  <RiGitBranchLine className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Open Canvas</span>
                  <MenubarShortcut>⌘1</MenubarShortcut>
                </MenubarItem>
                <MenubarItem
                  onClick={handleAddRoute}
                  className="cursor-pointer text-xs"
                >
                  <RiAddLine className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Add Route Node</span>
                  <MenubarShortcut>⌘R</MenubarShortcut>
                </MenubarItem>
                <MenubarItem
                  onClick={handleOpenAiArchitect}
                  className="cursor-pointer text-xs"
                >
                  <RiSparkling2Fill
                    className="text-primary h-3.5 w-3.5"
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
                  <RiSaveLine className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Save Canvas Layout</span>
                </MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>

          {/* Endpoints Section Menu */}
          <MenubarMenu>
            <MenubarTrigger className="h-6 cursor-pointer px-2 text-xs font-medium">
              Endpoints
            </MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem
                  onClick={() =>
                    router.push(getProjectUrl(projectSlug, "endpoints"))
                  }
                  className="cursor-pointer text-xs"
                >
                  <RiPulseLine className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>View All Endpoints</span>
                  <MenubarShortcut>⌘2</MenubarShortcut>
                </MenubarItem>
                <MenubarItem
                  onClick={handleExportOpenApi}
                  className="cursor-pointer text-xs"
                >
                  <RiDownloadLine className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Export OpenAPI Specs</span>
                </MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>

          {/* Logs Section Menu */}
          <MenubarMenu>
            <MenubarTrigger className="h-6 cursor-pointer px-2 text-xs font-medium">
              Logs
            </MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem
                  onClick={() =>
                    router.push(getProjectUrl(projectSlug, "logs"))
                  }
                  className="cursor-pointer text-xs"
                >
                  <RiFileHistoryLine
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  <span>View Request Logs</span>
                  <MenubarShortcut>⌘3</MenubarShortcut>
                </MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>

          {/* Notes Section Menu */}
          <MenubarMenu>
            <MenubarTrigger className="h-6 cursor-pointer px-2 text-xs font-medium">
              Notes
            </MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem
                  onClick={() =>
                    router.push(getProjectUrl(projectSlug, "notes"))
                  }
                  className="cursor-pointer text-xs"
                >
                  <RiStickyNoteLine
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  <span>Open Notes</span>
                  <MenubarShortcut>⌘4</MenubarShortcut>
                </MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>

          {/* Settings Section Menu */}
          <MenubarMenu>
            <MenubarTrigger className="h-6 cursor-pointer px-2 text-xs font-medium">
              Settings
            </MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem
                  onClick={() =>
                    router.push(getProjectUrl(projectSlug, "settings"))
                  }
                  className="cursor-pointer text-xs"
                >
                  <RiSettings2Line className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Project Settings</span>
                  <MenubarShortcut>⌘5</MenubarShortcut>
                </MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      {/* ── Right: Action Buttons ─────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2">
        {currentProject && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="Save project to .fack file"
            aria-label="Save project to .fack file"
            onClick={handleSaveFack}
            disabled={isSavingFack}
            className="hidden sm:inline-flex"
          >
            {isSavingFack ? (
              <RiLoader2Line className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
            ) : (
              <RiSave3Line className="text-muted-foreground h-3.5 w-3.5" />
            )}
            <span>Save .fack</span>
          </Button>
        )}

        {isCanvasPage && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Save Layout"
              aria-label="Save Layout"
              onClick={handleSaveCanvasLayout}
              disabled={isSavingLayout}
            >
              {isSavingLayout ? (
                <RiLoader2Line
                  className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <RiSaveLine className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {isSavingLayout ? "Saving..." : "Save Layout"}
              </span>
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              title="Add Route"
              aria-label="Add Route"
              onClick={handleAddRoute}
            >
              <RiAddLine className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Add Route</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default TopNavMenuBar;
