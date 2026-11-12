"use client";

import * as React from "react";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PikaIcon } from "@pikaicons/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  DeleteDustbin01Icon,
  PencilEditIcon,
  PlusIcon,
  ThreeDotsMenuVerticalIcon,
} from "@pikaicons/core-free";
import { useSchemaStore } from "@/stores/store-provider";
import type { SchemaField } from "@/lib/schema-synthesizer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FieldSettingsModal } from "./FieldSettingsModal";

interface FieldEditorProps {
  field: SchemaField;
  depth: number;
}

export const FieldEditor = ({
  field,
  depth,
}: FieldEditorProps): React.JSX.Element => {
  const updateField = useSchemaStore((state) => state.updateField);
  const removeField = useSchemaStore((state) => state.removeField);
  const addField = useSchemaStore((state) => state.addField);
  const moveField = useSchemaStore((state) => state.moveField);

  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isAddChildModalOpen, setIsAddChildModalOpen] = React.useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const isObject = field.type === "object";
  const isArray = field.type === "array";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("space-y-1.5", isDragging && "relative z-10 opacity-60")}
    >
      {/* Field Row */}
      <div
        className={cn(
          "border-border bg-card/65 hover:border-muted-foreground/15 relative flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 shadow-sm transition-all",
          isDragging && "border-primary/60 bg-primary/5 shadow-md",
          depth > 0 && "ml-3",
        )}
      >
        {/* Nesting Indicator */}
        {depth > 0 && (
          <PikaIcon
            icon={ChevronRightIcon}
            className="text-muted-foreground/60 absolute top-3 -left-3 size-3"
          />
        )}

        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-muted-foreground/70 hover:text-foreground inline-flex h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded active:cursor-grabbing"
          title="Drag to reorder"
          aria-label={`Reorder ${field.name}`}
        >
          <PikaIcon icon={ThreeDotsMenuVerticalIcon} className="size-3.5" />
        </button>

        {/* Field Name & Type display */}
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <span className="truncate font-mono text-sm font-semibold">
            {field.name}
          </span>
          <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-xs font-medium">
            {field.type}
            {isArray && field.arrayItemType && ` (${field.arrayItemType})`}
          </span>
          {field.source?.type === "pathParam" && (
            <span
              className="bg-primary/10 text-primary border-primary/30 shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs font-semibold whitespace-nowrap"
              title={`URL parameter :${field.source.name}`}
            >
              :{field.source.name}
            </span>
          )}
          {(field.source as { type?: string; name?: string })?.type ===
            "queryParam" && (
            <span
              className="bg-info/10 text-info border-info/30 shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs font-semibold whitespace-nowrap"
              title={`Query parameter ?${(field.source as { name: string }).name}`}
            >
              ?{(field.source as { name: string }).name}
            </span>
          )}
          {field.source?.type === "static" && (
            <span
              className="bg-success/10 text-success border-success/30 shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs font-semibold whitespace-nowrap"
              title={`Static value: "${field.source.value}"`}
            >
              =&quot;{field.source.value}&quot;
            </span>
          )}
          {field.nullable && (
            <span className="text-muted-foreground/70 text-xs font-semibold tracking-wider uppercase">
              NULL
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {/* Reorder Buttons */}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            title="Move Up"
            aria-label="Move Up"
            onClick={() => moveField(field.id, "up")}
          >
            <PikaIcon icon={ArrowUpIcon} className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            title="Move Down"
            aria-label="Move Down"
            onClick={() => moveField(field.id, "down")}
          >
            <PikaIcon icon={ArrowDownIcon} className="size-3.5" />
          </Button>

          {/* Edit Button */}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            title="Edit Field"
            aria-label="Edit Field"
            onClick={() => setIsEditModalOpen(true)}
          >
            <PikaIcon icon={PencilEditIcon} className="size-3.5" />
          </Button>

          {/* Add Child Button (Only for Object type, or Array items of type Object) */}
          {(isObject || (isArray && field.arrayItemType === "object")) && (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              title="Add Child Field"
              aria-label="Add Child Field"
              onClick={() => setIsAddChildModalOpen(true)}
            >
              <PikaIcon icon={PlusIcon} className="size-3.5" />
            </Button>
          )}
          <Button
            type="button"
            size="icon-sm"
            variant="destructive"
            title="Delete Field"
            aria-label="Delete Field"
            onClick={() => removeField(field.id)}
          >
            <PikaIcon icon={DeleteDustbin01Icon} className="size-3.5" />
          </Button>
        </div>
      </div>

      <FieldSettingsModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        initialData={field}
        onSave={(updates) => updateField(field.id, updates)}
        title="Edit Field"
      />

      <FieldSettingsModal
        open={isAddChildModalOpen}
        onOpenChange={setIsAddChildModalOpen}
        onSave={(fieldUpdates) => addField(field.id, fieldUpdates)}
        title="Add Child Field"
      />

      {/* Recursive Children (Object Children) */}
      {isObject && field.children && field.children.length > 0 && (
        <SortableContext
          items={field.children.map((child) => child.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="border-border/80 mt-1 space-y-1.5 border-l pl-2">
            {field.children.map((child) => (
              <FieldEditor key={child.id} field={child} depth={depth + 1} />
            ))}
          </div>
        </SortableContext>
      )}

      {/* Recursive Children (Array Item Object Children) */}
      {isArray &&
        field.arrayItemType === "object" &&
        field.arrayItemChildren &&
        field.arrayItemChildren.length > 0 && (
          <SortableContext
            items={field.arrayItemChildren.map((child) => child.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="border-border/80 mt-1 space-y-1.5 border-l pl-2">
              {field.arrayItemChildren.map((child) => (
                <FieldEditor key={child.id} field={child} depth={depth + 1} />
              ))}
            </div>
          </SortableContext>
        )}
    </div>
  );
};
export default FieldEditor;
