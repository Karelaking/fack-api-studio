"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { GeneratedApi, ApiChangeSet } from "@/lib/ai/types";
import { ApiArchitectureSpecCard } from "./ApiArchitectureSpecCard";
import { ApiEndpointPreviewCard } from "./ApiEndpointPreviewCard";

export interface ApiChangeSetPreviewProps {
  api: GeneratedApi;
  changeSet?: ApiChangeSet;
  detailedPrompt?: string;
  detailedSummary?: string;
}

/**
 * Top-level preview container for generated AI API architectures and mutation changesets.
 * Renders statistical summary badges, architecture design specification cards,
 * and expandable endpoint route hierarchies.
 */
export const ApiChangeSetPreview = ({
  api,
  changeSet,
  detailedPrompt,
  detailedSummary,
}: ApiChangeSetPreviewProps): React.JSX.Element => {
  const totalRoutes = api.endpoints.reduce(
    (sum, ep) => sum + ep.routes.length,
    0,
  );
  const totalProperties = api.endpoints.reduce(
    (sum, ep) =>
      sum + ep.routes.reduce((rSum, r) => rSum + r.properties.length, 0),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header Summary Banner */}
      <div className="border-border/80 bg-muted/40 flex items-center justify-between rounded-xl border px-4 py-3">
        <div className="flex flex-col">
          <span className="text-foreground text-sm font-semibold">
            {api.name}
          </span>
          {api.description && (
            <span className="text-muted-foreground text-xs">
              {api.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {changeSet ? (
            <>
              {changeSet.routesToCreate.length > 0 && (
                <span className="focus:ring-ring bg-success/15 text-success inline-flex items-center rounded-md border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none">
                  +{changeSet.routesToCreate.length} Routes
                </span>
              )}
              {changeSet.routesToUpdate.length > 0 && (
                <span className="focus:ring-ring bg-warning/15 text-warning inline-flex items-center rounded-md border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none">
                  ~{changeSet.routesToUpdate.length} Modified
                </span>
              )}
              {changeSet.routesToDelete.length > 0 && (
                <span className="focus:ring-ring bg-danger/15 text-danger inline-flex items-center rounded-md border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none">
                  -{changeSet.routesToDelete.length} Deleted
                </span>
              )}
            </>
          ) : (
            <>
              <Badge variant="secondary">
                {api.endpoints.length} Endpoints
              </Badge>
              <Badge variant="secondary">{totalRoutes} Routes</Badge>
              <Badge variant="secondary">{totalProperties} Fields</Badge>
            </>
          )}
        </div>
      </div>

      {/* Detailed Blueprint from Stage 2 Prompt Expansion */}
      {detailedPrompt && (
        <ApiArchitectureSpecCard
          detailedPrompt={detailedPrompt}
          detailedSummary={detailedSummary}
        />
      )}

      {/* Endpoints & Routes Tree */}
      <div className="flex flex-col gap-3">
        {api.endpoints.map((endpoint) => (
          <ApiEndpointPreviewCard key={endpoint.name} endpoint={endpoint} />
        ))}
      </div>
    </div>
  );
};
