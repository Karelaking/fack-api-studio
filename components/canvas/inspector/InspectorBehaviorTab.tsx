"use client";

import * as React from "react";
import { ChaosConfig } from "@/components/edit-bar/ChaosConfig";
import { RulesEditor } from "@/components/edit-bar/RulesEditor";
import type { ConditionalRule } from "@/lib/mock-engine";
import { TabsContent } from "@/components/ui/tabs";

interface InspectorBehaviorTabProps {
  latencyMin: number;
  latencyMax: number;
  errorRate: number;
  setLatencyMin: (val: number) => void;
  setLatencyMax: (val: number) => void;
  setErrorRate: (val: number) => void;
  rules: ConditionalRule[];
  setRules: React.Dispatch<React.SetStateAction<ConditionalRule[]>>;
}

export const InspectorBehaviorTab = ({
  latencyMin,
  latencyMax,
  errorRate,
  setLatencyMin,
  setLatencyMax,
  setErrorRate,
  rules,
  setRules,
}: InspectorBehaviorTabProps): React.JSX.Element => {
  return (
    <TabsContent
      value="behavior"
      className="scrollbar-subtle m-0 min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3"
    >
      {/* Section 1: Chaos Simulation */}
      <div className="space-y-2">
        <span className="text-muted-foreground block text-xs font-semibold tracking-wider uppercase">
          Chaos Simulation & Latency
        </span>
        <ChaosConfig
          latencyMin={latencyMin}
          latencyMax={latencyMax}
          errorRate={errorRate}
          onLatencyMinChange={setLatencyMin}
          onLatencyMaxChange={setLatencyMax}
          onErrorRateChange={setErrorRate}
        />
      </div>

      {/* Section 2: Smart Conditional Rules */}
      <div className="border-border/50 space-y-2 border-t pt-3">
        <span className="text-muted-foreground block text-xs font-semibold tracking-wider uppercase">
          Smart Conditional Rules
        </span>
        <RulesEditor rules={rules} onRulesChange={setRules} />
      </div>
    </TabsContent>
  );
};
