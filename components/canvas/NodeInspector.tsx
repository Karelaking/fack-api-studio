"use client";

import * as React from "react";
import { useCanvasDndStore } from "@/stores/canvas-dnd-store-provider";
import { SchemaStoreProvider } from "@/stores/store-provider";
import {
  parseSchemaToFields,
  type SchemaField,
} from "@/lib/schema-synthesizer";
import {
  type NodeInspectorProps,
  FieldPropertyEditor,
  RouteEditor,
  IdleInspector,
} from "./inspector";

export type { NodeInspectorProps } from "./inspector";

/**
 * Permanently visible Right Sidebar Node Inspector.
 *
 * Dedicated strictly to inspecting and editing node and field values on the canvas.
 * Unifies all route editing, schema fields, rules, chaos, headers, and live testing.
 * Acts as the top-level coordinator routing between field inspection, route editing,
 * and idle canvas states.
 */
export const NodeInspector = ({
  route,
  inspectedFieldId,
  activeRoutesCount,
  projectSlug,
  endpoints,
  onRouteUpdated,
  onRouteDeleted,
  onCloseInspector,
}: NodeInspectorProps): React.JSX.Element => {
  const setInspectedField = useCanvasDndStore((s) => s.setInspectedField);

  // Parse fields for route
  const activeResponseSchema = route?.responseSchema;
  const initialFields: SchemaField[] = React.useMemo(() => {
    if (!activeResponseSchema) return [];
    try {
      const parsed = JSON.parse(activeResponseSchema);
      return parseSchemaToFields(parsed);
    } catch {
      return [];
    }
  }, [activeResponseSchema]);

  // Find inspected field
  const inspectedField = React.useMemo(() => {
    if (!inspectedFieldId) return null;
    return initialFields.find((f) => f.id === inspectedFieldId) ?? null;
  }, [initialFields, inspectedFieldId]);

  if (route && inspectedField) {
    return (
      <FieldPropertyEditor
        key={inspectedField.id}
        field={inspectedField}
        allFields={initialFields}
        route={route}
        endpoints={endpoints}
        onRouteUpdated={onRouteUpdated}
        onBack={() => setInspectedField(null)}
      />
    );
  }

  if (route) {
    return (
      <SchemaStoreProvider key={route.id} initialFields={initialFields}>
        <RouteEditor
          key={route.id}
          route={route}
          endpoints={endpoints}
          projectSlug={projectSlug}
          onRouteUpdated={onRouteUpdated}
          onRouteDeleted={onRouteDeleted}
          onDeselect={onCloseInspector}
        />
      </SchemaStoreProvider>
    );
  }

  return <IdleInspector activeRoutesCount={activeRoutesCount} />;
};

export default NodeInspector;
