"use client";

import * as React from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  useReactFlow,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import { saveCanvasState } from "@/lib/actions/canvas";
import { updateRoute } from "@/lib/actions/routes";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQueryState, parseAsBoolean } from "nuqs";
import { getProjectUrl } from "@/lib/utils/project-slug";
import { RouteNode, type RouteNodeData } from "./RouteNode";
import {
  buildDraftPlan,
  EMPTY_DRAFT_PLAN,
  type DraftMark,
  type DraftPlan,
} from "./preview-nodes";
import { useAgentStore } from "@/stores/agent-store-provider";
import { useCanvasDndStore } from "@/stores/canvas-dnd-store-provider";
import { LoggerRegistry } from "@/lib/logger-registry";

const canvasUiTrace = LoggerRegistry.getTrace("ui-flow-canvas");
import { EndpointGroupNode } from "./EndpointGroupNode";
import type { Endpoint, Route } from "@/db/schema";
import { GitBranchIcon } from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";

const LazyAddRouteDialog = dynamic(
  () => import("./AddRouteDialog").then((mod) => mod.AddRouteDialog),
  { ssr: false },
);

// Custom Node Types registered on React Flow canvas
const nodeTypes = {
  routeNode: RouteNode,
  endpointGroup: EndpointGroupNode,
};

/**
 * Canvas geometry. Route cards are laid out with fixed vertical rhythm so a
 * card that grows a metrics footer never overlaps its sibling; the group
 * container is sized to fit its children plus padding.
 */
const ROUTE_NODE_WIDTH = 320; // must match RouteNode's `w-80`
const ROUTE_SIBLING_X = 30; // left inset of a route inside its group
const GROUP_WIDTH = ROUTE_SIBLING_X + ROUTE_NODE_WIDTH + 18; // right inset
const GROUP_HEADER_OFFSET = 92; // first route's y: group header bottom (~75px) + its mb-4 gap
const ROUTE_NODE_SPACING = 250; // card height with field badges + 16px gap

function groupHeightFor(routeCount: number): number {
  return Math.max(
    140,
    GROUP_HEADER_OFFSET + routeCount * ROUTE_NODE_SPACING + 16,
  );
}

/**
 * Zoomed-out floor. React Flow clamps `fitView` to `minZoom`, which defaults to
 * 0.5 — too tight to fit three endpoint groups on a phone (needs ~0.35) or a
 * tablet in portrait with the sidebar open (needs ~0.48), so those viewports
 * used to open with node groups clipped off-screen.
 */
const MIN_ZOOM = 0.1;

/**
 * Fit settings shared by the initial mount, the resize refit, and the toolbar
 * action so all three agree on framing. Capping `maxZoom` keeps a near-empty
 * canvas from magnifying a single card past life size.
 */
const FIT_VIEW_OPTIONS = { padding: 0.15, maxZoom: 1 } as const;

/**
 * Smallest container delta (px) that counts as a real relayout worth refitting
 * for. Filters out scrollbar and rounding jitter while still catching rotation,
 * breakpoint changes, and the sidebar collapsing (~256px).
 */
const REFIT_THRESHOLD_PX = 40;

/** Frame the graph to the current container box, animating so a refit after a
 *  rotate or resize reads as a deliberate move rather than a jump cut. */
function refitViewport(instance: {
  fitView: (options?: {
    padding?: number;
    maxZoom?: number;
    duration?: number;
  }) => unknown;
}): void {
  void instance.fitView({ ...FIT_VIEW_OPTIONS, duration: 200 });
}

export interface FlowCanvasViewportProps {
  projectId: string;
  projectSlug: string;
  endpoints: (Endpoint & { routes: Route[] })[];
  routes: Route[];
  initialState?: {
    nodes: string;
    edges: string;
    viewport: string;
  };
  onSelectRoute: (routeId: string) => void;
  onOpenEdit: (routeId: string) => void;
  onDeleteRoute?: (routeId: string) => void;
  onUpdateGroup?: (updatedEndpoint: Endpoint) => void;
  onDeleteGroup?: (endpointId: string) => void;
}

