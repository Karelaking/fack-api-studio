"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CodeIcon,
  KeyLeftIcon,
  CopyIcon,
  EyeOnIcon,
  EyeOffIcon,
  CheckTickCircleIcon,
  CloudArrowDownloadIcon,
} from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import {
  getProjectCliDetails,
  type ProjectCliDetails,
} from "@/lib/actions/bundle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CliRunDialogProps {
  projectId: string;
  projectSlug: string;
  trigger?: React.ReactElement;
}

export const CliRunDialog = ({
  projectId,
  projectSlug,
  trigger,
}: CliRunDialogProps): React.JSX.Element => {
  const [open, setOpen] = React.useState(false);
  const [cliDetails, setCliDetails] = React.useState<
    ProjectCliDetails | undefined
  >(undefined);
  const [showKey, setShowKey] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [copiedPull, setCopiedPull] = React.useState(false);
  const [copiedDev, setCopiedDev] = React.useState(false);

  React.useEffect(() => {
    if (open && !cliDetails) {
      getProjectCliDetails(projectId)
        .then((details) => setCliDetails(details))
        .catch(() => {});
    }
  }, [open, projectId, cliDetails]);

  const handleCopyKey = (): void => {
    if (cliDetails?.secretKey) {
      void navigator.clipboard.writeText(cliDetails.secretKey);
      setCopiedKey(true);
      toast.success("Project secret key copied!");
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCopyPull = (): void => {
    if (cliDetails?.pullCommand) {
      void navigator.clipboard.writeText(cliDetails.pullCommand);
      setCopiedPull(true);
      toast.success("Pull command copied!");
      setTimeout(() => setCopiedPull(false), 2000);
    }
  };

  const handleCopyDev = (): void => {
    void navigator.clipboard.writeText("fack dev");
    setCopiedDev(true);
    toast.success("Dev command copied!");
    setTimeout(() => setCopiedDev(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          React.isValidElement(trigger) ? (
            trigger
          ) : (
            <span>{trigger}</span>
          )
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            title="Run with Local CLI"
            aria-label="Run with Local CLI"
          >
            <PikaIcon icon={CodeIcon} className="text-primary size-4" />
            <span>Run with CLI</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2">
              <PikaIcon icon={CodeIcon} className="text-primary size-5" />
              <span>Run with Local CLI</span>
            </DialogTitle>
            <span className="bg-primary/10 text-primary border-primary/20 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
              AES-256-GCM
            </span>
          </div>
          <DialogDescription>
            Develop your frontend using our standalone native runner. Start in
            &lt;10ms, serve all endpoints locally with zero Docker/DB overhead,
            and keep your specs encrypted in version control.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Project Secret Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="cli-dialog-key"
                className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold"
              >
                <PikaIcon icon={KeyLeftIcon} className="size-4" />
                <span>Project Decryption Key</span>
              </label>
              <span className="text-muted-foreground text-caption">
                AES-256-GCM secret
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="cli-dialog-key"
                  readOnly
                  type={showKey ? "text" : "password"}
                  value={cliDetails?.secretKey || "Loading secret key..."}
                  className="bg-background/50 pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 p-1 transition-colors"
                  title={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? (
                    <PikaIcon icon={EyeOffIcon} className="size-4" />
                  ) : (
                    <PikaIcon icon={EyeOnIcon} className="size-4" />
                  )}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyKey}
              >
                {copiedKey ? (
                  <>
                    <PikaIcon
                      icon={CheckTickCircleIcon}
                      className="text-success mr-1.5 size-4"
                    />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <PikaIcon icon={CopyIcon} className="mr-1.5 size-4" />
                    <span>Copy Key</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Steps */}
          <div className="space-y-2.5 pt-2">
            <span className="text-muted-foreground text-xs font-semibold">
              Run inside your frontend project repository:
            </span>

            <div className="border-border/60 bg-muted/30 space-y-1.5 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-caption font-mono">
                  Step 1: Pull encrypted bundle
                </span>
                <button
                  type="button"
                  onClick={handleCopyPull}
                  className="text-primary flex items-center gap-1 text-xs hover:underline"
                >
                  {copiedPull ? (
                    <>
                      <PikaIcon
                        icon={CheckTickCircleIcon}
                        className="text-success size-3.5"
                      />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <PikaIcon icon={CopyIcon} className="size-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="text-foreground/90 selection:bg-primary/20 scrollbar-subtle overflow-x-auto font-mono text-xs">
                <code>
                  {cliDetails?.pullCommand ||
                    `fack pull ${projectSlug} --key <KEY>`}
                </code>
              </pre>
            </div>

            <div className="border-border/60 bg-muted/30 space-y-1.5 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-caption font-mono">
                  Step 2: Start local mock server
                </span>
                <button
                  type="button"
                  onClick={handleCopyDev}
                  className="text-primary flex items-center gap-1 text-xs hover:underline"
                >
                  {copiedDev ? (
                    <>
                      <PikaIcon
                        icon={CheckTickCircleIcon}
                        className="text-success size-3.5"
                      />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <PikaIcon icon={CopyIcon} className="size-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="text-foreground/90 scrollbar-subtle overflow-x-auto font-mono text-xs">
                <code>fack dev</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="border-border/40 flex items-center justify-between border-t pt-2">
          <span className="text-muted-foreground text-xs">
            Offline-first &bull; Stateful In-Memory CRUD &bull; Zero Lag
          </span>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              window.open(`/api/projects/${projectSlug}/bundle`, "_blank");
            }}
          >
            <PikaIcon icon={CloudArrowDownloadIcon} className="mr-1.5 size-4" />
            <span>Download fack.enc</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
