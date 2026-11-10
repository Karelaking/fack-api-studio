"use client";

import * as React from "react";
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiFolderLine,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import type { GeneratedEndpoint } from "@/lib/ai/types";
import { ApiRoutePreviewRow } from "./ApiRoutePreviewRow";

export interface ApiEndpointPreviewCardProps {
  endpoint: GeneratedEndpoint;
}

/**
 * Collapsible endpoint card grouping related REST routes under a shared base path.
 */
export const ApiEndpointPreviewCard = ({
  endpoint,
}: ApiEndpointPreviewCardProps): React.JSX.Element => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <div className="border-border/70 bg-card/60 flex flex-col rounded-xl border shadow-2xs">
      {/* Endpoint Header Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="hover:bg-muted/50 flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-2.5 text-left transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <RiArrowDownSLine className="text-muted-foreground size-4 shrink-0" />
          ) : (
            <RiArrowRightSLine className="text-muted-foreground size-4 shrink-0" />
          )}
          <RiFolderLine className="text-primary size-4 shrink-0" />
          <span className="text-foreground text-xs font-semibold">
            {endpoint.name}
          </span>
          <span className="text-muted-foreground font-mono text-xs">
            ({endpoint.basePath})
          </span>
        </div>
        <Badge variant="outline">
          {endpoint.routes.length} route{endpoint.routes.length > 1 ? "s" : ""}
        </Badge>
      </button>

      {/* Endpoint Routes List */}
      {isExpanded && (
        <div className="border-border/40 flex flex-col gap-2 border-t p-3">
          {endpoint.routes.map((route, idx) => (
            <ApiRoutePreviewRow
              key={`${route.method}-${route.path}-${idx}`}
              basePath={endpoint.basePath}
              route={route}
            />
          ))}
        </div>
      )}
    </div>
  );
};