interface ReconcileCallbacks {
  onToggleEnabled: (id: string, isEnabled: boolean) => void;
  onSelectRoute: (id: string) => void;
  onOpenEdit: (id: string) => void;
  onDeleteRoute?: (id: string) => void;
  onUpdateGroup?: (updatedEndpoint: Endpoint) => void;
  onDeleteGroup?: (endpointId: string) => void;
}

/**
 * Builds the React Flow node list from the database truth (endpoints + routes),
 * preserving any positions the user has already saved for known node ids.
 *
 * Single source of truth for both the initial mount and every later
 * reconciliation, so the two paths cannot drift apart.
 */
function reconcileNodes(
  savedNodes: Node[],
  endpoints: (Endpoint & { routes: Route[] })[],
  routes: Route[],
  projectSlug: string,
  callbacks: ReconcileCallbacks,
  draftPlan: DraftPlan = EMPTY_DRAFT_PLAN,
): Node[] {
  const reconciled: Node[] = [];
  const savedById = new Map(savedNodes.map((node) => [node.id, node]));
  const endpointById = new Map(endpoints.map((ep) => [ep.id, ep]));
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const draftRouteCountByGroup = new Map<string, number>();
  for (const draftRoute of draftPlan.routes) {
    draftRouteCountByGroup.set(
      draftRoute.parentId,
      (draftRouteCountByGroup.get(draftRoute.parentId) ?? 0) + 1,
    );
  }
  const routeSiblingCountByGroup = new Map<string, number>();

  // 1. Group nodes (endpoints)
  endpoints.forEach((ep, epIdx) => {
    const groupId = `group-${ep.id}`;
    const saved = savedById.get(groupId);
    const draftRoutesInGroup = draftRouteCountByGroup.get(groupId) ?? 0;
    const size = {
      width: GROUP_WIDTH,
      height: groupHeightFor(ep.routes.length + draftRoutesInGroup),
    };

    reconciled.push({
      ...saved,
      id: groupId,
      type: "endpointGroup",
      data: {
        id: ep.id,
        label: ep.name,
        basePath: ep.basePath,
        color: ep.color ?? "",
        icon: ep.icon ?? "",
        routesCount: ep.routes.length,
        onUpdateGroup: callbacks.onUpdateGroup,
        onDeleteGroup: callbacks.onDeleteGroup,
      },
      position: saved?.position ?? {
        x: 40 + epIdx * (GROUP_WIDTH + 40),
        y: 40,
      },
      style: { ...saved?.style, ...size },
      ariaLabel: `Endpoint group ${ep.name}, base path ${ep.basePath || "/"}`,
    });
  });

  // 2. Route nodes (children of their endpoint group)
  routes.forEach((route) => {
    const endpoint = endpointById.get(route.endpointId);
    if (!endpoint) return;

    const groupId = `group-${route.endpointId}`;
    const saved = savedById.get(route.id);
    const siblingCount = routeSiblingCountByGroup.get(groupId) ?? 0;
    routeSiblingCountByGroup.set(groupId, siblingCount + 1);

    const routeNodeData = {
      id: route.id,
      method: route.method,
      path: route.path,
      statusCode: route.statusCode,
      isEnabled: route.isEnabled,
      latencyMin: route.latencyMin ?? 0,
      latencyMax: route.latencyMax ?? 0,
      errorRate: route.errorRate ?? 0,
      responseSchema: route.responseSchema ?? "{}",
      customHeaders: route.customHeaders ?? "{}",
      conditionalRules: route.conditionalRules ?? "[]",
      onToggleEnabled: callbacks.onToggleEnabled,
      onSelectRoute: callbacks.onSelectRoute,
      onOpenEdit: callbacks.onOpenEdit,
      onDeleteRoute: callbacks.onDeleteRoute,
      mockUrl: `${origin}/${projectSlug}${endpoint.basePath || ""}${route.path}`,
      draft: draftPlan.marks[route.id],
    } satisfies RouteNodeData;

    reconciled.push({
      ...saved,
      id: route.id,
      type: "routeNode",
      parentId: groupId,
      extent: "parent",
      position: saved?.position ?? {
        x: ROUTE_SIBLING_X,
        y: GROUP_HEADER_OFFSET + siblingCount * ROUTE_NODE_SPACING,
      },
      data: routeNodeData,
      ariaLabel: `Route ${route.method} ${route.path}, status ${route.statusCode}, ${
        route.isEnabled ? "enabled" : "disabled"
      }`,
    });
  });

  // 3. Draft endpoint groups that only exist in the pending change set.
  draftPlan.groups.forEach((group) => {
    const draftRoutesInGroup = draftRouteCountByGroup.get(group.id) ?? 0;

    reconciled.push({
      id: group.id,
      type: "endpointGroup",
      data: {
        label: group.label,
        basePath: group.basePath,
        draft: { order: group.order },
      },
      position: {
        x: 40 + (endpoints.length + group.order) * (GROUP_WIDTH + 40),
        y: 40,
      },
      style: {
        width: GROUP_WIDTH,
        height: groupHeightFor(draftRoutesInGroup),
      },
      draggable: false,
      selectable: false,
      ariaLabel: `Draft endpoint group ${group.label}`,
    });
  });

  // 4. Draft routes, placed after any real siblings already in the group.
  draftPlan.routes.forEach((draftRoute) => {
    const siblingCount = routeSiblingCountByGroup.get(draftRoute.parentId) ?? 0;
    routeSiblingCountByGroup.set(draftRoute.parentId, siblingCount + 1);

    reconciled.push({
      id: draftRoute.id,
      type: "routeNode",
      parentId: draftRoute.parentId,
      extent: "parent",
      position: {
        x: ROUTE_SIBLING_X,
        y: GROUP_HEADER_OFFSET + siblingCount * ROUTE_NODE_SPACING,
      },
      data: {
        id: draftRoute.id,
        method: draftRoute.method,
        path: draftRoute.path,
        statusCode: draftRoute.statusCode,
        isEnabled: true,
        latencyMin: draftRoute.latencyMin,
        latencyMax: draftRoute.latencyMax,
        errorRate: draftRoute.errorRate,
        responseSchema: "{}",
        customHeaders: "{}",
        conditionalRules: "[]",
        onToggleEnabled: callbacks.onToggleEnabled,
        onSelectRoute: callbacks.onSelectRoute,
        onOpenEdit: callbacks.onOpenEdit,
        mockUrl: "",
        draft: draftRoute.mark,
      } satisfies RouteNodeData,
      draggable: false,
      selectable: false,
      ariaLabel: `Draft route ${draftRoute.method} ${draftRoute.path}`,
    });
  });

  return reconciled;
}

