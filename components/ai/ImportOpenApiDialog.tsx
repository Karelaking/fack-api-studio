"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  File02Icon,
  MultipleCrossCancelIcon,
  RefreshIcon,
  CheckTickCircleIcon,
} from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ApiChangeSetPreview } from "./ApiChangeSetPreview";
import { ConflictResolutionDialog } from "./ConflictResolutionDialog";
import type {
  GeneratedApi,
  ApiChangeSet,
  RouteConflict,
  ApplyApiResponse,
} from "@/lib/ai/types";

interface ImportOpenApiDialogProps {
  projectId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ImportOpenApiDialog = ({
  projectId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ImportOpenApiDialogProps): React.JSX.Element | null => {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpen = React.useCallback(
    (open: boolean) => {
      if (controlledOnOpenChange) {
        controlledOnOpenChange(open);
      } else {
        setInternalOpen(open);
      }
    },
    [controlledOnOpenChange],
  );

  React.useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("open-import-openapi-dialog", handleOpen);
    return () =>
      window.removeEventListener("open-import-openapi-dialog", handleOpen);
  }, [setOpen]);

  const [openApiString, setOpenApiString] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);

  const [generatedApi, setGeneratedApi] = React.useState<
    GeneratedApi | undefined
  >();
  const [changeSet, setChangeSet] = React.useState<ApiChangeSet | undefined>();
  const [conflicts, setConflicts] = React.useState<RouteConflict[]>([]);
  const [detailedPrompt, setDetailedPrompt] = React.useState<
    string | undefined
  >();
  const [detailedSummary, setDetailedSummary] = React.useState<
    string | undefined
  >();
  const [proposalId, setProposalId] = React.useState<string | undefined>();
  const [expectedVersion, setExpectedVersion] = React.useState<
    number | undefined
  >();
  const [resolutions, setResolutions] = React.useState<
    Record<string, "replace" | "skip" | "modify">
  >({});

  const handleResolutionChange = (
    conflictKey: string,
    resolution: "replace" | "skip" | "modify",
  ) => {
    setResolutions((prev) => ({
      ...prev,
      [conflictKey]: resolution,
    }));
  };

  const handleClose = () => {
    if (isGenerating || isApplying) return;
    setOpen(false);
    setTimeout(() => {
      setOpenApiString("");
      setGeneratedApi(undefined);
      setChangeSet(undefined);
      setConflicts([]);
      setDetailedPrompt(undefined);
      setDetailedSummary(undefined);
      setProposalId(undefined);
      setExpectedVersion(undefined);
      setResolutions({});
    }, 300);
  };

  const handleImport = async () => {
    if (!openApiString.trim()) {
      toast.error("Please paste an OpenAPI schema first");
      return;
    }
    if (!projectId) {
      toast.error("Project ID is missing");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/import/openapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          openApiString,
        }),
      });
      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error || "Failed to import OpenAPI schema");
      }

      setGeneratedApi(payload.generation);
      setChangeSet(payload.changeSet);
      setConflicts(payload.conflicts || []);
      setDetailedPrompt(payload.detailedPrompt);
      setDetailedSummary(payload.detailedSummary);
      setProposalId(payload.proposalId);
      setExpectedVersion(payload.expectedVersion);
      toast.success("OpenAPI schema imported successfully!");
    } catch (err) {
      console.error("[Fack API] Import failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to import API");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!projectId || !proposalId || expectedVersion === undefined) {
      toast.error("Missing required data to apply changes");
      return;
    }

    setIsApplying(true);
    try {
      const response = await fetch("/api/ai/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          proposalId,
          expectedVersion,
          resolutions,
        }),
      });

      const payload = (await response.json()) as ApplyApiResponse;
      if (!payload.success) {
        throw new Error(payload.error || "Failed to apply API changes");
      }

      toast.success(
        `Applied successfully! Created ${payload.created.endpoints} endpoints and ${payload.created.routes} routes.`,
      );
      handleClose();
      router.refresh();
    } catch (err) {
      console.error("[Fack API] Apply failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to apply changes",
      );
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen): void => {
        if (!nextOpen && !isGenerating && !isApplying) {
          handleClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event): void => {
          if (isGenerating || isApplying) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event): void => {
          if (isGenerating || isApplying) {
            event.preventDefault();
          }
        }}
        className="bg-card border-border flex max-h-[90vh] w-full max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border p-0 shadow-2xl sm:max-w-3xl"
      >
        <DialogHeader className="border-border/80 flex-row items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2.5 text-left">
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
              <PikaIcon icon={File02Icon} className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-foreground text-base leading-normal font-bold">
                Import OpenAPI
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Paste your OpenAPI 3.x JSON specification
              </DialogDescription>
            </div>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              disabled={isGenerating || isApplying}
              aria-label="Close dialog"
              className="border-border hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:pointer-events-none disabled:opacity-50"
            >
              <PikaIcon icon={MultipleCrossCancelIcon} className="size-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="scrollbar-subtle flex-1 overflow-y-auto p-6">
          {!generatedApi ? (
            <div className="flex flex-col gap-6">
              <div className="space-y-4">
                <label htmlFor="openapi-specification" className="sr-only">
                  OpenAPI specification
                </label>
                <Textarea
                  id="openapi-specification"
                  placeholder='{ "openapi": "3.0.3", "info": { "title": "My API" }, "paths": { ... } }'
                  className="min-h-75"
                  value={openApiString}
                  onChange={(e) => setOpenApiString(e.target.value)}
                  disabled={isGenerating}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleImport}
                    disabled={!openApiString.trim() || isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <PikaIcon
                          icon={RefreshIcon}
                          className="mr-2 size-4 animate-spin"
                        />
                        Importing...
                      </>
                    ) : (
                      <>
                        <PikaIcon icon={File02Icon} className="mr-2 size-4" />
                        Import Schema
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {conflicts.length > 0 && (
                <ConflictResolutionDialog
                  conflicts={conflicts}
                  resolutions={resolutions}
                  onResolutionChange={handleResolutionChange}
                />
              )}
              <ApiChangeSetPreview
                api={generatedApi}
                changeSet={changeSet}
                detailedPrompt={detailedPrompt}
                detailedSummary={detailedSummary}
              />
            </div>
          )}
        </div>

        <div className="border-border/80 bg-muted/20 flex items-center justify-between border-t px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (!generatedApi) handleClose();
              else {
                setGeneratedApi(undefined);
                setChangeSet(undefined);
              }
            }}
            disabled={isGenerating || isApplying}
          >
            {generatedApi ? (
              <>
                <PikaIcon icon={RefreshIcon} className="mr-2 size-4" /> Back to
                Import
              </>
            ) : (
              "Cancel"
            )}
          </Button>

          {generatedApi && (
            <Button
              type="button"
              onClick={handleApplyChanges}
              disabled={isApplying}
              variant="default"
            >
              {isApplying ? (
                <>
                  <PikaIcon
                    icon={RefreshIcon}
                    className="mr-2 size-4 animate-spin"
                  />
                  Applying Changes...
                </>
              ) : (
                <>
                  <PikaIcon
                    icon={CheckTickCircleIcon}
                    className="mr-2 size-4"
                  />
                  Approve &amp; Apply
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
