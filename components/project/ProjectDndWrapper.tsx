"use client";

import * as React from "react";
import { CanvasDndStoreProvider } from "@/stores/canvas-dnd-store-provider";
import { DragDropProvider } from "@/components/canvas/DragDropProvider";

interface ProjectDndWrapperProps {
  children: React.ReactNode;
}

/**
 * Client wrapper that provides both CanvasDndStore and DragDropProvider (DndContext)
 * at the project layout level.
 *
 * This enables draggable provider chips in the main DashboardSidebar to be dropped
 * onto droppable route cards inside the canvas workspace.
 */
export function ProjectDndWrapper({
  children,
}: ProjectDndWrapperProps): React.JSX.Element {
  return (
    <CanvasDndStoreProvider>
      <DragDropProvider>{children}</DragDropProvider>
    </CanvasDndStoreProvider>
  );
}

export default ProjectDndWrapper;