/**
 * React Flow Inner Canvas wrapper component.
 * Directly handles drag events, coordinates saving, and custom node bindings.
 */
export function FlowCanvasViewport({
  projectId,
  projectSlug,
  endpoints,
  routes,
  initialState,
  onSelectRoute,
  onOpenEdit,
  onDeleteRoute,
  onUpdateGroup,
  onDeleteGroup,
}: FlowCanvasViewportProps): React.JSX.Element {
  const reactFlowInstance = useReactFlow();
  const router = useRouter();
  const setSelectedRouteInStore = useCanvasDndStore((s) => s.setSelectedRoute);
  const { resolvedTheme } = useTheme();
  const [newRouteQuery, setNewRouteQuery] = useQueryState(
    "newRoute",
    parseAsBoolean.withDefault(false),
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [hasOpenedAddRoute, setHasOpenedAddRoute] = React.useState(false);

  // Unapplied agent drafts are derived from the session so the canvas can show
  // what the agent proposes without writing anything to the database.
  const pendingChangeSet = useAgentStore(
    (state) => state.result?.changeSet ?? null,
  );
  const draftPlan = React.useMemo(
    () => buildDraftPlan(pendingChangeSet, endpoints),
    [pendingChangeSet, endpoints],
  );

  const isAddRouteOpen = dialogOpen || newRouteQuery;

  const openAddRoute = React.useCallback(() => {
    setHasOpenedAddRoute(true);
    setDialogOpen(true);
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setHasOpenedAddRoute(true);
    }
    setDialogOpen(open);
    if (!open && newRouteQuery) {
      void setNewRouteQuery(null);
    }
  };

  // Listen for global open-add-route event
  React.useEffect(() => {
    window.addEventListener("open-add-route-dialog", openAddRoute);

    return () =>
      window.removeEventListener("open-add-route-dialog", openAddRoute);
  }, [openAddRoute]);

  const handleToggleEnabled = React.useCallback(
    async (id: string, isEnabled: boolean) => {
      canvasUiTrace.traceCall("onToggleEnabled", id, isEnabled);
      try {
        await updateRoute({ id, isEnabled });
        toast.success("Route status updated!");
        canvasUiTrace.traceSuccess("onToggleEnabled", isEnabled);
      } catch (err) {
        toast.error("Failed to toggle route status");
        canvasUiTrace.traceError("onToggleEnabled", err);
      }
    },
    [],
  );

  const nodeCallbacks = React.useMemo<ReconcileCallbacks>(
    () => ({
      onToggleEnabled: (id, isEnabled) =>
        void handleToggleEnabled(id, isEnabled),
      onSelectRoute,
      onOpenEdit,
      onDeleteRoute,
      onUpdateGroup,
      onDeleteGroup,
    }),
    [
      handleToggleEnabled,
      onSelectRoute,
      onOpenEdit,
      onDeleteRoute,
      onUpdateGroup,
      onDeleteGroup,
    ],
  );

  const initialNodes: Node[] = React.useMemo(() => {
    let savedNodes: Node[] = [];
    if (initialState?.nodes) {
      try {
        const parsed = JSON.parse(initialState.nodes);
        if (Array.isArray(parsed)) {
          savedNodes = parsed;
        }
      } catch (e) {
        console.error("Failed to parse canvas nodes:", e);
      }
    }

    return reconcileNodes(
      savedNodes,
      endpoints,
      routes,
      projectSlug,
      nodeCallbacks,
      draftPlan,
    );
    // `initialState` is intentionally excluded: it seeds the very first render
    // only, and later changes flow through the reconciliation effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoints, routes, projectSlug, nodeCallbacks, draftPlan]);

  const initialEdges: Edge[] = React.useMemo(() => {
    let savedEdges: Edge[] = [];
    if (initialState?.edges) {
      try {
        const parsed = JSON.parse(initialState.edges);
        if (Array.isArray(parsed)) {
          savedEdges = parsed;
        }
      } catch (e) {
        console.error("Failed to parse canvas edges:", e);
      }
    }

    // Discard stale edges connecting deleted routes and style active ones
    const activeRouteIds = new Set(routes.map((r) => r.id));
    return savedEdges
      .filter(
        (edge) =>
          activeRouteIds.has(edge.source) && activeRouteIds.has(edge.target),
      )
      .map((edge) => ({
        ...edge,
        animated: true,
        style: {
          stroke: "var(--color-primary)",
          strokeWidth: 2.5,
          strokeDasharray: "6 4",
        },
      }));
  }, [initialState, routes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const lastDispatchedRouteKeyRef = React.useRef<string | null>(null);

  // Sync selected node mock links with global dashboard sidebar and DnD store.
  // Using React Flow's onSelectionChange rather than watching the full [nodes] array,
  // preventing 60fps drag frames from triggering selection scans.
  const handleSelectionChange = React.useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      const selectedRouteNode = selectedNodes.find(
        (n) => n.type === "routeNode",
      );
      if (selectedRouteNode) {
        setSelectedRouteInStore(selectedRouteNode.id);
        const selectedRouteData = selectedRouteNode.data as {
          path: string;
          method: string;
          mockUrl: string;
        };
        const key = `${selectedRouteNode.id}:${selectedRouteData.path}:${selectedRouteData.method}:${selectedRouteData.mockUrl}`;
        if (lastDispatchedRouteKeyRef.current === key) return;
        lastDispatchedRouteKeyRef.current = key;

        window.dispatchEvent(
          new CustomEvent("route-selected", {
            detail: {
              id: selectedRouteNode.id,
              path: selectedRouteData.path,
              method: selectedRouteData.method,
              mockUrl: selectedRouteData.mockUrl,
            },
          }),
        );
      } else {
        setSelectedRouteInStore(null);
        if (lastDispatchedRouteKeyRef.current === null) return;
        lastDispatchedRouteKeyRef.current = null;
        window.dispatchEvent(
          new CustomEvent("route-selected", { detail: null }),
        );
      }
    },
    [setSelectedRouteInStore],
  );

  const handlePaneClick = React.useCallback(() => {
    setSelectedRouteInStore(null);
    lastDispatchedRouteKeyRef.current = null;
    window.dispatchEvent(new CustomEvent("route-selected", { detail: null }));
  }, [setSelectedRouteInStore]);

  // Reconcile node state when endpoints or routes change, preserving positions.
  React.useEffect(() => {
    setNodes((prevNodes) =>
      reconcileNodes(
        prevNodes,
        endpoints,
        routes,
        projectSlug,
        nodeCallbacks,
        draftPlan,
      ),
    );
  }, [endpoints, routes, projectSlug, nodeCallbacks, draftPlan, setNodes]);

  // Bring freshly streamed drafts into view as soon as they land.
  const draftCount = draftPlan.total;
  React.useEffect(() => {
    if (draftCount === 0) return;

    const timer = window.setTimeout(
      () => refitViewport(reactFlowInstance),
      240,
    );
    return () => window.clearTimeout(timer);
  }, [draftCount, reactFlowInstance]);

  const onConnect = React.useCallback(
    (params: Connection) => {
      canvasUiTrace.traceCall("onConnect", params.source, params.target);
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: {
              stroke: "var(--color-primary)",
              strokeWidth: 2.5,
              strokeDasharray: "6 4",
            },
          },
          eds,
        ),
      );
      canvasUiTrace.traceSuccess("onConnect", "edge added");
    },
    [setEdges],
  );

  const handleSave = React.useCallback(async () => {
    canvasUiTrace.traceCall("handleSave", projectId);
    window.dispatchEvent(new CustomEvent("canvas-save-start"));
    try {
      const flow = reactFlowInstance.toObject();
      await saveCanvasState({
        projectId,
        nodes: JSON.stringify(flow.nodes),
        edges: JSON.stringify(flow.edges),
        viewport: JSON.stringify(flow.viewport),
      });
      toast.success("Canvas layout saved!");
      canvasUiTrace.traceSuccess("handleSave", "saved");
    } catch (err) {
      toast.error("Failed to save canvas coordinates");
      canvasUiTrace.traceError("handleSave", err);
    } finally {
      window.dispatchEvent(new CustomEvent("canvas-save-end"));
    }
  }, [reactFlowInstance, projectId]);

  // Listen for global canvas top bar actions
  React.useEffect(() => {
    const handleZoomIn = () => reactFlowInstance.zoomIn({ duration: 200 });
    const handleZoomOut = () => reactFlowInstance.zoomOut({ duration: 200 });
    const handleFitView = () => refitViewport(reactFlowInstance);
    const handleSaveTrigger = () => handleSave();

    window.addEventListener("canvas-zoom-in", handleZoomIn);
    window.addEventListener("canvas-zoom-out", handleZoomOut);
    window.addEventListener("canvas-fit-view", handleFitView);
    window.addEventListener("canvas-save", handleSaveTrigger);

    return () => {
      window.removeEventListener("canvas-zoom-in", handleZoomIn);
      window.removeEventListener("canvas-zoom-out", handleZoomOut);
      window.removeEventListener("canvas-fit-view", handleFitView);
      window.removeEventListener("canvas-save", handleSaveTrigger);
    };
  }, [reactFlowInstance, handleSave]);

  /**
   * React Flow only fits the view on mount, so a phone rotating, a breakpoint
   * change, or the sidebar collapsing would leave the far node groups clipped
   * off the canvas. Refit whenever the canvas box changes size materially,
   * debounced so a drag-resize settles before we move the camera.
   */
  const canvasRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;

    let lastWidth = element.clientWidth;
    let lastHeight = element.clientHeight;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const observer = new ResizeObserver(() => {
      const width = element.clientWidth;
      const height = element.clientHeight;

      if (
        Math.abs(width - lastWidth) < REFIT_THRESHOLD_PX &&
        Math.abs(height - lastHeight) < REFIT_THRESHOLD_PX
      ) {
        return;
      }

      lastWidth = width;
      lastHeight = height;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (cancelled) return;
        refitViewport(reactFlowInstance);
      }, 150);
    });

    observer.observe(element);

    return () => {
      cancelled = true;
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [reactFlowInstance]);

  const handleRouteAdded = () => {
    router.refresh();
    toast.success("Node added to canvas viewport");
  };

  const handleNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Draft nodes are proposals, not persisted routes, so they must not open
      // the route editor.
      if ((node.data as { draft?: DraftMark }).draft) {
        return;
      }
      if (node.type === "routeNode") {
        onSelectRoute(node.id);
      }
    },
    [onSelectRoute],
  );

  const handleNodesDelete = React.useCallback(
    (deletedNodes: Node[]) => {
      deletedNodes.forEach((node) => {
        if (node.type === "routeNode") {
          onDeleteRoute?.(node.id);
        }
      });
    },
    [onDeleteRoute],
  );

  const isEmpty = routes.length === 0;
  const hasEndpoints = endpoints.length > 0;

  return (
    <div
      ref={canvasRef}
      className="bg-background relative h-full w-full overflow-hidden"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onSelectionChange={handleSelectionChange}
        onPaneClick={handlePaneClick}
        onNodesDelete={handleNodesDelete}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={MIN_ZOOM}
        colorMode={resolvedTheme}
        deleteKeyCode={null}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          className="opacity-70 dark:opacity-40"
          color="var(--canvas-dot)"
        />
        <Controls className="bg-card! border-border! shadow-xs!" />
        <MiniMap
          zoomable
          pannable
          nodeColor={(node) => {
            if (node.type === "endpointGroup") {
              return "var(--canvas-minimap-group)";
            }
            return "var(--canvas-minimap-node)";
          }}
          maskColor="var(--canvas-mask)"
          className="bg-card! border-border! h-18.75! w-25! shadow-xs! sm:h-27.5! sm:w-37.5! md:h-37.5! md:w-50!"
        />
      </ReactFlow>

      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="bg-card/95 border-border pointer-events-auto flex max-w-sm flex-col items-center gap-4 rounded-xl border px-6 py-8 text-center shadow-lg backdrop-blur-sm">
            <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
              <PikaIcon icon={GitBranchIcon} size={20} aria-hidden="true" />
            </span>
            <div className="space-y-1.5">
              <h2 className="text-foreground text-base font-semibold">
                {hasEndpoints
                  ? "No routes on the canvas yet"
                  : "Start with an endpoint group"}
              </h2>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {hasEndpoints
                  ? "Add your first route to define a path, status code, and response schema on the canvas."
                  : "Routes live inside endpoint groups. Create your first group, then add routes to it."}
              </p>
            </div>
            {hasEndpoints ? (
              <Button type="button" size="sm" onClick={openAddRoute}>
                Add your first route
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link href={getProjectUrl(projectSlug, "endpoints")}>
                  Create an endpoint group
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {(hasOpenedAddRoute || isAddRouteOpen) && (
        <LazyAddRouteDialog
          open={isAddRouteOpen}
          onOpenChange={handleOpenChange}
          endpoints={endpoints}
          onRouteAdded={handleRouteAdded}
        />
      )}
    </div>
  );
}

export default FlowCanvasViewport;
