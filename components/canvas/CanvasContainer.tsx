"use client";

import * as React from "react";
import { FlowCanvas } from "./FlowCanvas";
import { EditBar } from "@/components/edit-bar/EditBar";
import { AgentComposer } from "@/components/ai/AgentComposer";
import { AgentStoreProvider } from "@/stores/agent-store-provider";
import {
  CanvasDndStoreProvider,
  useCanvasDndStore,
} from "@/stores/canvas-dnd-store-provider";
import { DragDropProvider } from "./DragDropProvider";
import { ProviderPalette } from "./ProviderPalette";
import { FieldInspector } from "./FieldInspector";
import type { Endpoint, Route } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { RiMenuFoldLine, RiMenuUnfoldLine } from "@remixicon/react";
import { cn } from "@/lib/utils";

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
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(true);

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

  const handleFieldAdded = React.useCallback(
    (_routeId: string, _providerValue: string, updatedRoute?: Route) => {
      if (updatedRoute) {
        handleRouteUpdated(updatedRoute);
      }
    },
    [handleRouteUpdated],
  );

  return (
    <DragDropProvider onFieldAdded={handleFieldAdded}>
      <div className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden">
        {/* Left Sidebar: Provider Palette */}
        <div
          className={cn(
            "relative shrink-0 transition-[width,margin] duration-200 ease-out",
            isPaletteOpen ? "w-64" : "w-0 overflow-hidden",
          )}
        >
          {isPaletteOpen && <ProviderPalette routes={activeRoutes} />}
        </div>

        {/* Center: Canvas Workspace */}
        <div className="relative min-h-0 min-w-0 flex-1">
          {/* Palette toggle button docked at the top-left edge of the canvas */}
          <div className="absolute top-3 left-3 z-20">
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              onClick={() => setIsPaletteOpen((prev) => !prev)}
              className="bg-card/90 border-border/80 text-foreground hover:bg-card shadow-xs backdrop-blur-xs"
              title={
                isPaletteOpen
                  ? "Collapse providers palette"
                  : "Expand providers palette"
              }
              aria-label={
                isPaletteOpen
                  ? "Collapse providers palette"
                  : "Expand providers palette"
              }
            >
              {isPaletteOpen ? (
                <RiMenuFoldLine className="size-3.5" aria-hidden="true" />
              ) : (
                <RiMenuUnfoldLine className="size-3.5" aria-hidden="true" />
              )}
            </Button>
          </div>

          <FlowCanvas
            projectId={projectId}
            projectSlug={projectSlug}
            endpoints={endpoints}
            routes={activeRoutes}
            initialState={initialState}
            onSelectRoute={handleSelectRoute}
            onOpenEdit={handleOpenEdit}
          />

          {/* Agent composer docked over the canvas — no modal covers the board. */}
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
    </DragDropProvider>
  );
}

/**
 * CanvasContainer wrapped with both AgentStoreProvider and CanvasDndStoreProvider.
 */
export function CanvasContainer(
  props: CanvasContainerProps,
): React.JSX.Element {
  return (
    <AgentStoreProvider projectId={props.projectId}>
      <CanvasDndStoreProvider>
        <CanvasContainerInner {...props} />
      </CanvasDndStoreProvider>
    </AgentStoreProvider>
  );
}

export default CanvasContainer;
