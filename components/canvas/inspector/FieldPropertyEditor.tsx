"use client";

import * as React from "react";
import * as PikaCore from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateRoute } from "@/lib/actions/routes";
import { removeFieldFromRoute } from "@/lib/actions/canvas-dnd";
import { synthesizeSchema, type SchemaField } from "@/lib/schema-synthesizer";
import {
  getEffectiveRoutePath,
  extractRoutePathParameters,
} from "@/lib/services/route-param.service";
import { FakerProviderSelect } from "@/components/edit-bar/FakerProviderSelect";
import { getProviderByValue } from "@/lib/faker-registry";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FIELD_TYPES,
  type FieldType,
  type FieldEditorProps,
} from "./inspector.types";

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

  const selectedProvider = fakerProvider
    ? getProviderByValue(fakerProvider)
    : undefined;

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
      {/* Header */}
      <div className="border-border/60 flex shrink-0 items-center justify-between border-b px-3 py-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring flex size-8 items-center justify-center rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
            aria-label="Back to route inspection"
          >
            <PikaIcon
              icon={PikaCore.ChevronLeftIcon}
              size={16}
              aria-hidden="true"
            />
          </button>
          <div className="flex flex-col">
            <h2 className="text-foreground text-xs font-semibold">
              Field Property Editor
            </h2>
            <span className="text-muted-foreground font-mono text-xs">
              {route.method} {route.path}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
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

        {/* Data Type */}
        <div className="space-y-1.5">
          <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
            Data Type
          </span>
          <fieldset
            aria-label="Data type"
            className="m-0 flex flex-wrap gap-1 border-0 p-0"
          >
            {FIELD_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => setType(t)}
                disabled={loading}
                className={cn(
                  "h-7 min-w-10 rounded-md border px-2.5 font-mono text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  type === t
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </fieldset>
        </div>

        {/* Field Value Source */}
        <div className="space-y-1.5">
          <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
            Field Value Source
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              aria-pressed={sourceType === "pathParam"}
              onClick={() => setSourceType("pathParam")}
              disabled={loading}
              className={cn(
                "h-7 rounded-md border px-1 font-mono text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                sourceType === "pathParam"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              URL Param
            </button>
            <button
              type="button"
              aria-pressed={sourceType === "faker"}
              onClick={() => setSourceType("faker")}
              disabled={loading}
              className={cn(
                "h-7 rounded-md border px-1 font-mono text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                sourceType === "faker"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              FAPI Random
            </button>
            <button
              type="button"
              aria-pressed={sourceType === "static"}
              onClick={() => setSourceType("static")}
              disabled={loading}
              className={cn(
                "h-7 rounded-md border px-1 font-mono text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                sourceType === "static"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              Static Value
            </button>
          </div>
        </div>

        {sourceType === "pathParam" ? (
          <div className="space-y-1.5">
            <label
              htmlFor="field-param-name"
              className="text-muted-foreground block text-xs font-bold tracking-wider uppercase"
            >
              Select Route Parameter
            </label>
            {availableParams.length === 0 ? (
              <div className="border-warning/20 bg-warning/10 text-warning rounded-md border p-2 text-xs">
                No parameters found in route path. Add a segment like{" "}
                <span className="font-mono font-bold">/:id</span> to the route
                path.
              </div>
            ) : (
              <select
                id="field-param-name"
                value={selectedParamName}
                onChange={(e) => setSelectedParamName(e.target.value)}
                disabled={loading}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-3 py-1 font-mono text-xs focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
              >
                {availableParams.map((p) => (
                  <option key={p.name} value={p.name}>
                    :{p.name} (from URL)
                  </option>
                ))}
              </select>
            )}
            <p className="text-muted-foreground text-xs leading-snug">
              Requests matching this route will return the dynamic URL value in
              this field.
            </p>
          </div>
        ) : sourceType === "static" ? (
          <div className="space-y-1.5">
            <label
              htmlFor="field-static-val"
              className="text-muted-foreground block text-xs font-bold tracking-wider uppercase"
            >
              Static Value
            </label>
            <Input
              id="field-static-val"
              value={staticValue}
              onChange={(e) => setStaticValue(e.target.value)}
              placeholder='e.g. "active", 100, true'
              variant="mono"
              className="h-8 font-mono text-xs"
              disabled={loading}
            />
            <p className="text-muted-foreground text-xs leading-snug">
              Returns a fixed, hard-coded scalar value on every response.
            </p>
          </div>
        ) : (
          /* Faker Provider */
          <div className="space-y-1.5">
            <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
              Mock Data Provider
            </span>
            <FakerProviderSelect
              value={fakerProvider}
              onValueChange={setFakerProvider}
              disabled={loading || type === "object" || type === "array"}
            />
            {selectedProvider && (
              <p className="text-muted-foreground font-mono text-xs leading-snug">
                Example:{" "}
                <span className="text-foreground">
                  {selectedProvider.example}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Nullable */}
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

      {/* Footer */}
      <div className="border-border/60 flex shrink-0 items-center justify-between border-t px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={loading}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
          aria-label={`Remove field ${field.name}`}
        >
          {loading ? (
            <PikaIcon
              icon={PikaCore.RefreshIcon}
              size={14}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <PikaIcon
              icon={PikaCore.DeleteDustbin01Icon}
              size={14}
              aria-hidden="true"
            />
          )}
          <span>Remove</span>
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="text-xs"
          aria-label="Save field changes (Ctrl+S / Cmd+S)"
        >
          {loading ? (
            <PikaIcon
              icon={PikaCore.RefreshIcon}
              size={14}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <PikaIcon icon={PikaCore.FloppyIcon} size={14} aria-hidden="true" />
          )}
          <span>Save</span>
        </Button>
      </div>
    </div>
  );
};
