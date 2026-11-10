"use client";

import * as React from "react";
import { Tabs } from "@/components/ui/tabs";
import { TypeScriptPreview } from "@/components/edit-bar/TypeScriptPreview";
import { type InspectorTab, type RouteEditorProps } from "./inspector.types";
import { RouteInspectorHeader } from "./RouteInspectorHeader";
import { InspectorTabsList } from "./InspectorTabsList";
import { InspectorRouteTab } from "./InspectorRouteTab";
import { InspectorSchemaTab } from "./InspectorSchemaTab";
import { InspectorBehaviorTab } from "./InspectorBehaviorTab";
import { InspectorTryTab } from "./InspectorTryTab";
import { RouteInspectorFooter } from "./RouteInspectorFooter";
import { useRouteEditorDraft } from "./useRouteEditorDraft";

/**
 * Route Inspector & Editor Panel.
 * Composes the top route header, navigation tabs (Route, Schema, Behavior, Try),
 * and action footer with save and delete capabilities.
 */
export const RouteEditor = (props: RouteEditorProps): React.JSX.Element => {
  const draft = useRouteEditorDraft(props);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header: Method Dropdown, Enabled Toggle, Dirty State, Path Input */}
      <RouteInspectorHeader
        method={draft.method}
        setMethod={draft.setMethod}
        isEnabled={draft.isEnabled}
        setIsEnabled={draft.setIsEnabled}
        isDirty={draft.isDirty}
        loading={draft.loading}
        path={draft.path}
        setPath={draft.setPath}
        effectiveBasePath={draft.effectiveBasePath}
        effectivePath={draft.effectivePath}
        onSynchronizeParameters={draft.synchronizeParameterRenames}
        onDeselect={props.onDeselect}
      />

      {/* Categorized Tabs: Route, Schema, Behavior, Try */}
      <Tabs
        value={draft.activeTab}
        onValueChange={(val) => draft.handleTabChange(val as InspectorTab)}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        <InspectorTabsList
          headersCount={draft.headers.length}
          fieldsCount={draft.fields.length}
          hasChaos={
            draft.latencyMin > 0 || draft.latencyMax > 0 || draft.errorRate > 0
          }
          rulesCount={draft.rules.length}
        />

        {/* Tab 1: Route */}
        <InspectorRouteTab
          statusCode={draft.statusCode}
          setStatusCode={draft.setStatusCode}
          loading={draft.loading}
          detectedParams={draft.detectedParams}
          fields={draft.fields}
          paramConfigs={draft.paramConfigs}
          testParamValues={draft.testParamValues}
          onAddParamField={draft.handleAddParamField}
          headers={draft.headers}
          setHeaders={draft.setHeaders}
          latencyMin={draft.latencyMin}
          latencyMax={draft.latencyMax}
          errorRate={draft.errorRate}
          rules={draft.rules}
          onSelectTab={draft.handleTabChange}
        />

        {/* Tab 2: Schema */}
        <InspectorSchemaTab
          fields={draft.fields}
          loading={draft.loading}
          copiedJson={draft.copiedJson}
          onCopySchema={draft.handleCopySchema}
          onOpenTypes={() => draft.setTsOpen(true)}
          onClearAllFields={draft.handleClearAllFields}
        />

        {/* Tab 3: Behavior */}
        <InspectorBehaviorTab
          latencyMin={draft.latencyMin}
          latencyMax={draft.latencyMax}
          errorRate={draft.errorRate}
          setLatencyMin={draft.setLatencyMin}
          setLatencyMax={draft.setLatencyMax}
          setErrorRate={draft.setErrorRate}
          rules={draft.rules}
          setRules={draft.setRules}
        />

        {/* Tab 4: Try */}
        <InspectorTryTab
          method={draft.method}
          effectivePath={draft.effectivePath}
          detectedParams={draft.detectedParams}
          paramConfigs={draft.paramConfigs}
          testParamValues={draft.testParamValues}
          constructedTryUrl={draft.constructedTryUrl}
          isTryingRequest={draft.isTryingRequest}
          tryResponse={draft.tryResponse}
          onToggleParamMode={draft.handleToggleParamMode}
          onParamStaticValueChange={draft.handleParamStaticValueChange}
          onParamProviderChange={draft.handleParamProviderChange}
          onRerollParam={draft.handleRerollParam}
          onRerollAllFapi={draft.handleRerollAllFapi}
          onSendTryRequest={draft.handleSendTryRequest}
        />
      </Tabs>

      {/* Footer with Delete and Save Route buttons */}
      <RouteInspectorFooter
        confirmDelete={draft.confirmDelete}
        setConfirmDelete={draft.setConfirmDelete}
        isDeleting={draft.isDeleting}
        onDeleteRoute={draft.handleDeleteRoute}
        loading={draft.loading}
        isDirty={draft.isDirty}
        path={draft.path}
        onSaveRoute={draft.handleSaveRoute}
      />

      {/* TypeScript Preview Modal */}
      <TypeScriptPreview
        routeId={props.route.id}
        open={draft.tsOpen}
        onOpenChange={draft.setTsOpen}
      />
    </div>
  );
};

export default RouteEditor;
