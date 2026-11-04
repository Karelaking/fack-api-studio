"use client";

import * as React from "react";
import { FlowCanvas } from "./FlowCanvas";
import { EditBar } from "@/components/edit-bar/EditBar";
import { AgentComposer } from "@/components/ai/AgentComposer";
import { AgentStoreProvider } from "@/stores/agent-store-provider";
import { useCanvasDndStore } from "@/stores/canvas-dnd-store-provider";
import { FieldInspector } from "./FieldInspector";
import type { Endpoint, Route } from "@/db/schema";

interface CanvasContainerProps {
  projectId: string;
  projectSlug: string;
  endpoints: (Endpoint & { routes: Route[] })[];
  routes: Route[];
  initialState?: {
    nodes: string;
    edges: string;
    viewport: string;
  };
}

function CanvasContainerInner({
  projectId,
  projectSlug,
  endpoints,
  routes,
  initialState,
}: CanvasContainerProps): React.JSX.Element {
  const [prevRoutes, setPrevRoutes] = React.useState<Route[]>(routes);
  const [activeRoutes, setActiveRoutes] = React.useState<Route[]>(routes);
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  const selectedRouteId = useCanvasDndStore((s) => s.selectedRouteId);
  const setSelectedRoute = useCanvasDndStore((s) => s.setSelectedRoute);
  const inspectedFieldId = useCanvasDndStore((s) => s.inspectedFieldId);

  if (routes !== prevRoutes) {
    setPrevRoutes(routes);
    setActiveRoutes(routes);
  }

  const selectedRoute = React.useMemo(() => {
    return activeRoutes.find((r) => r.id === selectedRouteId) ?? null;
  }, [activeRoutes, selectedRouteId]);

  // Stable identities: these flow into FlowCanvas's memoized reconciliation
  const handleSelectRoute = React.useCallback(
    (routeId: string) => {
      setSelectedRoute(routeId);
    },
    [setSelectedRoute],
  );

  const handleOpenEdit = React.useCallback(
    (routeId: string) => {
      setSelectedRoute(routeId);
      setIsEditOpen(true);
    },
    [setSelectedRoute],
  );

  const handleRouteUpdated = React.useCallback((updatedRoute: Route) => {
    setActiveRoutes((prev) =>
      prev.map((r) => (r.id === updatedRoute.id ? updatedRoute : r)),
    );
  }, []);

  const handleRouteDeleted = React.useCallback(
    (routeId: string) => {
      setActiveRoutes((prev) => prev.filter((r) => r.id !== routeId));
      setSelectedRoute(null);
      setIsEditOpen(false);
    },
    [setSelectedRoute],
  );

  // Sync route updates emitted from provider drag/drop or keyboard additions
  React.useEffect(() => {
    const handleFieldSync = (e: Event) => {
      const customEvent = e as CustomEvent<{
        routeId: string;
        updatedRoute?: Route;
      }>;
      if (customEvent.detail?.updatedRoute) {
        handleRouteUpdated(customEvent.detail.updatedRoute);
      }
    };
    window.addEventListener("canvas-field-added", handleFieldSync);
    return () =>
      window.removeEventListener("canvas-field-added", handleFieldSync);
  }, [handleRouteUpdated]);

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden">
      {/* Center: Full Canvas Workspace */}
      <div className="relative min-h-0 min-w-0 flex-1">
        <FlowCanvas
          projectId={projectId}
          projectSlug={projectSlug}
          endpoints={endpoints}
          routes={activeRoutes}
          initialState={initialState}
          onSelectRoute={handleSelectRoute}
          onOpenEdit={handleOpenEdit}
        />

        {/* Agent composer docked over the canvas */}
        <AgentComposer />
      </div>

      {/* Right Sidebar: Field Inspector (contextual for inspected field) */}
      {selectedRoute && inspectedFieldId && (
        <div className="shrink-0">
          <FieldInspector
            route={selectedRoute}
            onRouteUpdated={handleRouteUpdated}
            onOpenAdvanced={() => setIsEditOpen(true)}
          />
        </div>
      )}

      {/* Slide-out Edit Bar Sheet drawer panel for advanced route settings */}
      {selectedRoute && (
        <EditBar
          route={selectedRoute}
          projectSlug={projectSlug}
          endpoints={endpoints}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onRouteUpdated={handleRouteUpdated}
          onRouteDeleted={handleRouteDeleted}
        />
      )}
    </div>
  );
}

/**
 * CanvasContainer wrapped with AgentStoreProvider.
 */
export function CanvasContainer(
  props: CanvasContainerProps,
): React.JSX.Element {
  return (
    <AgentStoreProvider projectId={props.projectId}>
      <CanvasContainerInner {...props} />
    </AgentStoreProvider>
  );
}

export default CanvasContainer;
