"use client";

import * as React from "react";
import * as PikaCore from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { RiShuffleLine } from "@remixicon/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RouteParamConfig } from "@/lib/schema-synthesizer";
import { FakerProviderSelect } from "@/components/edit-bar/FakerProviderSelect";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import {
  METHOD_STYLES,
  type HttpMethod,
  type TryResponse,
} from "./inspector.types";

interface InspectorTryTabProps {
  method: HttpMethod;
  effectivePath: string;
  detectedParams: { name: string }[];
  paramConfigs: Record<string, RouteParamConfig>;
  testParamValues: Record<string, string>;
  constructedTryUrl: string;
  isTryingRequest: boolean;
  tryResponse: TryResponse | null;
  onToggleParamMode: (paramName: string, mode: "static" | "fapi") => void;
  onParamStaticValueChange: (paramName: string, value: string) => void;
  onParamProviderChange: (paramName: string, provider: string) => void;
  onRerollParam: (paramName: string) => void;
  onRerollAllFapi: () => void;
  onSendTryRequest: () => Promise<void>;
}

export const InspectorTryTab = ({
  method,
  effectivePath,
  detectedParams,
  paramConfigs,
  testParamValues,
  constructedTryUrl,
  isTryingRequest,
  tryResponse,
  onToggleParamMode,
  onParamStaticValueChange,
  onParamProviderChange,
  onRerollParam,
  onRerollAllFapi,
  onSendTryRequest,
}: InspectorTryTabProps): React.JSX.Element => {
  return (
    <TabsContent
      value="try"
      className="scrollbar-subtle m-0 min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
    >
      {/* Active Route Header Banner */}
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

      {/* Parameter Values Controls */}
      {detectedParams.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
              Parameter Values
            </span>
            {detectedParams.some(
              (p) => paramConfigs[p.name]?.mode === "fapi",
            ) && (
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
                        placeholder={
                          p.name === "id" ? "295" : `sample_${p.name}`
                        }
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
      )}

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

      {/* Response Console */}
      {tryResponse && (
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
              <PikaIcon icon={PikaCore.CopyIcon} size={12} aria-hidden="true" />
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
      )}
    </TabsContent>
  );
};
