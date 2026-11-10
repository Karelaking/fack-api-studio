"use client";

import * as React from "react";
import type { ConditionalRule } from "@/lib/mock-engine";
import { Button } from "@/components/ui/button";
import type { InspectorTab } from "./inspector.types";

export interface InspectorBehaviorSummaryProps {
  latencyMin: number;
  latencyMax: number;
  errorRate: number;
  rules: ConditionalRule[];
  onSelectTab: (tab: InspectorTab) => void;
}

/**
 * Summary badge & quick-jump banner for runtime chaos latency, error rates, and conditional rules.
 */
export const InspectorBehaviorSummary = ({
  latencyMin,
  latencyMax,
  errorRate,
  rules,
  onSelectTab,
}: InspectorBehaviorSummaryProps): React.JSX.Element => {
  return (
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
        size="xs"
        onClick={() => onSelectTab("behavior")}
        className="hover:bg-background h-7 text-xs font-medium"
        aria-label="Edit runtime chaos and behavior rules"
      >
        Configure
      </Button>
    </div>
  );
};

export default InspectorBehaviorSummary;
