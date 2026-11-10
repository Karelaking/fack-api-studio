"use client";

import * as React from "react";
import { RiShuffleLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
import type { RouteParamConfig } from "@/lib/schema-synthesizer";
import { FakerProviderSelect } from "@/components/edit-bar/FakerProviderSelect";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface InspectorTryParamsFormProps {
  detectedParams: { name: string }[];
  paramConfigs: Record<string, RouteParamConfig>;
  testParamValues: Record<string, string>;
  isTryingRequest: boolean;
  onToggleParamMode: (paramName: string, mode: "static" | "fapi") => void;
  onParamStaticValueChange: (paramName: string, value: string) => void;
  onParamProviderChange: (paramName: string, provider: string) => void;
  onRerollParam: (paramName: string) => void;
  onRerollAllFapi: () => void;
}

/**
 * Interactive parameter value configuration form for live test requests.
 * Allows toggling between Static scalar values and dynamic FAPI random data providers.
 */
export const InspectorTryParamsForm = ({
  detectedParams,
  paramConfigs,
  testParamValues,
  isTryingRequest,
  onToggleParamMode,
  onParamStaticValueChange,
  onParamProviderChange,
  onRerollParam,
  onRerollAllFapi,
}: InspectorTryParamsFormProps): React.JSX.Element => {
  if (detectedParams.length === 0) {
    return <></>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
          Parameter Values
        </span>
        {detectedParams.some((p) => paramConfigs[p.name]?.mode === "fapi") && (
          <button
            type="button"
            onClick={onRerollAllFapi}
            className="text-primary hover:text-primary/80 flex cursor-pointer items-center gap-1 font-mono text-xs font-medium transition-colors"
            title="Reroll all FAPI runtime random values"
          >
            <RiShuffleLine className="size-3" />
            <span>Reroll FAPI</span>
          </button>
        )}
      </div>

      <div className="space-y-2">
        {detectedParams.map((p) => {
          const cfg = paramConfigs[p.name];
          const isFapi = cfg?.mode === "fapi";

          return (
            <div
              key={p.name}
              className="bg-card border-border/70 space-y-2 rounded-lg border p-3 shadow-2xs"
            >
              {/* Param Row Header: Name and Mode Switch */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="text-foreground font-mono text-sm font-semibold">
                    :{p.name}
                  </span>
                </div>

                {/* Mode Selector Toggle: Static vs FAPI */}
                <div
                  aria-label={`Mode for parameter ${p.name}`}
                  className="bg-muted/80 flex items-center rounded-md p-0.5"
                >
                  <button
                    type="button"
                    aria-pressed={!isFapi}
                    onClick={() => onToggleParamMode(p.name, "static")}
                    className={cn(
                      "rounded px-2.5 py-1 text-xs transition-all cursor-pointer",
                      !isFapi
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Static
                  </button>
                  <button
                    type="button"
                    aria-pressed={isFapi}
                    onClick={() => onToggleParamMode(p.name, "fapi")}
                    className={cn(
                      "rounded px-2.5 py-1 text-xs transition-all cursor-pointer",
                      isFapi
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    FAPI Random
                  </button>
                </div>
              </div>

              {/* Value Input Area */}
              {!isFapi ? (
                <div className="space-y-1">
                  <Input
                    value={testParamValues[p.name] ?? ""}
                    onChange={(e) =>
                      onParamStaticValueChange(p.name, e.target.value)
                    }
                    placeholder={p.name === "id" ? "295" : `sample_${p.name}`}
                    variant="mono"
                    className="h-8 font-mono text-xs"
                    disabled={isTryingRequest}
                  />
                  <p className="text-muted-foreground font-mono text-xs">
                    Hard-coded constant parameter value
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="min-w-0 flex-1">
                      <FakerProviderSelect
                        value={cfg?.provider}
                        onValueChange={(val) =>
                          onParamProviderChange(p.name, val)
                        }
                        disabled={isTryingRequest}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => onRerollParam(p.name)}
                      disabled={isTryingRequest}
                      className="h-8 shrink-0 px-2 text-xs"
                      title="Generate new random value now"
                    >
                      <RiShuffleLine className="size-3.5" />
                      <span className="sr-only">Reroll</span>
                    </Button>
                  </div>

                  <div className="bg-muted/40 border-border/50 flex items-center justify-between rounded border px-2 py-1 font-mono text-xs">
                    <span className="text-muted-foreground text-xs">
                      Runtime value:
                    </span>
                    <span className="text-primary truncate font-semibold">
                      {testParamValues[p.name] || "(generated at request)"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InspectorTryParamsForm;
