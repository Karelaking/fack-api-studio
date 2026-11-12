"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  DownloadBarDownIcon,
  FloppyIcon,
  PlusIcon,
  RefreshIcon,
  SparkleAi01SolidIcon,
  ThreeDotsMenuHorizontalIcon,
  UploadBarUpIcon,
} from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OPEN_AGENT_COMPOSER_EVENT } from "@/lib/ai/agent-events";
import { useOptionalProject } from "@/components/project/ProjectProvider";

export function HeaderNewProjectButton(): React.JSX.Element | null {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const isProjectPage = segments[0] === "projects" && segments[1];
  const isCanvasPage =
    isProjectPage && segments[segments.length - 1] === "canvas";

  const currentProject = useOptionalProject();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSavingFack, setIsSavingFack] = React.useState(false);

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

  React.useEffect(() => {
    const handleSaveStart = () => setIsSaving(true);
    const handleSaveEnd = () => setIsSaving(false);

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

  if (isCanvasPage) {
    const openAiArchitect = () =>
      dispatchCanvasCommand(OPEN_AGENT_COMPOSER_EVENT);
    const openImportOpenApi = () =>
      dispatchCanvasCommand("open-import-openapi-dialog");
    const exportOpenApi = () => {
      if (segments[1]) {
        window.open(`/api/projects/${segments[1]}/openapi`, "_blank");
      }
    };

    return (
      <div className="flex shrink-0 items-center gap-2">
        {/* Secondary actions: inline only when there is room for the labels. */}
        <div className="hidden items-center gap-2 xl:flex">
          {currentProject && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Save project to .fack file"
              aria-label="Save project to .fack file"
              onClick={handleSaveFack}
              disabled={isSavingFack}
            >
              {isSavingFack ? (
                <PikaIcon
                  icon={RefreshIcon}
                  className="size-3.5 animate-spin motion-reduce:animate-none"
                />
              ) : (
                <PikaIcon
                  icon={FloppyIcon}
                  className="text-muted-foreground size-3.5"
                />
              )}
              <span>Save .fack</span>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="AI Architect"
            aria-label="AI Architect"
            onClick={openAiArchitect}
          >
            <PikaIcon
              icon={SparkleAi01SolidIcon}
              className="text-primary size-3.5"
            />
            <span>AI Architect</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="Import OpenAPI"
            aria-label="Import OpenAPI"
            onClick={openImportOpenApi}
          >
            <PikaIcon icon={UploadBarUpIcon} className="text-info size-3.5" />
            <span>Import OpenAPI</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="Export OpenAPI"
            aria-label="Export OpenAPI"
            onClick={exportOpenApi}
          >
            <PikaIcon icon={DownloadBarDownIcon} className="size-3.5" />
            <span>Export OpenAPI</span>
          </Button>
        </div>

        {/* Below xl the same secondary actions collapse into an overflow menu. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="xl:hidden"
              title="More canvas actions"
              aria-label="More canvas actions"
            >
              <PikaIcon icon={ThreeDotsMenuHorizontalIcon} className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              {currentProject && (
                <DropdownMenuItem onClick={handleSaveFack}>
                  <PikaIcon
                    icon={FloppyIcon}
                    className="text-muted-foreground"
                  />
                  <span>Save .fack</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={openAiArchitect}>
                <PikaIcon
                  icon={SparkleAi01SolidIcon}
                  className="text-primary"
                />
                <span>AI Architect</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openImportOpenApi}>
                <PikaIcon icon={UploadBarUpIcon} className="text-info" />
                <span>Import OpenAPI</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportOpenApi}>
                <PikaIcon icon={DownloadBarDownIcon} />
                <span>Export OpenAPI</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="outline"
          size="sm"
          title="Save Layout"
          aria-label="Save Layout"
          onClick={() => dispatchCanvasCommand("canvas-save")}
          disabled={isSaving}
        >
          {isSaving ? (
            <PikaIcon
              icon={RefreshIcon}
              className="size-3.5 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <PikaIcon
              icon={FloppyIcon}
              className="size-3.5"
              aria-hidden="true"
            />
          )}
          <span className="hidden sm:inline">
            {isSaving ? "Saving..." : "Save Layout"}
          </span>
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          title="Add Route"
          aria-label="Add Route"
          onClick={() => dispatchCanvasCommand("open-add-route-dialog")}
        >
          <PikaIcon icon={PlusIcon} className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Add Route</span>
        </Button>
      </div>
    );
  }

  // If on project subpage (e.g. settings/logs/endpoints), show Save .fack button if available
  if (isProjectPage) {
    if (!currentProject) return null;
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        title="Save project to .fack file"
        aria-label="Save project to .fack file"
        onClick={handleSaveFack}
        disabled={isSavingFack}
      >
        {isSavingFack ? (
          <PikaIcon
            icon={RefreshIcon}
            className="size-3.5 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <PikaIcon
            icon={FloppyIcon}
            className="text-muted-foreground size-3.5"
          />
        )}
        <span>Save .fack</span>
      </Button>
    );
  }

  const handleNewProjectClick = () => {
    window.dispatchEvent(new CustomEvent("open-new-project-dialog"));
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      title="Create New Project"
      aria-label="Create New Project"
      onClick={handleNewProjectClick}
    >
      <PikaIcon icon={PlusIcon} className="size-4" />
      <span className="hidden sm:inline">New Project</span>
    </Button>
  );
}
