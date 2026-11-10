"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { METHOD_STYLES, type HttpMethod } from "./inspector.types";

export interface InspectorTryHeaderBannerProps {
  method: HttpMethod;
  effectivePath: string;
}

/**
 * Top route method badge and path header banner in the Try Request runner tab.
 */
export const InspectorTryHeaderBanner = ({
  method,
  effectivePath,
}: InspectorTryHeaderBannerProps): React.JSX.Element => {
  return (
    <div className="bg-muted/40 border-border/60 flex items-center gap-2 rounded-md border p-2">
      <span
        className={cn(
          "rounded border px-2 py-0.5 font-mono text-xs font-bold uppercase",
          METHOD_STYLES[method]?.border,
          METHOD_STYLES[method]?.bg,
          METHOD_STYLES[method]?.text,
        )}
      >
        {method}
      </span>
      <span className="text-foreground truncate font-mono text-xs font-semibold">
        {effectivePath}
      </span>
    </div>
  );
};

export default InspectorTryHeaderBanner;
