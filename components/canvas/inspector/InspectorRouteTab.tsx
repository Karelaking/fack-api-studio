"use client";

import * as React from "react";
import { RiCheckLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
import type { SchemaField, RouteParamConfig } from "@/lib/schema-synthesizer";
import {
  HeadersEditor,
  type HeaderRow,
} from "@/components/edit-bar/HeadersEditor";
import type { ConditionalRule } from "@/lib/mock-engine";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import {
  COMMON_STATUS_CODES,
  getStatusCodeBadgeStyles,
  type InspectorTab,
} from "./inspector.types";

interface InspectorRouteTabProps {
  statusCode: number;
  setStatusCode: (code: number) => void;
  loading: boolean;
  detectedParams: { name: string }[];
  fields: SchemaField[];
  paramConfigs: Record<string, RouteParamConfig>;
  testParamValues: Record<string, string>;
  onAddParamField: (paramName: string) => Promise<void>;
  headers: HeaderRow[];
  setHeaders: React.Dispatch<React.SetStateAction<HeaderRow[]>>;
  latencyMin: number;
  latencyMax: number;
  errorRate: number;
  rules: ConditionalRule[];
  onSelectTab: (tab: InspectorTab) => void;
}

export const InspectorRouteTab = ({
  statusCode,
  setStatusCode,
  loading,
  detectedParams,
  fields,
  paramConfigs,
  testParamValues,
  onAddParamField,
  headers,
  setHeaders,
  latencyMin,
  latencyMax,
  errorRate,
  rules,
  onSelectTab,
}: InspectorRouteTabProps): React.JSX.Element => {
  return (
    <TabsContent
      value="route"
      className="scrollbar-subtle m-0 min-h-0 flex-1 space-y-5 overflow-y-auto p-4"
    >
      {/* Status Code with Presets */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground block text-xs font-semibold tracking-wider uppercase">
            Status Code
          </span>
          <span
            className={cn(
              "font-mono text-xs font-semibold",
              statusCode >= 200 && statusCode < 300
                ? "text-success"
                : statusCode >= 300 && statusCode < 400
                  ? "text-warning"
                  : "text-destructive",
            )}
          >
            {statusCode}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_STATUS_CODES.map((code) => {
            const isSelected = statusCode === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setStatusCode(code)}
                aria-pressed={isSelected}
                className={cn(
                  "cursor-pointer rounded-md border px-3 py-1 font-mono text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  getStatusCodeBadgeStyles(code, isSelected),
                )}
              >
                {code}
              </button>
            );
          })}
        </div>
        <div className="space-y-1.5 pt-1">
          <label
            htmlFor="route-custom-status"
            className="text-muted-foreground block text-xs font-medium"
          >
            Custom Status Code
          </label>
          <Input
            id="route-custom-status"
            type="number"
            value={statusCode}
            onChange={(e) => setStatusCode(Number(e.target.value) || 200)}
            variant="mono"
            className="h-9 px-3 font-mono text-sm"
            disabled={loading}
            placeholder="200"
          />
        </div>
      </div>

      {/* Route Path Parameters Overview */}
      {detectedParams.length > 0 && (
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
                  (f.source?.type === "pathParam" &&
                    f.source.name === p.name) ||
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
                      <RiCheckLine className="size-3.5" />
                      <span>Field mapped</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Response Headers */}
      <div className="border-border/60 space-y-2.5 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground block text-xs font-semibold tracking-wider uppercase">
            Response Headers {headers.length > 0 && `(${headers.length})`}
          </span>
        </div>
        <HeadersEditor
          headers={headers}
          onHeadersChange={setHeaders}
          hideHeader={true}
        />
      </div>

      {/* Runtime Behavior Quick Summary */}
      <div className="border-border/60 bg-muted/20 flex items-center justify-between gap-3 rounded-lg border p-3.5">
        <div className="space-y-1">
          <span className="text-foreground block text-xs font-semibold">
            Runtime Behavior
          </span>
          <p className="text-muted-foreground font-mono text-xs">
            {latencyMin > 0 || latencyMax > 0
              ? `Latency: ${latencyMin}${latencyMax > latencyMin ? `-${latencyMax}` : ""}ms`
              : "Zero latency"}
            {" · "}
            {errorRate > 0 ? `Chaos: ${errorRate}% err` : "100% reliable"}
            {" · "}
            {rules.length > 0
              ? `${rules.length} rule${rules.length > 1 ? "s" : ""}`
              : "No rules"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelectTab("behavior")}
          className="h-7 shrink-0 text-xs font-medium"
        >
          Configure →
        </Button>
      </div>
    </TabsContent>
  );
};
