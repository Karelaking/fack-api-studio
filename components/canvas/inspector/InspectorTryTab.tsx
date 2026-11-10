"use client";

import * as React from "react";
import type { RouteParamConfig } from "@/lib/schema-synthesizer";
import { TabsContent } from "@/components/ui/tabs";
import { type HttpMethod, type TryResponse } from "./inspector.types";
import { InspectorTryHeaderBanner } from "./InspectorTryHeaderBanner";
import { InspectorTryParamsForm } from "./InspectorTryParamsForm";
import { InspectorTryUrlBar } from "./InspectorTryUrlBar";
import { InspectorTryResponseConsole } from "./InspectorTryResponseConsole";

export interface InspectorTryTabProps {
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

/**
 * Live Request Runner Tab.
 * Houses route header banner, interactive URL parameters config, mock request URL bar,
 * and live response output console.
 */
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
      <InspectorTryHeaderBanner method={method} effectivePath={effectivePath} />

      <InspectorTryParamsForm
        detectedParams={detectedParams}
        paramConfigs={paramConfigs}
        testParamValues={testParamValues}
        isTryingRequest={isTryingRequest}
        onToggleParamMode={onToggleParamMode}
        onParamStaticValueChange={onParamStaticValueChange}
        onParamProviderChange={onParamProviderChange}
        onRerollParam={onRerollParam}
        onRerollAllFapi={onRerollAllFapi}
      />

      <InspectorTryUrlBar
        constructedTryUrl={constructedTryUrl}
        isTryingRequest={isTryingRequest}
        onSendTryRequest={onSendTryRequest}
      />

      <InspectorTryResponseConsole tryResponse={tryResponse} />
    </TabsContent>
  );
};

export default InspectorTryTab;
