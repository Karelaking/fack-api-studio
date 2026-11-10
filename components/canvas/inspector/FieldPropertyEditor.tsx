"use client";

import * as React from "react";
import { toast } from "sonner";
import { updateRoute } from "@/lib/actions/routes";
import { removeFieldFromRoute } from "@/lib/actions/canvas-dnd";
import { synthesizeSchema, type SchemaField } from "@/lib/schema-synthesizer";
import {
  getEffectiveRoutePath,
  extractRoutePathParameters,
} from "@/lib/services/route-param.service";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { type FieldType, type FieldEditorProps } from "./inspector.types";
import { FieldPropertyEditorHeader } from "./FieldPropertyEditorHeader";
import { FieldDataTypeSelector } from "./FieldDataTypeSelector";
import { FieldValueSourceConfig } from "./FieldValueSourceConfig";
import { FieldPropertyEditorFooter } from "./FieldPropertyEditorFooter";

/**
 * Dedicated inspector and property editor for configuring a single field.
 * Allows modifying field name, data type, mock provider, URL parameter binding, or static value.
 */
export const FieldPropertyEditor = ({
  field,
  allFields,
  route,
  endpoints,
  onRouteUpdated,
  onBack,
}: FieldEditorProps): React.JSX.Element => {
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState(field.name);
  const [type, setType] = React.useState<FieldType>(field.type as FieldType);
  const [fakerProvider, setFakerProvider] = React.useState(
    field.fakerProvider ?? "",
  );
  const [nullable, setNullable] = React.useState(field.nullable);

  const parentEndpoint = endpoints?.find((ep) => ep.id === route.endpointId);
  const effectivePath = getEffectiveRoutePath(
    parentEndpoint?.basePath ?? "",
    route.path,
  );
  const availableParams = React.useMemo(
    () => extractRoutePathParameters(effectivePath),
    [effectivePath],
  );

  const [sourceType, setSourceType] = React.useState<
    "faker" | "pathParam" | "static"
  >(
    field.source?.type === "pathParam"
      ? "pathParam"
      : field.source?.type === "static"
        ? "static"
        : "faker",
  );
  const [selectedParamName, setSelectedParamName] = React.useState<string>(
    field.source?.type === "pathParam"
      ? field.source.name
      : availableParams[0]?.name || "",
  );
  const [staticValue, setStaticValue] = React.useState<string>(
    field.source?.type === "static" ? field.source.value : "",
  );

  const handleSave = React.useCallback(async (): Promise<void> => {
    if (!name.trim()) {
      toast.error("Field name cannot be empty");
      return;
    }
    setLoading(true);
    try {
      const updatedFields = allFields.map((f) =>
        f.id === field.id
          ? {
              ...f,
              name: name.trim(),
              type: type as SchemaField["type"],
              source:
                sourceType === "pathParam" && selectedParamName
                  ? {
                      type: "pathParam" as const,
                      name: selectedParamName,
                    }
                  : sourceType === "static"
                    ? {
                        type: "static" as const,
                        value: staticValue,
                      }
                    : undefined,
              fakerProvider:
                sourceType === "faker" ? fakerProvider || undefined : undefined,
              nullable,
            }
          : f,
      );
      const updated = await updateRoute({
        id: route.id,
        responseSchema: JSON.stringify(synthesizeSchema(updatedFields)),
      });
      onRouteUpdated(updated);
      toast.success("Field updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save field");
    } finally {
      setLoading(false);
    }
  }, [
    name,
    allFields,
    field.id,
    type,
    sourceType,
    selectedParamName,
    staticValue,
    fakerProvider,
    nullable,
    route.id,
    onRouteUpdated,
  ]);

  const handleRemove = async (): Promise<void> => {
    setLoading(true);
    try {
      const updated = await removeFieldFromRoute(route.id, field.id);
      onRouteUpdated(updated);
      onBack();
      toast.success(`Field "${field.name}" removed`);
    } catch {
      toast.error("Failed to remove field");
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcuts: Cmd+S / Ctrl+S to save, Esc to go back
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      } else if (e.key === "Escape") {
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSave, onBack]);

  return (
    <div className="flex h-full flex-col">
      <FieldPropertyEditorHeader
        method={route.method}
        path={route.path}
        onBack={onBack}
      />

      <div className="scrollbar-subtle min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Field Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="field-name"
            className="text-muted-foreground block text-xs font-bold tracking-wider uppercase"
          >
            Field Name
          </label>
          <Input
            id="field-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="fieldName"
            variant="mono"
            className="h-8 font-mono text-xs"
            disabled={loading}
          />
        </div>

        {/* Data Type Selector */}
        <FieldDataTypeSelector
          type={type}
          onChangeType={setType}
          disabled={loading}
        />

        {/* Value Source Configuration */}
        <FieldValueSourceConfig
          sourceType={sourceType}
          setSourceType={setSourceType}
          selectedParamName={selectedParamName}
          setSelectedParamName={setSelectedParamName}
          availableParams={availableParams}
          staticValue={staticValue}
          setStaticValue={setStaticValue}
          fakerProvider={fakerProvider}
          setFakerProvider={setFakerProvider}
          fieldType={type}
          loading={loading}
        />

        {/* Nullable Toggle */}
        <div className="flex items-center justify-between pt-1">
          <label
            htmlFor="field-nullable"
            className="text-foreground cursor-pointer text-xs font-medium"
          >
            Nullable
          </label>
          <Switch
            id="field-nullable"
            checked={nullable}
            onCheckedChange={setNullable}
            disabled={loading}
            aria-label="Allow null values"
          />
        </div>
      </div>

      <FieldPropertyEditorFooter
        fieldName={field.name}
        loading={loading}
        canSave={Boolean(name.trim())}
        onRemove={handleRemove}
        onSave={handleSave}
      />
    </div>
  );
};

export default FieldPropertyEditor;
