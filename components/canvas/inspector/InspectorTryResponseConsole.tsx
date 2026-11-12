"use client";

import * as React from "react";
import { CopyIcon } from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TryResponse } from "./inspector.types";

export interface InspectorTryResponseConsoleProps {
  tryResponse: TryResponse | null;
}

/**
 * Output console rendering the live test response, HTTP status badge, roundtrip latency, and formatted body.
 */
export const InspectorTryResponseConsole = ({
  tryResponse,
}: InspectorTryResponseConsoleProps): React.JSX.Element => {
  if (!tryResponse) {
    return <></>;
  }

  return (
    <div className="border-border/70 bg-card space-y-1.5 rounded-md border p-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 font-mono text-xs font-bold",
              tryResponse.status >= 200 && tryResponse.status < 300
                ? "bg-success/15 text-success border-success/30"
                : "bg-destructive/15 text-destructive border-destructive/30",
            )}
          >
            {tryResponse.status} {tryResponse.statusText}
          </span>
          <span className="text-muted-foreground font-mono text-xs">
            {tryResponse.timeMs}ms
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => {
            void navigator.clipboard.writeText(tryResponse.body);
            toast.success("Response body copied to clipboard");
          }}
          className="h-6 gap-1 px-1.5 text-xs"
          title="Copy response body"
        >
          <PikaIcon icon={CopyIcon} size={12} aria-hidden="true" />
          <span>Copy</span>
        </Button>
      </div>
      <pre
        aria-label="Response payload"
        className="bg-muted/60 text-foreground scrollbar-subtle max-h-48 overflow-auto rounded p-2.5 font-mono text-xs"
      >
        {tryResponse.body}
      </pre>
    </div>
  );
};

export default InspectorTryResponseConsole;
