"use client";

import * as React from "react";
import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import { createCanvasDndStore, type CanvasDndStore } from "./canvas-dnd-store";

// ─── React Context ───────────────────────────────────────────────────────────

const CanvasDndStoreContext = React.createContext<
  StoreApi<CanvasDndStore> | undefined
>(undefined);

interface CanvasDndStoreProviderProps {
  children: React.ReactNode;
}

/**
 * SSR-safe provider for the canvas drag-and-drop Zustand store.
 * Must wrap the entire canvas container so palette and inspector share state.
 */
export const CanvasDndStoreProvider = ({
  children,
}: CanvasDndStoreProviderProps): React.JSX.Element => {
  const [store] = React.useState(() => createCanvasDndStore());

  return (
    <CanvasDndStoreContext.Provider value={store}>
      {children}
    </CanvasDndStoreContext.Provider>
  );
};

/**
 * Custom hook to access the canvas drag-and-drop store.
 *
 * @param selector - Selector function mapping store state to desired value
 * @returns Selected slice of the DnD store state
 *
 * @example
 * ```ts
 * const selectedRouteId = useCanvasDndStore((s) => s.selectedRouteId);
 * ```
 */
export const useCanvasDndStore = <T,>(
  selector: (store: CanvasDndStore) => T,
): T => {
  const context = React.useContext(CanvasDndStoreContext);
  if (!context) {
    throw new Error(
      "useCanvasDndStore must be used within a CanvasDndStoreProvider",
    );
  }
  return useStore(context, selector);
};
