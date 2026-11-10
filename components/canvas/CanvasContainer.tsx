"use client";

import * as React from "react";
import { FlowCanvas } from "./FlowCanvas";
import { EditBar } from "@/components/edit-bar/EditBar";
import { AgentComposer } from "@/components/ai/AgentComposer";
import { AgentStoreProvider } from "@/stores/agent-store-provider";
import { useCanvasDndStore } from "@/stores/canvas-dnd-store-provider";
import { NodeInspector } from "./NodeInspector";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Endpoint, Route } from "@/db/schema";

const BELOW_LG_QUERY = "(max-width: 1023px)";

/**
 * Tracks whether the viewport is below the `lg` breakpoint.
 *
 * The inspector is a static sidebar on `lg+` and a modal sheet below it. The
 * sheet must only be mounted below `lg`: its portal renders into `document.body`,
 * so a `lg:hidden` wrapper would still leave a modal backdrop on desktop.
 */
function useBelowLg(): boolean {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    const mediaQuery = window.matchMedia(BELOW_LG_QUERY);
    mediaQuery.addEventListener("change", onStoreChange);
    return () => mediaQuery.removeEventListener("change", onStoreChange);
  }, []);

  const getSnapshot = React.useCallback(
    () => window.matchMedia(BELOW_LG_QUERY).matches,
    [],
  );

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}

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
  const [prevEndpoints, setPrevEndpoints] =
    React.useState<(Endpoint & { routes: Route[] })[]>(endpoints);
  const [activeEndpoints, setActiveEndpoints] =
    React.useState<(Endpoint & { routes: Route[] })[]>(endpoints);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const isBelowLg = useBelowLg();

  /**
   * The route explicitly opened in the inspector. This is deliberately separate
   * from `selectedRouteId`: clicking a node only targets it for drag-and-drop,
   * it must not pull the editor open by itself.
   */
  const [inspectorRouteId, setInspectorRouteId] = React.useState<string | null>(
    null,
  );

  const setSelectedRoute = useCanvasDndStore((s) => s.setSelectedRoute);
  const setInspectedField = useCanvasDndStore((s) => s.setInspectedField);
  const inspectedFieldId = useCanvasDndStore((s) => s.inspectedFieldId);
  if (routes !== prevRoutes) {
    setPrevRoutes(routes);
    setActiveRoutes(routes);
  }
  if (endpoints !== prevEndpoints) {
    setPrevEndpoints(endpoints);
    setActiveEndpoints(endpoints);
  }

  const inspectorRoute = React.useMemo(() => {
    return activeRoutes.find((r) => r.id === inspectorRouteId) ?? null;
  }, [activeRoutes, inspectorRouteId]);

  // Pane clicks and the sidebar's Clear action emit a null route selection.
  // Close the inspector with them so it never shows a stale route.
  React.useEffect(() => {
    const handleRouteDeselected = (event: Event) => {
      if ((event as CustomEvent<unknown>).detail !== null) return;
      setInspectorRouteId(null);
      setInspectedField(null);
      setIsEditOpen(false);
    };

    window.addEventListener("route-selected", handleRouteDeselected);
    return () =>
      window.removeEventListener("route-selected", handleRouteDeselected);
  }, [setInspectedField]);

  // Stable identities: these flow into FlowCanvas's memoized reconciliation
  const handleSelectRoute = React.useCallback(
    (routeId: string) => {
      setSelectedRoute(routeId);
      // Follow the newly selected node only when the inspector is already
      // open. A click never opens it.
      setInspectorRouteId((openRouteId) => (openRouteId ? routeId : null));
    },
    [setSelectedRoute],
  );

  const handleOpenEdit = React.useCallback(
    (routeId: string) => {
      setSelectedRoute(routeId);
      setInspectorRouteId(routeId);
    },
    [setSelectedRoute],
  );

  const handleCloseInspector = React.useCallback(() => {
    setInspectorRouteId(null);
    setInspectedField(null);
    setSelectedRoute(null);
    setIsEditOpen(false);
  }, [setInspectedField, setSelectedRoute]);

  const handleRouteUpdated = React.useCallback((updatedRoute: Route) => {
    setActiveRoutes((prev) =>
      prev.map((r) => (r.id === updatedRoute.id ? updatedRoute : r)),
    );
  }, []);

  const handleRouteDeleted = React.useCallback(
    (routeId: string) => {
      setActiveRoutes((prev) => prev.filter((r) => r.id !== routeId));
      setInspectorRouteId(null);
      setSelectedRoute(null);
      setIsEditOpen(false);
    },
    [setSelectedRoute],
  );

  const handleEndpointUpdated = React.useCallback(
    (updatedEndpoint: Endpoint) => {
      setActiveEndpoints((prev) =>
        prev.map((ep) =>
          ep.id === updatedEndpoint.id ? { ...ep, ...updatedEndpoint } : ep,
        ),
      );
    },
    [],
  );

  const handleEndpointDeleted = React.useCallback(
    (endpointId: string) => {
      setActiveEndpoints((prev) => prev.filter((ep) => ep.id !== endpointId));
      setActiveRoutes((prev) =>
        prev.filter((r) => r.endpointId !== endpointId),
      );
      setInspectorRouteId((current) => {
        const currentRoute = activeRoutes.find((r) => r.id === current);
        return currentRoute?.endpointId === endpointId ? null : current;
      });
      setSelectedRoute(null);
      setIsEditOpen(false);
    },
    [activeRoutes, setSelectedRoute],
  );

  // Sync route updates and removals emitted from canvas cards or inspector
  React.useEffect(() => {
    const handleFieldSync = (e: Event): void => {
      const customEvent = e as CustomEvent<{
        routeId: string;
        updatedRoute?: Route;
      }>;
      if (customEvent.detail?.updatedRoute) {
        handleRouteUpdated(customEvent.detail.updatedRoute);
      }
    };

    const handleRouteDeletedSync = (e: Event): void => {
      const customEvent = e as CustomEvent<{ routeId: string }>;
      if (customEvent.detail?.routeId) {
        handleRouteDeleted(customEvent.detail.routeId);
      }
    };

    window.addEventListener("canvas-field-added", handleFieldSync);
    window.addEventListener("canvas-field-removed", handleFieldSync);
    window.addEventListener("canvas-route-deleted", handleRouteDeletedSync);

    return () => {
      window.removeEventListener("canvas-field-added", handleFieldSync);
      window.removeEventListener("canvas-field-removed", handleFieldSync);
      window.removeEventListener(
        "canvas-route-deleted",
        handleRouteDeletedSync,
      );
    };
  }, [handleRouteUpdated, handleRouteDeleted]);

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden">
      {/* Center: Full Canvas Workspace */}
      <div className="relative min-h-0 min-w-0 flex-1">
        <FlowCanvas
          projectId={projectId}
          projectSlug={projectSlug}
          endpoints={activeEndpoints}
          routes={activeRoutes}
          initialState={initialState}
          onSelectRoute={handleSelectRoute}
          onOpenEdit={handleOpenEdit}
          onDeleteRoute={handleRouteDeleted}
          onUpdateGroup={handleEndpointUpdated}
          onDeleteGroup={handleEndpointDeleted}
        />

        {/* Agent composer docked over the canvas */}
        <AgentComposer />
      </div>

      {/* Desktop Right Sidebar: Node Inspector (Visible on lg and larger viewports) */}
      <aside
        className="border-border/60 bg-background hidden h-full w-80 shrink-0 flex-col border-l lg:flex"
        aria-label="Node Inspector"
      >
        <NodeInspector
          route={inspectorRoute}
          inspectedFieldId={inspectedFieldId}
          activeRoutesCount={activeRoutes.length}
          projectSlug={projectSlug}
          endpoints={endpoints}
          onRouteUpdated={handleRouteUpdated}
          onRouteDeleted={handleRouteDeleted}
          onOpenAdvanced={() => setIsEditOpen(true)}
          onCloseInspector={handleCloseInspector}
        />
      </aside>

      {/* Mobile & Tablet Overlay Sheet: Node Inspector (< lg viewports) */}
      {isBelowLg && (
        <Sheet
          open={Boolean(inspectorRoute) && !isEditOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseInspector();
            }
          }}
        >
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-full max-w-sm p-0 sm:max-w-md"
            aria-label="Node Inspector"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Node Inspector</SheetTitle>
            </SheetHeader>
            <NodeInspector
              route={inspectorRoute}
              inspectedFieldId={inspectedFieldId}
              activeRoutesCount={activeRoutes.length}
              projectSlug={projectSlug}
              endpoints={endpoints}
              onRouteUpdated={handleRouteUpdated}
              onRouteDeleted={handleRouteDeleted}
              onOpenAdvanced={() => setIsEditOpen(true)}
              onCloseInspector={handleCloseInspector}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Slide-out Edit Bar Sheet drawer panel for advanced route settings */}
      {inspectorRoute && (
        <EditBar
          route={inspectorRoute}
          projectSlug={projectSlug}
          endpoints={activeEndpoints}
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
