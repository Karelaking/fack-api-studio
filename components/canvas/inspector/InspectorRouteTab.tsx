"use client";

import * as React from "react";
import type { SchemaField, RouteParamConfig } from "@/lib/schema-synthesizer";
import {
  HeadersEditor,
  type HeaderRow,
} from "@/components/edit-bar/HeadersEditor";
import type { ConditionalRule } from "@/lib/mock-engine";
import { TabsContent } from "@/components/ui/tabs";
import type { InspectorTab } from "./inspector.types";
import { InspectorStatusCodePresets } from "./InspectorStatusCodePresets";
import { InspectorRouteParamsList } from "./InspectorRouteParamsList";
import { InspectorBehaviorSummary } from "./InspectorBehaviorSummary";

export interface InspectorRouteTabProps {
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

/**
 * Route Configuration Tab content.
 * Houses Status Code presets, Route URL Parameters binding, Response Headers editor,
 * and Runtime Behavior summary.
 */
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
      <InspectorStatusCodePresets
        statusCode={statusCode}
        setStatusCode={setStatusCode}
        loading={loading}
      />

      {/* Route Path Parameters Overview */}
      <InspectorRouteParamsList
        detectedParams={detectedParams}
        fields={fields}
        paramConfigs={paramConfigs}
        testParamValues={testParamValues}
        onAddParamField={onAddParamField}
        loading={loading}
      />

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
      <InspectorBehaviorSummary
        latencyMin={latencyMin}
        latencyMax={latencyMax}
        errorRate={errorRate}
        rules={rules}
        onSelectTab={onSelectTab}
      />
    </TabsContent>
  );
};

export default InspectorRouteTab;
