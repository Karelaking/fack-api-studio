"use client";

import * as React from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { addFieldToRoute } from "@/lib/actions/canvas-dnd";
import type { Route } from "@/db/schema";

interface DragDropProviderProps {
  children: React.ReactNode;
  /** Called after a successful field drop so the canvas can refresh. */
  onFieldAdded?: (
    routeId: string,
    providerValue: string,
    updatedRoute?: Route,
  ) => void;
}

/**
 * Wraps the canvas layout in a @dnd-kit DndContext.
 *
 * Sensor configuration:
 * - PointerSensor with 5px activation distance: distinguishes click (select)
 *   from drag (add field). Without the threshold every click starts a drag.
 * - KeyboardSensor: Space/Arrow navigation in the sidebar chip list.
 *
 * DragOverlay renders a floating ghost card that follows the cursor, giving
 * the user clear drag feedback without polluting the DOM of the source chip.
 */
export const DragDropProvider = ({
  children,
  onFieldAdded,
}: DragDropProviderProps): React.JSX.Element => {
  const [activeProviderLabel, setActiveProviderLabel] = React.useState<
    string | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // 5px prevents mis-triggering drag on a click
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "provider") {
      setActiveProviderLabel(data.label as string);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveProviderLabel(null);

    const { active, over } = event;
    if (!over) return;

    const data = active.data.current;
    if (data?.type !== "provider") return;

    // over.id is set to the routeId by the useDroppable hook in RouteNode
    const routeId = over.id as string;
    const providerValue = data.value as string;
    const providerLabel = data.label as string;

    try {
      const updated = await addFieldToRoute(routeId, providerValue);
      onFieldAdded?.(routeId, providerValue, updated);
      window.dispatchEvent(
        new CustomEvent("canvas-field-added", {
          detail: { routeId, providerValue, updatedRoute: updated },
        }),
      );
      toast.success(`Added "${providerLabel}" field`);
    } catch {
      toast.error(`Failed to add "${providerLabel}" field`);
    }
  };

  return (
    <DndContext
      id="canvas-dnd"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}

      {/* Floating ghost that follows the cursor while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeProviderLabel ? (
          <div className="bg-card border-primary/40 shadow-primary/10 rounded-lg border px-2.5 py-2 shadow-lg">
            <span className="text-foreground text-caption font-semibold">
              {activeProviderLabel}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DragDropProvider;
