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
  RiMore2Fill,
  RiLoader2Line,
  RiPlayLine,
  RiFileCodeLine,
  RiCodeLine,
  RiFileCopyLine,
  RiCheckLine,
  RiDeleteBin6Line,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { OPEN_AGENT_COMPOSER_EVENT } from "@/lib/ai/agent-events";
import { useOptionalProject } from "@/components/project/ProjectProvider";
import { useCanvasDndStore } from "@/stores/canvas-dnd-store-provider";
import { type InspectorTab } from "@/stores/canvas-dnd-store";

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

  const selectedRouteId = useCanvasDndStore((s) => s.selectedRouteId);
  const setInspectorTab = useCanvasDndStore((s) => s.setInspectorTab);

  const switchInspectorTab = React.useCallback(
    (tab: InspectorTab) => {
      setInspectorTab(tab);
      toast.info(
        `Switched Inspector to ${tab.charAt(0).toUpperCase() + tab.slice(1)}`,
      );
    },
    [setInspectorTab],
  );

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

      if (isCanvasActive && selectedRouteId && e.altKey) {
        if (e.key === "1") {
          e.preventDefault();
          switchInspectorTab("config");
        } else if (e.key === "2") {
          e.preventDefault();
          switchInspectorTab("schema");
        } else if (e.key === "3") {
          e.preventDefault();
          switchInspectorTab("rules");
        } else if (e.key === "4") {
          e.preventDefault();
          switchInspectorTab("chaos");
        } else if (e.key === "5") {
          e.preventDefault();
          switchInspectorTab("headers");
        } else if (e.key === "6") {
          e.preventDefault();
          switchInspectorTab("try");
        }
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
          if (e.shiftKey) {
            handleSaveCanvasLayout();
          } else {
            void handleSaveFack();
          }
        } else if (e.shiftKey && (e.key === "r" || e.key === "R")) {
          e.preventDefault();
          handleAddRoute();
        } else if (e.key === "i" || e.key === "I") {
          e.preventDefault();
          handleOpenAiArchitect();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    projectSlug,
    router,
    isCanvasActive,
    selectedRouteId,
    switchInspectorTab,
    handleSaveFack,
    handleSaveCanvasLayout,
    handleAddRoute,
    handleOpenAiArchitect,
  ]);

  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
      {/* ── Mobile Compact Actions (< md) ────────────────────────── */}
      <div className="flex items-center gap-1 md:hidden">
        <Button
          type="button"
          size="icon-xs"
          variant="outline"
          onClick={handleSaveFack}
          disabled={isSavingFack || !currentProject}
          className="size-8"
          title="Save project to .fack (⌘S)"
          aria-label="Save project to .fack"
        >
          {isSavingFack ? (
            <RiLoader2Line
              className="size-3.5 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <RiSave3Line className="size-3.5" aria-hidden="true" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="hover:bg-muted text-muted-foreground hover:text-foreground border-border/50 bg-background/50 focus-visible:ring-ring flex size-8 items-center justify-center rounded-md border transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-1"
                aria-label="Quick actions menu"
                title="Quick actions"
              />
            }
          >
            <RiMore2Fill className="size-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={handleSaveFack}
                disabled={isSavingFack || !currentProject}
                className="cursor-pointer text-xs"
              >
                <RiSave3Line
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Save to .fack</span>
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
              {isCanvasActive && (
                <DropdownMenuItem
                  onClick={handleSaveCanvasLayout}
                  disabled={isSavingLayout}
                  className="cursor-pointer text-xs"
                >
                  <RiSaveLine
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>Save Canvas Layout</span>
                  <DropdownMenuShortcut>⇧⌘S</DropdownMenuShortcut>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={handleAddRoute}
                className="cursor-pointer text-xs"
              >
                <RiAddLine
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Add Route Node</span>
                <DropdownMenuShortcut>⇧⌘R</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleOpenAiArchitect}
                className="cursor-pointer text-xs"
              >
                <RiSparkling2Fill
                  className="text-primary h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>AI Architect</span>
                <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={handleOpenImportOpenApi}
                className="cursor-pointer text-xs"
              >
                <RiUploadCloud2Line
                  className="text-info h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Import OpenAPI</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportOpenApi}
                className="cursor-pointer text-xs"
              >
                <RiDownloadLine
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Export OpenAPI</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            {isCanvasActive && selectedRouteId && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <div className="text-micro text-muted-foreground px-2 py-1 font-semibold tracking-wider uppercase">
                    Route Inspector
                  </div>
                  <DropdownMenuItem
                    onClick={() => switchInspectorTab("config")}
                    className="cursor-pointer text-xs"
                  >
                    <RiSettings2Line className="h-3.5 w-3.5 shrink-0" />
                    <span>Config & Status</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => switchInspectorTab("schema")}
                    className="cursor-pointer text-xs"
                  >
                    <RiFileCodeLine className="h-3.5 w-3.5 shrink-0" />
                    <span>Schema & Fields</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => switchInspectorTab("rules")}
                    className="cursor-pointer text-xs"
                  >
                    <RiGitBranchLine className="h-3.5 w-3.5 shrink-0" />
                    <span>Smart Rules</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => switchInspectorTab("chaos")}
                    className="cursor-pointer text-xs"
                  >
                    <RiPulseLine className="h-3.5 w-3.5 shrink-0" />
                    <span>Chaos Simulation</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => switchInspectorTab("headers")}
                    className="cursor-pointer text-xs"
                  >
                    <RiFileHistoryLine className="h-3.5 w-3.5 shrink-0" />
                    <span>Custom Headers</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => switchInspectorTab("try")}
                    className="cursor-pointer text-xs"
                  >
                    <RiPlayLine className="h-3.5 w-3.5 shrink-0" />
                    <span>Try Request</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() =>
                      dispatchCanvasCommand("route-generate-types")
                    }
                    className="cursor-pointer text-xs"
                  >
                    <RiCodeLine className="h-3.5 w-3.5 shrink-0" />
                    <span>Generate TypeScript Types</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => dispatchCanvasCommand("route-copy-schema")}
                    className="cursor-pointer text-xs"
                  >
                    <RiFileCopyLine className="h-3.5 w-3.5 shrink-0" />
                    <span>Copy JSON Schema</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      dispatchCanvasCommand("route-toggle-enabled")
                    }
                    className="cursor-pointer text-xs"
                  >
                    <RiCheckLine className="h-3.5 w-3.5 shrink-0" />
                    <span>Toggle Active/Disabled</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => dispatchCanvasCommand("route-save")}
                    className="cursor-pointer text-xs"
                  >
                    <RiSaveLine className="h-3.5 w-3.5 shrink-0" />
                    <span>Save Route</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Desktop Menubar (>= md) ───────────────────────────────── */}
      <Menubar className="border-border/60 bg-muted/20 hidden h-8 items-center rounded-md border px-1 md:flex">
        {/* ── File Menu ────────────────────────────────────────────── */}
        <MenubarMenu>
          <MenubarTrigger className="h-6.5 cursor-pointer px-2 text-xs font-medium">
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
                  <MenubarShortcut>⇧⌘S</MenubarShortcut>
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
              "flex h-6.5 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors",
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
                <MenubarShortcut>⇧⌘R</MenubarShortcut>
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
                <MenubarShortcut>⌘I</MenubarShortcut>
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
                <MenubarShortcut>⇧⌘S</MenubarShortcut>
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

        {/* ── Route Section Menu ──────────────────────────────────── */}
        {isCanvasActive && (
          <MenubarMenu>
            <MenubarTrigger
              className={cn(
                "flex h-6.5 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors",
                selectedRouteId &&
                  "bg-secondary text-secondary-foreground font-semibold shadow-xs",
              )}
            >
              <RiSettings2Line
                className="size-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>Route</span>
              {selectedRouteId && (
                <span className="bg-primary size-1.5 rounded-full" />
              )}
            </MenubarTrigger>
            <MenubarContent align="start" className="min-w-64">
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
                  <MenubarShortcut>⇧⌘R</MenubarShortcut>
                </MenubarItem>
              </MenubarGroup>

              {selectedRouteId ? (
                <>
                  <MenubarSeparator />
                  <MenubarGroup>
                    <div className="text-micro text-muted-foreground px-2 py-1 font-semibold tracking-wider uppercase">
                      Inspector Categories
                    </div>
                    <MenubarItem
                      onClick={() => switchInspectorTab("config")}
                      className="cursor-pointer text-xs"
                    >
                      <RiSettings2Line
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Config & Status</span>
                      <MenubarShortcut>⌥1</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem
                      onClick={() => switchInspectorTab("schema")}
                      className="cursor-pointer text-xs"
                    >
                      <RiFileCodeLine
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Schema & Fields</span>
                      <MenubarShortcut>⌥2</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem
                      onClick={() => switchInspectorTab("rules")}
                      className="cursor-pointer text-xs"
                    >
                      <RiGitBranchLine
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Smart Rules</span>
                      <MenubarShortcut>⌥3</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem
                      onClick={() => switchInspectorTab("chaos")}
                      className="cursor-pointer text-xs"
                    >
                      <RiPulseLine
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Chaos Simulation</span>
                      <MenubarShortcut>⌥4</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem
                      onClick={() => switchInspectorTab("headers")}
                      className="cursor-pointer text-xs"
                    >
                      <RiFileHistoryLine
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Custom Headers</span>
                      <MenubarShortcut>⌥5</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem
                      onClick={() => switchInspectorTab("try")}
                      className="cursor-pointer text-xs"
                    >
                      <RiPlayLine
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Try Live Request</span>
                      <MenubarShortcut>⌥6</MenubarShortcut>
                    </MenubarItem>
                  </MenubarGroup>

                  <MenubarSeparator />
                  <MenubarGroup>
                    <div className="text-micro text-muted-foreground px-2 py-1 font-semibold tracking-wider uppercase">
                      Route Operations
                    </div>
                    <MenubarItem
                      onClick={() =>
                        dispatchCanvasCommand("route-generate-types")
                      }
                      className="cursor-pointer text-xs"
                    >
                      <RiCodeLine
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Generate TypeScript Types</span>
                    </MenubarItem>
                    <MenubarItem
                      onClick={() => dispatchCanvasCommand("route-copy-schema")}
                      className="cursor-pointer text-xs"
                    >
                      <RiFileCopyLine
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Copy JSON Schema</span>
                    </MenubarItem>
                    <MenubarItem
                      onClick={() =>
                        dispatchCanvasCommand("route-toggle-enabled")
                      }
                      className="cursor-pointer text-xs"
                    >
                      <RiCheckLine
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Toggle Active / Disabled</span>
                    </MenubarItem>
                    <MenubarItem
                      onClick={() => dispatchCanvasCommand("route-save")}
                      className="cursor-pointer text-xs"
                    >
                      <RiSaveLine
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Save Route</span>
                      <MenubarShortcut>⌘S</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem
                      onClick={() => dispatchCanvasCommand("route-delete")}
                      className="text-destructive focus:text-destructive cursor-pointer text-xs"
                    >
                      <RiDeleteBin6Line
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Delete Route</span>
                    </MenubarItem>
                  </MenubarGroup>
                </>
              ) : (
                <div className="text-mini text-muted-foreground px-2 py-2">
                  Select a route on canvas to inspect its config, schema, rules,
                  chaos, headers, and test runner.
                </div>
              )}
            </MenubarContent>
          </MenubarMenu>
        )}

        {/* ── Endpoints Section Menu ──────────────────────────────── */}
        <MenubarMenu>
          <MenubarTrigger
            className={cn(
              "flex h-6.5 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors",
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
              "flex h-6.5 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors",
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
              "flex h-6.5 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors",
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
              "flex h-6.5 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors",
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
