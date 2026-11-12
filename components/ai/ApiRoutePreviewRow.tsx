"use client";

import * as React from "react";
import { AlertTriangleIcon, CodeIcon, ClockIcon } from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { Badge } from "@/components/ui/badge";
import type { GeneratedRoute } from "@/lib/ai/types";
import { convertPropertiesToJsonSchema } from "@/lib/services/schema.service";
import { getMethodBadgeClass } from "@/lib/utils/method-colors";

export interface ApiRoutePreviewRowProps {
  basePath: string;
  route: GeneratedRoute;
}

/**
 * Route row item within an AI endpoint card preview.
 * Displays HTTP method, full URI path, status code, latency profile,
 * chaos error rate, and an expandable JSON schema viewer.
 */
export const ApiRoutePreviewRow = ({
  basePath,
  route,
}: ApiRoutePreviewRowProps): React.JSX.Element => {
  const [showSchema, setShowSchema] = React.useState(false);
  const methodColor = getMethodBadgeClass(route.method);
  const fullPath = `${basePath}${route.path}`;

  const jsonSchemaDoc = React.useMemo(() => {
    return convertPropertiesToJsonSchema(route.properties);
  }, [route.properties]);

  return (
    <div className="border-border/60 bg-muted/20 hover:bg-muted/40 flex flex-col rounded-lg border transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span
            className={`text-mini rounded border px-1.5 py-0.5 font-bold tracking-wide ${methodColor}`}
          >
            {route.method}
          </span>
          <span className="text-foreground font-semibold">{fullPath}</span>
          <span className="text-muted-foreground/80 text-caption">
            &rarr; {route.statusCode}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="text-muted-foreground text-caption flex items-center gap-1">
            <PikaIcon icon={ClockIcon} className="size-3" />
            <span>
              {route.latency.min}–{route.latency.max}ms
            </span>
          </div>

          {route.errorRate > 0 && (
            <div className="text-caption text-warning flex items-center gap-1">
              <PikaIcon icon={AlertTriangleIcon} className="size-3" />
              <span>{route.errorRate}% error</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowSchema(!showSchema)}
            className="border-border hover:bg-card text-muted-foreground hover:text-foreground text-caption flex cursor-pointer items-center gap-1 rounded border px-2 py-0.5 transition-colors"
          >
            <PikaIcon icon={CodeIcon} className="size-3" />
            <span>{showSchema ? "Hide Schema" : "Schema"}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Response Schema Inspector */}
      {showSchema && (
        <div className="border-border/40 bg-card/90 border-t p-3">
          <div className="flex flex-col gap-2">
            <div className="text-caption flex items-center justify-between">
              <span className="text-muted-foreground font-semibold tracking-wider uppercase">
                Response Schema Properties:
              </span>
              <span className="text-muted-foreground font-mono">
                {route.properties.length} field
                {route.properties.length > 1 ? "s" : ""}
              </span>
            </div>

            {route.properties.length > 0 ? (
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {route.properties.map((p) => (
                  <div
                    key={p.name}
                    className="bg-muted/40 border-border/50 flex items-center justify-between rounded border px-2 py-1 text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-foreground font-mono font-medium">
                        {p.name}
                      </span>
                      <span className="text-muted-foreground/70 text-mini">
                        ({p.type})
                      </span>
                    </div>
                    {p.fakerProvider && (
                      <Badge variant="secondary">
                        <span className="text-mini font-mono">
                          {p.fakerProvider}
                        </span>
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground text-xs italic">
                No properties defined (returns empty object)
              </span>
            )}

            <details className="pt-1">
              <summary className="text-muted-foreground hover:text-foreground text-caption cursor-pointer">
                View Generated JSON Schema
              </summary>
              <pre className="bg-muted/80 text-foreground scrollbar-subtle text-mini mt-1 max-h-48 overflow-auto rounded p-2 font-mono">
                {JSON.stringify(jsonSchemaDoc, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};
