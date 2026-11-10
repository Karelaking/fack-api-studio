"use client";

import * as React from "react";
import * as PikaCore from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface InspectorTryUrlBarProps {
  constructedTryUrl: string;
  isTryingRequest: boolean;
  onSendTryRequest: () => Promise<void>;
}

/**
 * Mock Request URL preview bar with 1-click Copy and "Send Test Request" action button.
 */
export const InspectorTryUrlBar = ({
  constructedTryUrl,
  isTryingRequest,
  onSendTryRequest,
}: InspectorTryUrlBarProps): React.JSX.Element => {
  return (
    <div className="space-y-3">
      {/* URL Preview with Copy */}
      <div className="space-y-1.5">
        <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
          Mock Request URL
        </span>
        <div className="bg-muted/40 border-border/60 text-muted-foreground flex items-center justify-between gap-2 rounded-md border p-2 font-mono text-xs break-all">
          <span className="truncate">{constructedTryUrl}</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              void navigator.clipboard.writeText(
                window.location.origin + constructedTryUrl,
              );
              toast.success("URL copied to clipboard");
            }}
            className="h-6 shrink-0 gap-1 px-1.5 text-xs"
            title="Copy full mock URL"
          >
            <PikaIcon icon={PikaCore.CopyIcon} size={12} aria-hidden="true" />
            <span>Copy</span>
          </Button>
        </div>
      </div>

      {/* Send Button */}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => void onSendTryRequest()}
        disabled={isTryingRequest}
        className="w-full text-xs"
      >
        {isTryingRequest ? (
          <>
            <PikaIcon
              icon={PikaCore.RefreshIcon}
              size={12}
              className="mr-1 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            Sending...
          </>
        ) : (
          "Send Test Request"
        )}
      </Button>
    </div>
  );
};

export default InspectorTryUrlBar;
