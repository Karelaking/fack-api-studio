"use client";

import * as React from "react";
import * as PikaCore from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { RiArrowDownSLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HTTP_METHODS,
  METHOD_STYLES,
  type HttpMethod,
} from "./inspector.types";

interface RouteInspectorHeaderProps {
  method: HttpMethod;
  setMethod: (method: HttpMethod) => void;
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  isDirty: boolean;
  loading: boolean;
  path: string;
  setPath: (path: string) => void;
  effectiveBasePath: string;
  effectivePath: string;
  onSynchronizeParameters: (nextEffectivePath: string) => void;
  onDeselect: () => void;
}

export const RouteInspectorHeader = ({
  method,
  setMethod,
  isEnabled,
  setIsEnabled,
  isDirty,
  loading,
  path,
  setPath,
  effectiveBasePath,
  effectivePath,
  onSynchronizeParameters,
  onDeselect,
}: RouteInspectorHeaderProps): React.JSX.Element => {
  return (
    <div className="border-border/60 bg-card/40 flex shrink-0 flex-col gap-3 border-b p-4">
      {/* Row 1: Method Selector + Active Toggle + Dirty Badge + Close Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Method Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 w-28 justify-between gap-1.5 px-3 font-mono text-xs font-bold tracking-wider",
                    METHOD_STYLES[method]?.border,
                    METHOD_STYLES[method]?.bg,
                  )}
                  aria-label={`Select HTTP method. Current: ${method}`}
                />
              }
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    METHOD_STYLES[method]?.dot,
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "font-mono font-bold tracking-wider text-xs",
                    METHOD_STYLES[method]?.text,
                  )}
                >
                  {method}
                </span>
              </span>
              <RiArrowDownSLine
                className="text-muted-foreground size-3.5 shrink-0"
                aria-hidden="true"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-32">
              <DropdownMenuRadioGroup
                value={method}
                onValueChange={(val) => setMethod(val as HttpMethod)}
              >
                {HTTP_METHODS.map((m) => (
                  <DropdownMenuRadioItem
                    key={m}
                    value={m}
                    className={cn(
                      "gap-2 font-mono font-bold tracking-wider text-xs cursor-pointer",
                      METHOD_STYLES[m]?.text,
                      METHOD_STYLES[m]?.highlight,
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        METHOD_STYLES[m]?.dot,
                      )}
                      aria-hidden="true"
                    />
                    {m}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Route Active/Disabled Switch */}
          <div className="border-border/60 flex items-center gap-2 border-l pl-2.5">
            <Switch
              id="route-enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              disabled={loading}
              aria-label="Toggle Route Active"
            />
            <label
              htmlFor="route-enabled"
              className="text-foreground cursor-pointer text-xs font-medium"
            >
              {isEnabled ? "Active" : "Disabled"}
            </label>
          </div>

          {isDirty && (
            <span
              className="bg-warning/15 text-warning border-warning/30 rounded border px-2 py-0.5 text-xs font-medium"
              title="Unsaved changes pending"
            >
              Unsaved
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onDeselect}
          className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring flex size-8 items-center justify-center rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
          title="Deselect route (Esc)"
          aria-label="Deselect route"
        >
          <PikaIcon
            icon={PikaCore.MultipleCrossCancelIcon}
            size={16}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Row 2: Route Path Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="route-path"
            className="text-muted-foreground block text-xs font-semibold tracking-wider uppercase"
          >
            Route Path
          </label>
          <span
            className="text-muted-foreground max-w-[200px] truncate font-mono text-xs"
            title={effectivePath}
          >
            {effectivePath}
          </span>
        </div>
        <Input
          id="route-path"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          onBlur={() => {
            const trimmed = path.trim();
            const formatted =
              trimmed && !trimmed.startsWith("/") ? `/${trimmed}` : trimmed;
            if (formatted !== path) {
              setPath(formatted);
            }
            const nextEffective = `${effectiveBasePath.replace(/\/+$/, "")}${
              formatted.startsWith("/") ? formatted : `/${formatted}`
            }`;
            onSynchronizeParameters(nextEffective);
          }}
          placeholder="/api/v1/resource"
          variant="mono"
          className="h-9 px-3 font-mono text-sm"
          disabled={loading}
        />
      </div>
    </div>
  );
};
