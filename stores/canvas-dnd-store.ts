import { createStore } from "zustand";
import { immer } from "zustand/middleware/immer";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CanvasDndState {
  /** The route currently selected on the canvas (target for provider drops). */
  selectedRouteId: string | null;
  /** The field id being inspected in the right-side inspector panel. */
  inspectedFieldId: string | null;
}

export interface CanvasDndActions {
  /** Select a route node on canvas (or deselect by passing null). */
  setSelectedRoute: (id: string | null) => void;
  /** Open the field inspector for a specific field. */
  setInspectedField: (id: string | null) => void;
}

export type CanvasDndStore = CanvasDndState & CanvasDndActions;

// ─── Store Factory ───────────────────────────────────────────────────────────

/**
 * Creates an isolated Zustand store for drag-and-drop canvas state.
 * Tracks which route is selected (drop target) and which field is inspected.
 */
export const createCanvasDndStore = () => {
  return createStore<CanvasDndStore>()(
    immer((set) => ({
      selectedRouteId: null,
      inspectedFieldId: null,

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
    })),
  );
};
