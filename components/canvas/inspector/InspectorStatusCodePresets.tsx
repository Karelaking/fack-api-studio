"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  COMMON_STATUS_CODES,
  getStatusCodeBadgeStyles,
} from "./inspector.types";

export interface InspectorStatusCodePresetsProps {
  statusCode: number;
  setStatusCode: (code: number) => void;
  loading?: boolean;
}

/**
 * Status code presets button group and custom status input.
 */
export const InspectorStatusCodePresets = ({
  statusCode,
  setStatusCode,
  loading = false,
}: InspectorStatusCodePresetsProps): React.JSX.Element => {
  return (
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
  );
};

export default InspectorStatusCodePresets;
