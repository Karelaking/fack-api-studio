import { createStore } from "zustand";
import { immer } from "zustand/middleware/immer";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InspectorTab =
  | "route"
  | "schema"
  | "behavior"
  | "try"
  | "config"
  | "rules"
  | "chaos"
  | "headers";

const normalizeInspectorTab = (tab: InspectorTab): InspectorTab => {
  if (tab === "config" || tab === "headers") return "route";
  if (tab === "rules" || tab === "chaos") return "behavior";
  if (tab === "schema") return "schema";
  if (tab === "try") return "try";
  return tab;
};

export interface CanvasDndState {
  /** The route currently selected on the canvas (target for provider drops). */
  selectedRouteId: string | null;
  /** The field id being inspected in the right-side inspector panel. */
  inspectedFieldId: string | null;
  /** Currently active tab in the node inspector */
  inspectorTab: InspectorTab;
}

export interface CanvasDndActions {
  /** Select a route node on canvas (or deselect by passing null). */
  setSelectedRoute: (id: string | null) => void;
  /** Open the field inspector for a specific field. */
  setInspectedField: (id: string | null) => void;
  /** Change active tab in the node inspector */
  setInspectorTab: (tab: InspectorTab) => void;
}

export type CanvasDndStore = CanvasDndState & CanvasDndActions;

// ─── Store Factory ───────────────────────────────────────────────────────────

/**
 * Creates an isolated Zustand store for drag-and-drop canvas state.
 * Tracks which route is selected (drop target), which field is inspected, and active inspector tab.
 */
export const createCanvasDndStore = () => {
  return createStore<CanvasDndStore>()(
    immer((set) => ({
      selectedRouteId: null,
      inspectedFieldId: null,
      inspectorTab: "route",

      setSelectedRoute: (id) =>
        set((state) => {
          state.selectedRouteId = id;
          // Clear field inspection when switching routes
          state.inspectedFieldId = null;
        }),

      setInspectedField: (id) =>
        set((state) => {
          state.inspectedFieldId = id;
        }),

      setInspectorTab: (tab) =>
        set((state) => {
          state.inspectorTab = normalizeInspectorTab(tab);
        }),
    })),
  );
};
