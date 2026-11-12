"use client";

import * as React from "react";
import { CheckTickCircleIcon } from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { cn } from "@/lib/utils";
import type { SchemaField, RouteParamConfig } from "@/lib/schema-synthesizer";
import { Button } from "@/components/ui/button";

export interface InspectorRouteParamsListProps {
  detectedParams: { name: string }[];
  fields: SchemaField[];
  paramConfigs: Record<string, RouteParamConfig>;
  testParamValues: Record<string, string>;
  onAddParamField: (paramName: string) => Promise<void>;
  loading?: boolean;
}

/**
 * List of URL path parameters detected from route path, displaying their mock value
 * and providing a 1-click binding button to add/map a schema field.
 */
export const InspectorRouteParamsList = ({
  detectedParams,
  fields,
  paramConfigs,
  testParamValues,
  onAddParamField,
  loading = false,
}: InspectorRouteParamsListProps): React.JSX.Element => {
  if (detectedParams.length === 0) {
    return <></>;
  }

  return (
    <div className="border-border/60 space-y-2.5 border-t pt-4">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground block text-xs font-semibold tracking-wider uppercase">
          Route Parameters ({detectedParams.length})
        </span>
        <span className="text-muted-foreground text-xs">
          Bound from URL path
        </span>
      </div>
      <div className="space-y-2">
        {detectedParams.map((p) => {
          const isMapped = fields.some(
            (f) =>
              (f.source?.type === "pathParam" && f.source.name === p.name) ||
              f.name.toLowerCase() === p.name.toLowerCase(),
          );
          const cfg = paramConfigs[p.name];
          const isFapi = cfg?.mode === "fapi";

          return (
            <div
              key={p.name}
              className="bg-card/70 border-border/60 hover:border-border flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-foreground font-mono text-sm font-semibold">
                  :{p.name}
                </span>
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 font-mono text-xs font-medium",
                    isFapi
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border/70 bg-muted/60 text-muted-foreground",
                  )}
                >
                  {isFapi
                    ? `FAPI: ${cfg?.provider || "random"}`
                    : `"${testParamValues[p.name] ?? cfg?.staticValue ?? ""}"`}
                </span>
              </div>
              {!isMapped ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void onAddParamField(p.name)}
                  disabled={loading}
                  className="h-7 shrink-0 font-mono text-xs"
                >
                  + Add field
                </Button>
              ) : (
                <span className="text-success flex shrink-0 items-center gap-1 text-xs font-medium">
                  <PikaIcon icon={CheckTickCircleIcon} className="size-3.5" />
                  <span>Field mapped</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InspectorRouteParamsList;
