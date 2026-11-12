"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PikaIcon } from "@pikaicons/react";
import {
  File02Icon,
  PlusIcon,
  QuestionMarkCircleIcon,
} from "@pikaicons/core-free";
import { useSchemaStore } from "@/stores/store-provider";
import { FieldEditor } from "./FieldEditor";
import { FieldSettingsModal } from "./FieldSettingsModal";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";
import type { SchemaField } from "@/lib/schema-synthesizer";

const USER_STARTER: SchemaField[] = [
  {
    id: "starter-user-id",
    name: "id",
    type: "string",
    nullable: false,
    fakerProvider: "string.uuid",
  },
  {
    id: "starter-user-name",
    name: "name",
    type: "string",
    nullable: false,
    fakerProvider: "person.fullName",
  },
  {
    id: "starter-user-email",
    name: "email",
    type: "string",
    nullable: false,
    fakerProvider: "internet.email",
  },
  {
    id: "starter-user-avatar",
    name: "avatar",
    type: "string",
    nullable: true,
    fakerProvider: "image.avatar",
  },
  {
    id: "starter-user-active",
    name: "isActive",
    type: "boolean",
    nullable: false,
    fakerProvider: "datatype.boolean",
  },
];

const PRODUCT_STARTER: SchemaField[] = [
  {
    id: "starter-prod-id",
    name: "id",
    type: "string",
    nullable: false,
    fakerProvider: "string.uuid",
  },
  {
    id: "starter-prod-title",
    name: "title",
    type: "string",
    nullable: false,
    fakerProvider: "commerce.productName",
  },
  {
    id: "starter-prod-price",
    name: "price",
    type: "number",
    nullable: false,
    fakerProvider: "commerce.price",
  },
  {
    id: "starter-prod-category",
    name: "category",
    type: "string",
    nullable: false,
    fakerProvider: "commerce.department",
  },
  {
    id: "starter-prod-stock",
    name: "inStock",
    type: "boolean",
    nullable: false,
    fakerProvider: "datatype.boolean",
  },
];

/**
 * Root container for response payload schema editing.
 * Maps field tree arrays to interactive recursive rows.
 */
export function FieldTree(): React.JSX.Element {
  const fields = useSchemaStore((state) => state.fields);
  const addField = useSchemaStore((state) => state.addField);
  const setSchema = useSchemaStore((state) => state.setSchema);
  const reorderField = useSchemaStore((state) => state.reorderField);

  const [modalOpen, setModalOpen] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderField(String(active.id), String(over.id));
  };

  const handleLoadStarter = (starter: SchemaField[], label: string) => {
    // Generate fresh IDs for starter fields
    const fresh = starter.map((f) => ({ ...f, id: crypto.randomUUID() }));
    setSchema(fresh);
    toast.success(`Loaded ${label} template schema`);
  };

  const handleAddRootField = (
    fieldUpdates: Partial<Omit<SchemaField, "id">>,
  ) => {
    addField(undefined, fieldUpdates);
  };

  return (
    <div className="space-y-4 pt-1">
      <div className="border-border flex items-start justify-between gap-4 border-b pb-3">
        <div className="flex-1 space-y-1">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <PikaIcon icon={File02Icon} className="text-primary size-4" />
            <span>Response Schema Fields</span>
          </h3>
          <p className="text-muted-foreground max-w-[90%] text-xs leading-relaxed">
            Configure keys, types, and mock datatypes. Drag and drop rows to
            reorder.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          title="Add Root Field"
          aria-label="Add Root Field"
          onClick={() => setModalOpen(true)}
        >
          <PikaIcon icon={PlusIcon} className="mr-1 size-4" />
          <span>Add Field</span>
        </Button>
      </div>

      {/* Fields List */}
      {fields.length === 0 ? (
        <div className="bg-muted/20 border-border/80 flex flex-col items-center justify-center space-y-2 border border-dashed p-6 text-center">
          <PikaIcon
            icon={QuestionMarkCircleIcon}
            className="text-muted-foreground/60 size-6 stroke-1"
          />
          <div className="text-xs font-semibold">
            No schema fields configured
          </div>
          <p className="text-muted-foreground max-w-64 text-xs leading-normal">
            An empty schema returns `{}`. Start by adding a single blank field
            or initialize with a common starter template.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <Button
              type="button"
              size="xs"
              variant="default"
              onClick={() => setModalOpen(true)}
            >
              Add Blank Field
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => handleLoadStarter(USER_STARTER, "User")}
            >
              User Template
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => handleLoadStarter(PRODUCT_STARTER, "Product")}
            >
              Product Template
            </Button>
          </div>
        </div>
      ) : (
        <DndContext
          id="field-tree-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((field) => field.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1.5 pr-1">
              {fields.map((field) => (
                <FieldEditor key={field.id} field={field} depth={0} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <FieldSettingsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleAddRootField}
        title="Add Root Field"
      />
    </div>
  );
}
export default FieldTree;
