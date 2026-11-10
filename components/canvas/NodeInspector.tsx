"use client";

import * as React from "react";
import * as PikaCore from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { toast } from "sonner";
import {
  RiSettings2Line,
  RiFileCodeLine,
  RiPulseLine,
  RiPlayLine,
  RiArrowDownSLine,
  RiCodeLine,
  RiFileCopyLine,
  RiCheckLine,
  RiShuffleLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import { useCanvasDndStore } from "@/stores/canvas-dnd-store-provider";
import { type InspectorTab } from "@/stores/canvas-dnd-store";
import { SchemaStoreProvider, useSchemaStore } from "@/stores/store-provider";
import { FakerProviderSelect } from "@/components/edit-bar/FakerProviderSelect";
import { getProviderByValue } from "@/lib/faker-registry";
import { updateRoute, deleteRoute } from "@/lib/actions/routes";
import {
  removeFieldFromRoute,
  clearFieldsFromRoute,
} from "@/lib/actions/canvas-dnd";
import {
  parseSchemaToFields,
  synthesizeSchema,
  extractRouteParamConfigs,
  type SchemaField,
  type RouteParamConfig,
} from "@/lib/schema-synthesizer";
import {
  generateRandomFapiValue,
  getDefaultProviderForParam,
} from "@/lib/services/fapi-random.service";
import {
  getEffectiveRoutePath,
  extractRoutePathParameters,
} from "@/lib/services/route-param.service";
import { FieldTree } from "@/components/edit-bar/FieldTree";
import { ChaosConfig } from "@/components/edit-bar/ChaosConfig";
import {
  HeadersEditor,
  type HeaderRow,
} from "@/components/edit-bar/HeadersEditor";
import { RulesEditor } from "@/components/edit-bar/RulesEditor";
import { TypeScriptPreview } from "@/components/edit-bar/TypeScriptPreview";
import type { ConditionalRule } from "@/lib/mock-engine";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Endpoint, Route } from "@/db/schema";

const FIELD_TYPES = [
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
] as const;

type FieldType = (typeof FIELD_TYPES)[number];

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

const METHOD_STYLES: Record<
  HttpMethod,
  { text: string; dot: string; highlight: string; border: string; bg: string }
> = {
  GET: {
    text: "text-method-get",
    dot: "bg-method-get",
    highlight: "data-highlighted:bg-method-get/10",
    border: "border-method-get/30",
    bg: "bg-method-get/10",
  },
  POST: {
    text: "text-method-post",
    dot: "bg-method-post",
    highlight: "data-highlighted:bg-method-post/10",
    border: "border-method-post/30",
    bg: "bg-method-post/10",
  },
  PUT: {
    text: "text-method-put",
    dot: "bg-method-put",
    highlight: "data-highlighted:bg-method-put/10",
    border: "border-method-put/30",
    bg: "bg-method-put/10",
  },
  DELETE: {
    text: "text-method-delete",
    dot: "bg-method-delete",
    highlight: "data-highlighted:bg-method-delete/10",
    border: "border-method-delete/30",
    bg: "bg-method-delete/10",
  },
  PATCH: {
    text: "text-method-patch",
    dot: "bg-method-patch",
    highlight: "data-highlighted:bg-method-patch/10",
    border: "border-method-patch/30",
    bg: "bg-method-patch/10",
  },
};

const COMMON_STATUS_CODES = [200, 201, 204, 400, 404, 500] as const;

/**
 * Resolves status code badge styling following semantic DESIGN.md tokens.
 */
const getStatusCodeBadgeStyles = (
  code: number,
  isSelected: boolean,
): string => {
  if (!isSelected) {
    return "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground";
  }
  if (code >= 200 && code < 300) {
    return "bg-success/15 text-success border-success/40 shadow-xs";
  }
  if (code >= 300 && code < 400) {
    return "bg-warning/15 text-warning border-warning/40 shadow-xs";
  }
  return "bg-destructive/15 text-destructive border-destructive/40 shadow-xs";
};

interface NodeInspectorProps {
  /** The currently selected route on canvas, if any. */
  route?: Route | null;
  /** The ID of the field currently inspected within that route, if any. */
  inspectedFieldId?: string | null;
  /** Total count of active routes on the canvas (used in idle state). */
  activeRoutesCount: number;
  /** Slug of the current project, used for constructing live mock endpoints. */
  projectSlug?: string;
  /** Available endpoint groups in this project. */
  endpoints?: Endpoint[];
  /** Called when a route or its fields change so parent state stays synced. */
  onRouteUpdated: (updatedRoute: Route) => void;
  /** Called when a route is deleted so canvas and selection clean up. */
  onRouteDeleted?: (routeId: string) => void;
  /** Called when the user closes the inspector (back/close). */
  onCloseInspector: () => void;
}

interface FieldEditorProps {
  field: SchemaField;
  allFields: SchemaField[];
  route: Route;
  endpoints?: Endpoint[];
  onRouteUpdated: (updatedRoute: Route) => void;
  onBack: () => void;
}

const FieldPropertyEditor = ({
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
            <span className="text-muted-foreground text-mini font-mono">
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
            className="text-muted-foreground text-mini block font-bold tracking-wider uppercase"
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
          <span className="text-muted-foreground text-mini block font-bold tracking-wider uppercase">
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
                  "h-7 min-w-10 rounded-md border px-2.5 font-mono text-caption font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
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
          <span className="text-muted-foreground text-mini block font-bold tracking-wider uppercase">
            Field Value Source
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              aria-pressed={sourceType === "pathParam"}
              onClick={() => setSourceType("pathParam")}
              disabled={loading}
              className={cn(
                "h-7 rounded-md border px-1 font-mono text-caption font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
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
                "h-7 rounded-md border px-1 font-mono text-caption font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
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
                "h-7 rounded-md border px-1 font-mono text-caption font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
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
              className="text-muted-foreground text-mini block font-bold tracking-wider uppercase"
            >
              Select Route Parameter
            </label>
            {availableParams.length === 0 ? (
              <div className="border-warning/20 bg-warning/10 text-warning text-mini rounded-md border p-2">
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
            <p className="text-muted-foreground text-mini leading-snug">
              Requests matching this route will return the dynamic URL value in
              this field.
            </p>
          </div>
        ) : sourceType === "static" ? (
          <div className="space-y-1.5">
            <label
              htmlFor="field-static-val"
              className="text-muted-foreground text-mini block font-bold tracking-wider uppercase"
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
            <p className="text-muted-foreground text-mini leading-snug">
              Returns a fixed, hard-coded scalar value on every response.
            </p>
          </div>
        ) : (
          /* Faker Provider */
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-mini block font-bold tracking-wider uppercase">
              Mock Data Provider
            </span>
            <FakerProviderSelect
              value={fakerProvider}
              onValueChange={setFakerProvider}
              disabled={loading || type === "object" || type === "array"}
            />
            {selectedProvider && (
              <p className="text-muted-foreground text-mini font-mono leading-snug">
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

interface RouteEditorProps {
  route: Route;
  endpoints?: Endpoint[];
  projectSlug?: string;
  onRouteUpdated: (updatedRoute: Route) => void;
  onRouteDeleted?: (routeId: string) => void;
  onSelectField: (fieldId: string) => void;
  onDeselect: () => void;
}

const normalizeTab = (t: string): InspectorTab => {
  if (t === "config" || t === "headers") return "route";
  if (t === "rules" || t === "chaos") return "behavior";
  if (t === "schema") return "schema";
  if (t === "try") return "try";
  return (t as InspectorTab) || "route";
};

const RouteEditor = ({
  route,
  endpoints,
  projectSlug,
  onRouteUpdated,
  onRouteDeleted,
  onDeselect,
}: RouteEditorProps): React.JSX.Element => {
  const [loading, setLoading] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [clearAllOpen, setClearAllOpen] = React.useState(false);
  const [tsOpen, setTsOpen] = React.useState(false);
  const [copiedJson, setCopiedJson] = React.useState(false);

  // Sync with unified canvas-dnd store for active tab with resilient local fallback
  const storeInspectorTab = useCanvasDndStore((s) => s.inspectorTab);
  const storeSetInspectorTab = useCanvasDndStore((s) => s.setInspectorTab);

  const [activeTab, setActiveTab] = React.useState<InspectorTab>(
    normalizeTab(storeInspectorTab || "route"),
  );
  const [prevStoreTab, setPrevStoreTab] = React.useState(storeInspectorTab);

  if (storeInspectorTab !== prevStoreTab) {
    setPrevStoreTab(storeInspectorTab);
    setActiveTab(normalizeTab(storeInspectorTab || "route"));
  }

  const handleTabChange = React.useCallback(
    (tab: InspectorTab) => {
      const normalized = normalizeTab(tab);
      setActiveTab(normalized);
      if (typeof storeSetInspectorTab === "function") {
        storeSetInspectorTab(normalized);
      }
    },
    [storeSetInspectorTab],
  );

  // Route fields from Zustand schema store
  const fields = useSchemaStore((state) => state.fields);
  const setSchema = useSchemaStore((state) => state.setSchema);
  const resetSchema = useSchemaStore((state) => state.resetSchema);

  // Route basic settings
  const [method, setMethod] = React.useState<HttpMethod>(
    (route.method.toUpperCase() as HttpMethod) || "GET",
  );
  const [path, setPath] = React.useState(route.path);
  const [statusCode, setStatusCode] = React.useState<number>(
    route.statusCode || 200,
  );
  const [isEnabled, setIsEnabled] = React.useState<boolean>(route.isEnabled);
  const [latencyMin, setLatencyMin] = React.useState<number>(
    route.latencyMin ?? 0,
  );
  const [latencyMax, setLatencyMax] = React.useState<number>(
    route.latencyMax ?? 0,
  );
  const [errorRate, setErrorRate] = React.useState<number>(
    route.errorRate ?? 0,
  );

  // Parse initial headers
  const [headers, setHeaders] = React.useState<HeaderRow[]>(() => {
    try {
      const parsed = JSON.parse(route.customHeaders ?? "{}");
      return Object.entries(parsed).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    } catch {
      return [];
    }
  });

  // Parse initial conditional rules
  const [rules, setRules] = React.useState<ConditionalRule[]>(() => {
    try {
      return JSON.parse(route.conditionalRules ?? "[]");
    } catch {
      return [];
    }
  });

  // Keep store fields synchronized when route updates externally
  React.useEffect(() => {
    try {
      const parsed = JSON.parse(route.responseSchema ?? "{}");
      const list = parseSchemaToFields(parsed);
      setSchema(list);
    } catch {
      setSchema([]);
    }
  }, [route.responseSchema, setSchema]);

  const parentEndpoint = endpoints?.find((ep) => ep.id === route.endpointId);
  const effectiveBasePath = parentEndpoint?.basePath ?? "";
  const effectivePath = getEffectiveRoutePath(effectiveBasePath, path);
  const detectedParams = React.useMemo(
    () => extractRoutePathParameters(effectivePath),
    [effectivePath],
  );

  // Parse saved parameter configurations
  const parsedSchemaObj = React.useMemo(() => {
    try {
      return JSON.parse(route.responseSchema ?? "{}");
    } catch {
      return {};
    }
  }, [route.responseSchema]);

  const savedParamConfigs = React.useMemo(() => {
    return extractRouteParamConfigs(parsedSchemaObj);
  }, [parsedSchemaObj]);

  const [paramConfigs, setParamConfigs] = React.useState<
    Record<string, RouteParamConfig>
  >(() => {
    const initial: Record<string, RouteParamConfig> = {};
    for (const p of detectedParams) {
      initial[p.name] = savedParamConfigs[p.name] ?? {
        mode: "static",
        staticValue: p.name === "id" ? "295" : `sample_${p.name}`,
        provider: getDefaultProviderForParam(p.name),
      };
    }
    return initial;
  });

  React.useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setParamConfigs((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const p of detectedParams) {
        if (!next[p.name]) {
          next[p.name] = savedParamConfigs[p.name] ?? {
            mode: "static",
            staticValue: p.name === "id" ? "295" : `sample_${p.name}`,
            provider: getDefaultProviderForParam(p.name),
          };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [detectedParams, savedParamConfigs]);

  const [testParamValues, setTestParamValues] = React.useState<
    Record<string, string>
  >(() => {
    const initial: Record<string, string> = {};
    for (const p of detectedParams) {
      const cfg = savedParamConfigs[p.name];
      if (cfg?.mode === "fapi") {
        initial[p.name] = generateRandomFapiValue(
          cfg.provider || getDefaultProviderForParam(p.name),
        );
      } else {
        initial[p.name] =
          cfg?.staticValue ?? (p.name === "id" ? "295" : `sample_${p.name}`);
      }
    }
    return initial;
  });

  // Check if current draft differs from saved route
  const isDirty = React.useMemo(() => {
    if (method !== ((route.method.toUpperCase() as HttpMethod) || "GET")) {
      return true;
    }
    if (path !== route.path) return true;
    if (statusCode !== (route.statusCode || 200)) return true;
    if (isEnabled !== route.isEnabled) return true;
    if (latencyMin !== (route.latencyMin ?? 0)) return true;
    if (latencyMax !== (route.latencyMax ?? 0)) return true;
    if (errorRate !== (route.errorRate ?? 0)) return true;
    if (JSON.stringify(paramConfigs) !== JSON.stringify(savedParamConfigs)) {
      return true;
    }
    return false;
  }, [
    method,
    path,
    statusCode,
    isEnabled,
    latencyMin,
    latencyMax,
    errorRate,
    paramConfigs,
    route,
    savedParamConfigs,
  ]);

  const handleToggleParamMode = (
    paramName: string,
    mode: "static" | "fapi",
  ): void => {
    setParamConfigs((prev) => {
      const existing = prev[paramName] ?? {
        mode: "static",
        staticValue: paramName === "id" ? "295" : `sample_${paramName}`,
        provider: getDefaultProviderForParam(paramName),
      };
      return {
        ...prev,
        [paramName]: {
          ...existing,
          mode,
        },
      };
    });

    if (mode === "fapi") {
      const provider =
        paramConfigs[paramName]?.provider ||
        getDefaultProviderForParam(paramName);
      const randomVal = generateRandomFapiValue(provider);
      setTestParamValues((prev) => ({
        ...prev,
        [paramName]: randomVal,
      }));
    } else {
      const staticVal =
        paramConfigs[paramName]?.staticValue ??
        (paramName === "id" ? "295" : `sample_${paramName}`);
      setTestParamValues((prev) => ({
        ...prev,
        [paramName]: staticVal,
      }));
    }
  };

  const handleParamStaticValueChange = (
    paramName: string,
    value: string,
  ): void => {
    setParamConfigs((prev) => ({
      ...prev,
      [paramName]: {
        ...(prev[paramName] ?? {
          mode: "static",
          provider: getDefaultProviderForParam(paramName),
        }),
        mode: "static",
        staticValue: value,
      },
    }));
    setTestParamValues((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleParamProviderChange = (
    paramName: string,
    provider: string,
  ): void => {
    setParamConfigs((prev) => ({
      ...prev,
      [paramName]: {
        ...(prev[paramName] ?? {
          mode: "fapi",
          staticValue: paramName === "id" ? "295" : `sample_${paramName}`,
        }),
        mode: "fapi",
        provider,
      },
    }));
    const freshVal = generateRandomFapiValue(provider);
    setTestParamValues((prev) => ({
      ...prev,
      [paramName]: freshVal,
    }));
  };

  const handleRerollParam = (paramName: string): void => {
    const provider =
      paramConfigs[paramName]?.provider ||
      getDefaultProviderForParam(paramName);
    const freshVal = generateRandomFapiValue(provider);
    setTestParamValues((prev) => ({
      ...prev,
      [paramName]: freshVal,
    }));
    toast.success(
      `Generated fresh random value for :${paramName}: "${freshVal}"`,
    );
  };

  const handleRerollAllFapi = (): void => {
    const nextVals: Record<string, string> = {};
    for (const p of detectedParams) {
      if (paramConfigs[p.name]?.mode === "fapi") {
        const provider =
          paramConfigs[p.name]?.provider || getDefaultProviderForParam(p.name);
        nextVals[p.name] = generateRandomFapiValue(provider);
      }
    }
    setTestParamValues((prev) => ({
      ...prev,
      ...nextVals,
    }));
    toast.success("Rerolled all FAPI parameter values");
  };

  const handleAddParamField = async (paramName: string): Promise<void> => {
    setLoading(true);
    try {
      const newField: SchemaField = {
        id: `field-${Date.now()}`,
        name: paramName,
        type: "string",
        nullable: false,
        source: { type: "pathParam", name: paramName },
      };
      const updatedFields = [...fields, newField];
      const updated = await updateRoute({
        id: route.id,
        responseSchema: JSON.stringify(
          synthesizeSchema(updatedFields, paramConfigs),
        ),
      });
      onRouteUpdated(updated);
      toast.success(`Field "${paramName}" added and bound to URL parameter!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add field");
    } finally {
      setLoading(false);
    }
  };

  // Live Try Request test runner state
  const [isTryingRequest, setIsTryingRequest] = React.useState(false);
  const [tryResponse, setTryResponse] = React.useState<{
    status: number;
    statusText: string;
    timeMs: number;
    body: string;
  } | null>(null);

  const constructedTryUrl = React.useMemo(() => {
    let resolvedSubpath = effectivePath;
    for (const p of detectedParams) {
      const entered = testParamValues[p.name]?.trim();
      const val = entered || `example_${p.name}`;
      resolvedSubpath = resolvedSubpath.replace(
        new RegExp(`:${p.name}\\b`, "g"),
        val,
      );
    }
    const slug = projectSlug || "demo";
    return `/api/mock/${slug}${resolvedSubpath.startsWith("/") ? resolvedSubpath : `/${resolvedSubpath}`}`;
  }, [effectivePath, detectedParams, testParamValues, projectSlug]);

  const handleSendTryRequest = async (): Promise<void> => {
    setIsTryingRequest(true);
    const start = Date.now();
    try {
      const updatedRuntimeValues = { ...testParamValues };
      for (const p of detectedParams) {
        if (paramConfigs[p.name]?.mode === "fapi") {
          const provider =
            paramConfigs[p.name]?.provider ||
            getDefaultProviderForParam(p.name);
          const freshVal = generateRandomFapiValue(provider);
          updatedRuntimeValues[p.name] = freshVal;
        }
      }
      setTestParamValues(updatedRuntimeValues);

      let resolvedSubpath = effectivePath;
      for (const p of detectedParams) {
        const entered = updatedRuntimeValues[p.name]?.trim();
        const val = entered || `example_${p.name}`;
        resolvedSubpath = resolvedSubpath.replace(
          new RegExp(`:${p.name}\\b`, "g"),
          val,
        );
      }
      const slug = projectSlug || "demo";
      const targetUrl = `/api/mock/${slug}${resolvedSubpath.startsWith("/") ? resolvedSubpath : `/${resolvedSubpath}`}`;

      const res = await fetch(targetUrl, {
        method,
      });
      const timeMs = Date.now() - start;
      const text = await res.text();
      let formatted = text;
      try {
        const json = JSON.parse(text);
        formatted = JSON.stringify(json, null, 2);
      } catch {
        // preserve raw text
      }
      setTryResponse({
        status: res.status,
        statusText: res.statusText || (res.status === 200 ? "OK" : "Status"),
        timeMs,
        body: formatted,
      });
    } catch (err) {
      setTryResponse({
        status: 0,
        statusText: "Network Error",
        timeMs: Date.now() - start,
        body: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsTryingRequest(false);
    }
  };

  const handleClearAllFields = async (): Promise<void> => {
    setLoading(true);
    try {
      const updated = await clearFieldsFromRoute(route.id);
      resetSchema();
      onRouteUpdated(updated);
      toast.success("All schema fields cleared");
    } catch {
      toast.error("Failed to clear fields");
    } finally {
      setLoading(false);
    }
  };

  const schemaPreview = React.useMemo(() => {
    return JSON.stringify(synthesizeSchema(fields, paramConfigs), null, 2);
  }, [fields, paramConfigs]);

  const handleCopySchema = React.useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(schemaPreview);
      setCopiedJson(true);
      toast.success("JSON Schema copied to clipboard");
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      toast.error("Failed to copy schema");
    }
  }, [schemaPreview]);

  const handleDeleteRoute = async (): Promise<void> => {
    setIsDeleting(true);
    try {
      await deleteRoute(route.id);
      onRouteDeleted?.(route.id);
      window.dispatchEvent(
        new CustomEvent("canvas-route-deleted", {
          detail: { routeId: route.id },
        }),
      );
      toast.success("Route deleted");
    } catch {
      toast.error("Failed to delete route");
      setIsDeleting(false);
    }
  };

  const handleSaveRoute = React.useCallback(async (): Promise<void> => {
    if (!path.trim()) {
      toast.error("Path cannot be empty");
      return;
    }
    setLoading(true);
    try {
      const headerObj: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key.trim()) {
          headerObj[h.key.trim()] = h.value;
        }
      });

      const updated = await updateRoute({
        id: route.id,
        method,
        path: path.trim(),
        statusCode,
        isEnabled,
        latencyMin,
        latencyMax,
        errorRate,
        responseSchema: JSON.stringify(synthesizeSchema(fields, paramConfigs)),
        customHeaders: JSON.stringify(headerObj),
        conditionalRules: JSON.stringify(rules),
      });
      onRouteUpdated(updated);
      toast.success("Route details saved successfully!");
    } catch {
      toast.error("Failed to update route");
    } finally {
      setLoading(false);
    }
  }, [
    path,
    route.id,
    method,
    statusCode,
    isEnabled,
    latencyMin,
    latencyMax,
    errorRate,
    fields,
    paramConfigs,
    headers,
    rules,
    onRouteUpdated,
  ]);

  // Keyboard shortcuts & Window Events from Top Navigation Bar Menu
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSaveRoute();
      } else if (e.key === "Escape") {
        onDeselect();
      }
    };

    const handleOpenTypes = (): void => setTsOpen(true);
    const handleCopySchemaEvent = (): void => {
      void handleCopySchema();
    };
    const handleToggleEnabledEvent = (): void => {
      setIsEnabled((prev) => !prev);
    };
    const handleSaveRouteEvent = (): void => {
      void handleSaveRoute();
    };
    const handleDeleteRouteEvent = (): void => {
      setConfirmDelete(true);
    };
    const handleSetTabEvent = (e: Event): void => {
      const customEvent = e as CustomEvent<{ tab: InspectorTab }>;
      if (customEvent.detail?.tab) {
        handleTabChange(customEvent.detail.tab);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("route-generate-types", handleOpenTypes);
    window.addEventListener("route-copy-schema", handleCopySchemaEvent);
    window.addEventListener("route-toggle-enabled", handleToggleEnabledEvent);
    window.addEventListener("route-save", handleSaveRouteEvent);
    window.addEventListener("route-delete", handleDeleteRouteEvent);
    window.addEventListener(
      "inspector-set-tab",
      handleSetTabEvent as EventListener,
    );

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("route-generate-types", handleOpenTypes);
      window.removeEventListener("route-copy-schema", handleCopySchemaEvent);
      window.removeEventListener(
        "route-toggle-enabled",
        handleToggleEnabledEvent,
      );
      window.removeEventListener("route-save", handleSaveRouteEvent);
      window.removeEventListener("route-delete", handleDeleteRouteEvent);
      window.removeEventListener(
        "inspector-set-tab",
        handleSetTabEvent as EventListener,
      );
    };
  }, [handleCopySchema, handleSaveRoute, handleTabChange, onDeselect]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header: Section Dropdown Component for Method + Enabled Toggle + Path Input */}
      <div className="border-border/60 bg-muted/10 flex shrink-0 flex-col gap-2.5 border-b p-3 shadow-2xs">
        {/* Row 1: Method Dropdown + Enabled Switch + Unsaved Badge + Close */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {/* Section Dropdown Component for HTTP Method */}
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={loading}
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-28 justify-between gap-1.5 px-2 font-mono text-xs font-bold tracking-wider",
                      METHOD_STYLES[method]?.border,
                      METHOD_STYLES[method]?.bg,
                    )}
                    aria-label={`Select HTTP method. Current: ${method}`}
                  />
                }
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      METHOD_STYLES[method]?.dot,
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "font-mono font-bold tracking-wider text-xs",
                      METHOD_STYLES[method]?.text,
                    )}
                  >
                    {method}
                  </span>
                </span>
                <RiArrowDownSLine
                  className="text-muted-foreground size-3.5 shrink-0"
                  aria-hidden="true"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-32">
                <DropdownMenuRadioGroup
                  value={method}
                  onValueChange={(val) => setMethod(val as HttpMethod)}
                >
                  {HTTP_METHODS.map((m) => (
                    <DropdownMenuRadioItem
                      key={m}
                      value={m}
                      className={cn(
                        "gap-2 font-mono font-bold tracking-wider text-xs cursor-pointer",
                        METHOD_STYLES[m]?.text,
                        METHOD_STYLES[m]?.highlight,
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          METHOD_STYLES[m]?.dot,
                        )}
                        aria-hidden="true"
                      />
                      {m}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Route Active/Disabled Switch */}
            <div className="border-border/50 flex items-center gap-1.5 border-l pl-2">
              <Switch
                id="route-enabled"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                disabled={loading}
                aria-label="Toggle Route Active"
              />
              <label
                htmlFor="route-enabled"
                className="text-muted-foreground text-micro cursor-pointer font-bold tracking-wider uppercase"
              >
                {isEnabled ? "Active" : "Disabled"}
              </label>
            </div>

            {isDirty && (
              <span
                className="bg-warning/15 text-warning border-warning/30 text-mini rounded border px-1.5 py-0.5 font-medium"
                title="Unsaved changes pending"
              >
                Unsaved
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onDeselect}
            className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring flex size-8 items-center justify-center rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
            title="Deselect route (Esc)"
            aria-label="Deselect route"
          >
            <PikaIcon
              icon={PikaCore.MultipleCrossCancelIcon}
              size={16}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Row 2: Route Path Input */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="route-path"
              className="text-muted-foreground text-mini block font-bold tracking-wider uppercase"
            >
              Route Path
            </label>
            <span className="text-muted-foreground text-micro truncate font-mono">
              {effectivePath}
            </span>
          </div>
          <Input
            id="route-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onBlur={() => {
              const trimmed = path.trim();
              if (trimmed && !trimmed.startsWith("/")) {
                setPath(`/${trimmed}`);
              }
            }}
            placeholder="/api/v1/resource"
            variant="mono"
            className="h-8 font-mono text-xs"
            disabled={loading}
          />
        </div>
      </div>

      {/* Categorized Tabs: Route, Schema, Behavior, Try */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => handleTabChange(val as InspectorTab)}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        <TabsList className="bg-muted/30 border-border/60 grid shrink-0 grid-cols-4 border-b p-1">
          <TabsTrigger
            value="route"
            size="compact"
            className="text-caption gap-1 px-1.5 py-1 font-medium transition-all"
            title="Route, Status & Headers (⌥1)"
          >
            <RiSettings2Line className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Route</span>
            {headers.length > 0 && (
              <span className="bg-info/15 text-info text-micro rounded px-1 font-mono font-bold">
                {headers.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="schema"
            size="compact"
            className="text-caption gap-1 px-1.5 py-1 font-medium transition-all"
            title="Response Schema & Types (⌥2)"
          >
            <RiFileCodeLine className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Schema</span>
            <span className="bg-muted-foreground/15 text-muted-foreground text-micro rounded px-1 font-mono">
              {fields.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="behavior"
            size="compact"
            className="text-caption gap-1 px-1.5 py-1 font-medium transition-all"
            title="Chaos Simulation & Rules (⌥3)"
          >
            <RiPulseLine className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Behavior</span>
            {latencyMin > 0 || latencyMax > 0 || errorRate > 0 ? (
              <span className="bg-warning/15 text-warning text-micro rounded px-1 font-mono font-bold">
                ON
              </span>
            ) : rules.length > 0 ? (
              <span className="bg-primary/15 text-primary text-micro rounded px-1 font-mono font-bold">
                {rules.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value="try"
            size="compact"
            className="text-caption gap-1 px-1.5 py-1 font-medium transition-all"
            title="Try Live Request (⌥4)"
          >
            <RiPlayLine className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Try</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Route (Status Code, Route URL Parameters, Headers, Runtime Behavior Summary) */}
        <TabsContent
          value="route"
          className="scrollbar-subtle m-0 min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
        >
          {/* Status Code with Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-mini block font-bold tracking-wider uppercase">
                Status Code
              </span>
              <span
                className={cn(
                  "text-mini font-mono font-semibold",
                  statusCode >= 200 && statusCode < 300
                    ? "text-success"
                    : statusCode >= 300 && statusCode < 400
                      ? "text-warning"
                      : "text-destructive",
                )}
              >
                {statusCode}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {COMMON_STATUS_CODES.map((code) => {
                const isSelected = statusCode === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setStatusCode(code)}
                    aria-pressed={isSelected}
                    className={cn(
                      "rounded-md border px-2 py-1 font-mono text-caption font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      getStatusCodeBadgeStyles(code, isSelected),
                    )}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
            <div className="space-y-1 pt-0.5">
              <label
                htmlFor="route-custom-status"
                className="text-muted-foreground text-micro font-mono uppercase"
              >
                Custom Status Code
              </label>
              <Input
                id="route-custom-status"
                type="number"
                value={statusCode}
                onChange={(e) => setStatusCode(Number(e.target.value) || 200)}
                variant="mono"
                className="h-8 font-mono text-xs"
                disabled={loading}
                placeholder="200"
              />
            </div>
          </div>

          {/* Route Path Parameters Overview */}
          {detectedParams.length > 0 && (
            <div className="border-border/50 space-y-2 border-t pt-3">
              <span className="text-muted-foreground text-mini block font-bold tracking-wider uppercase">
                Route Parameters ({detectedParams.length})
              </span>
              <div className="space-y-1.5">
                {detectedParams.map((p) => {
                  const isMapped = fields.some(
                    (f) =>
                      (f.source?.type === "pathParam" &&
                        f.source.name === p.name) ||
                      f.name.toLowerCase() === p.name.toLowerCase(),
                  );
                  const cfg = paramConfigs[p.name];
                  const isFapi = cfg?.mode === "fapi";

                  return (
                    <div
                      key={p.name}
                      className="bg-card border-border/60 flex items-center justify-between rounded-md border p-2"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="text-foreground font-mono text-xs font-semibold">
                          :{p.name}
                        </span>
                        <span className="text-muted-foreground text-mini">
                          (param)
                        </span>
                        <span
                          className={cn(
                            "text-mini rounded border px-1 py-0.5 font-mono",
                            isFapi
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border/70 bg-muted/60 text-muted-foreground",
                          )}
                        >
                          {isFapi
                            ? `FAPI: ${cfg?.provider || "random"}`
                            : `Static: "${testParamValues[p.name] ?? cfg?.staticValue ?? ""}"`}
                        </span>
                      </div>
                      {!isMapped ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => void handleAddParamField(p.name)}
                          disabled={loading}
                          className="text-mini h-6 shrink-0 font-mono"
                        >
                          + Add field
                        </Button>
                      ) : (
                        <span className="text-success text-mini shrink-0 font-medium">
                          Field mapped
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Response Headers */}
          <div className="border-border/50 space-y-2 border-t pt-3">
            <span className="text-muted-foreground text-mini block font-bold tracking-wider uppercase">
              Response Headers {headers.length > 0 && `(${headers.length})`}
            </span>
            <HeadersEditor headers={headers} onHeadersChange={setHeaders} />
          </div>

          {/* Runtime Behavior Quick Summary */}
          <div className="border-border/60 bg-muted/20 flex items-center justify-between gap-2 rounded-md border border-t p-2.5 pt-3">
            <div className="space-y-0.5">
              <span className="text-micro text-muted-foreground block font-bold tracking-wider uppercase">
                Runtime Behavior
              </span>
              <span className="text-caption text-foreground font-mono">
                {latencyMin > 0 || latencyMax > 0
                  ? `Latency: ${latencyMin}${latencyMax > latencyMin ? `-${latencyMax}` : ""}ms`
                  : "Zero latency"}
                {" · "}
                {errorRate > 0 ? `Chaos: ${errorRate}% err` : "100% reliable"}
                {" · "}
                {rules.length > 0
                  ? `${rules.length} rule${rules.length > 1 ? "s" : ""}`
                  : "No rules"}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => handleTabChange("behavior")}
              className="text-mini h-6 font-mono"
            >
              Configure →
            </Button>
          </div>
        </TabsContent>

        {/* Tab 2: Schema (FieldTree + TS Generator + JSON Schema Copy) */}
        <TabsContent
          value="schema"
          className="scrollbar-subtle m-0 min-h-0 flex-1 overflow-y-auto px-4 py-3"
        >
          <div className="space-y-3">
            <div className="border-border/50 flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground text-mini font-bold tracking-wider uppercase">
                Schema Tools
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => void handleCopySchema()}
                  className="text-mini h-7 gap-1"
                >
                  {copiedJson ? (
                    <RiCheckLine className="text-success size-3.5" />
                  ) : (
                    <RiFileCopyLine className="size-3.5" />
                  )}
                  <span>{copiedJson ? "Copied" : "Copy JSON"}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setTsOpen(true)}
                  className="text-mini h-7 gap-1"
                >
                  <RiCodeLine className="size-3.5" />
                  <span>Types</span>
                </Button>
                {fields.length > 0 && (
                  <Popover open={clearAllOpen} onOpenChange={setClearAllOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          disabled={loading}
                          className="text-muted-foreground hover:text-destructive text-mini h-7"
                        >
                          Clear all
                        </Button>
                      }
                    />
                    <PopoverContent
                      align="end"
                      side="bottom"
                      className="w-56 p-3 shadow-md"
                    >
                      <div className="space-y-2">
                        <p className="text-foreground text-xs font-semibold">
                          Clear all fields?
                        </p>
                        <p className="text-muted-foreground text-mini leading-snug">
                          This will remove all {fields.length} schema fields
                          from this route.
                        </p>
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            onClick={() => setClearAllOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="destructive"
                            onClick={() => {
                              setClearAllOpen(false);
                              void handleClearAllFields();
                            }}
                          >
                            Clear all
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {/* Interactive Field Tree */}
            <FieldTree />
          </div>
        </TabsContent>

        {/* Tab 3: Behavior (Chaos Simulation + Smart Conditional Rules) */}
        <TabsContent
          value="behavior"
          className="scrollbar-subtle m-0 min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3"
        >
          {/* Section 1: Chaos Simulation */}
          <div className="space-y-2">
            <span className="text-muted-foreground text-mini block font-bold tracking-wider uppercase">
              Chaos Simulation & Latency
            </span>
            <ChaosConfig
              latencyMin={latencyMin}
              latencyMax={latencyMax}
              errorRate={errorRate}
              onLatencyMinChange={setLatencyMin}
              onLatencyMaxChange={setLatencyMax}
              onErrorRateChange={setErrorRate}
            />
          </div>

          {/* Section 2: Smart Conditional Rules */}
          <div className="border-border/50 space-y-2 border-t pt-3">
            <span className="text-muted-foreground text-mini block font-bold tracking-wider uppercase">
              Smart Conditional Rules
            </span>
            <RulesEditor rules={rules} onRulesChange={setRules} />
          </div>
        </TabsContent>

        {/* Tab 6: Try (Interactive Request Runner) */}
        <TabsContent
          value="try"
          className="scrollbar-subtle m-0 min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
        >
          {/* Active Route Header Banner */}
          <div className="bg-muted/40 border-border/60 flex items-center gap-2 rounded-md border p-2">
            <span
              className={cn(
                "rounded border px-2 py-0.5 font-mono text-caption font-bold uppercase",
                METHOD_STYLES[method]?.border,
                METHOD_STYLES[method]?.bg,
                METHOD_STYLES[method]?.text,
              )}
            >
              {method}
            </span>
            <span className="text-foreground truncate font-mono text-xs font-semibold">
              {effectivePath}
            </span>
          </div>

          {/* Parameter Values Controls */}
          {detectedParams.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-mini block font-bold tracking-wider uppercase">
                  Parameter Values
                </span>
                {detectedParams.some(
                  (p) => paramConfigs[p.name]?.mode === "fapi",
                ) && (
                  <button
                    type="button"
                    onClick={handleRerollAllFapi}
                    className="text-primary hover:text-primary/80 text-mini flex items-center gap-1 font-mono font-medium transition-colors"
                    title="Reroll all FAPI runtime random values"
                  >
                    <RiShuffleLine className="size-3" />
                    <span>Reroll FAPI</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {detectedParams.map((p) => {
                  const cfg = paramConfigs[p.name] ?? {
                    mode: "static",
                    staticValue: p.name === "id" ? "295" : `sample_${p.name}`,
                    provider: getDefaultProviderForParam(p.name),
                  };
                  const isFapi = cfg.mode === "fapi";

                  return (
                    <div
                      key={p.name}
                      className="bg-card border-border/70 space-y-2 rounded-md border p-2.5 shadow-2xs"
                    >
                      {/* Param Row Header: Name and Mode Switch */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="text-foreground font-mono text-xs font-semibold">
                            :{p.name}
                          </span>
                          <span className="text-muted-foreground text-micro">
                            (param)
                          </span>
                        </div>

                        {/* Mode Selector Toggle: Static vs FAPI */}
                        <div
                          aria-label={`Mode for parameter ${p.name}`}
                          className="bg-muted/80 flex items-center rounded-md p-0.5"
                        >
                          <button
                            type="button"
                            aria-pressed={!isFapi}
                            onClick={() =>
                              handleToggleParamMode(p.name, "static")
                            }
                            className={cn(
                              "rounded px-2 py-0.5 text-mini transition-all",
                              !isFapi
                                ? "bg-background text-foreground shadow-xs font-semibold"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            Static
                          </button>
                          <button
                            type="button"
                            aria-pressed={isFapi}
                            onClick={() =>
                              handleToggleParamMode(p.name, "fapi")
                            }
                            className={cn(
                              "rounded px-2 py-0.5 text-mini transition-all",
                              isFapi
                                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            FAPI Random
                          </button>
                        </div>
                      </div>

                      {/* Value Input Area */}
                      {!isFapi ? (
                        <div className="space-y-1">
                          <Input
                            value={testParamValues[p.name] ?? ""}
                            onChange={(e) =>
                              handleParamStaticValueChange(
                                p.name,
                                e.target.value,
                              )
                            }
                            placeholder={
                              p.name === "id" ? "295" : `sample_${p.name}`
                            }
                            variant="mono"
                            className="h-7 font-mono text-xs"
                            disabled={isTryingRequest}
                          />
                          <p className="text-muted-foreground text-micro font-mono">
                            Hard-coded constant parameter value
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="min-w-0 flex-1">
                              <FakerProviderSelect
                                value={cfg.provider}
                                onValueChange={(val) =>
                                  handleParamProviderChange(p.name, val)
                                }
                                disabled={isTryingRequest}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => handleRerollParam(p.name)}
                              disabled={isTryingRequest}
                              className="text-mini h-8 shrink-0 px-2"
                              title="Generate new random value now"
                            >
                              <RiShuffleLine className="size-3.5" />
                              <span className="sr-only">Reroll</span>
                            </Button>
                          </div>

                          <div className="bg-muted/40 border-border/50 text-mini flex items-center justify-between rounded border px-2 py-1 font-mono">
                            <span className="text-muted-foreground text-micro">
                              Runtime value:
                            </span>
                            <span className="text-primary truncate font-semibold">
                              {testParamValues[p.name] ||
                                "(generated at request)"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* URL Preview with Copy */}
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-mini block font-bold tracking-wider uppercase">
              Mock Request URL
            </span>
            <div className="bg-muted/40 border-border/60 text-muted-foreground text-mini flex items-center justify-between gap-2 rounded-md border p-2 font-mono break-all">
              <span className="truncate">{constructedTryUrl}</span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    window.location.origin + constructedTryUrl,
                  );
                  toast.success("URL copied to clipboard");
                }}
                className="text-mini h-6 shrink-0 gap-1 px-1.5"
                title="Copy full mock URL"
              >
                <PikaIcon
                  icon={PikaCore.CopyIcon}
                  size={12}
                  aria-hidden="true"
                />
                <span>Copy</span>
              </Button>
            </div>
          </div>

          {/* Send Button */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSendTryRequest}
            disabled={isTryingRequest}
            className="w-full text-xs"
          >
            {isTryingRequest ? (
              <>
                <PikaIcon
                  icon={PikaCore.RefreshIcon}
                  size={12}
                  className="mr-1 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Sending...
              </>
            ) : (
              "Send Test Request"
            )}
          </Button>

          {/* Response Console */}
          {tryResponse && (
            <div className="border-border/70 bg-card space-y-1.5 rounded-md border p-2.5">
              <div className="text-mini flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-caption font-bold",
                      tryResponse.status >= 200 && tryResponse.status < 300
                        ? "bg-success/15 text-success border-success/30"
                        : "bg-destructive/15 text-destructive border-destructive/30",
                    )}
                  >
                    {tryResponse.status} {tryResponse.statusText}
                  </span>
                  <span className="text-muted-foreground text-mini font-mono">
                    {tryResponse.timeMs}ms
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(tryResponse.body);
                    toast.success("Response body copied to clipboard");
                  }}
                  className="text-mini h-6 gap-1 px-1.5"
                  title="Copy response body"
                >
                  <PikaIcon
                    icon={PikaCore.CopyIcon}
                    size={12}
                    aria-hidden="true"
                  />
                  <span>Copy</span>
                </Button>
              </div>
              <pre
                aria-label="Response payload"
                className="bg-muted/60 text-foreground text-caption scrollbar-subtle max-h-48 overflow-auto rounded p-2.5 font-mono"
              >
                {tryResponse.body}
              </pre>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer with Delete and Save Route buttons */}
      <div className="border-border/60 bg-card flex shrink-0 items-center justify-between border-t px-4 py-3">
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="destructive"
              size="xs"
              onClick={() => void handleDeleteRoute()}
              disabled={isDeleting || loading}
            >
              {isDeleting ? (
                <PikaIcon
                  icon={PikaCore.RefreshIcon}
                  size={12}
                  className="mr-1 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                "Confirm Delete"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setConfirmDelete(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={loading}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
            aria-label="Delete this route"
          >
            <PikaIcon
              icon={PikaCore.DeleteDustbin01Icon}
              size={14}
              aria-hidden="true"
            />
            <span>Delete Route</span>
          </Button>
        )}

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={isDirty ? "default" : "secondary"}
            onClick={handleSaveRoute}
            disabled={loading || !path.trim()}
            className="text-xs"
            aria-label="Save route changes (Ctrl+S / Cmd+S)"
            title="Save route changes (Ctrl+S / Cmd+S)"
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
                icon={PikaCore.FloppyIcon}
                size={14}
                aria-hidden="true"
              />
            )}
            <span>Save Route</span>
          </Button>
        </div>
      </div>

      {/* TypeScript Preview Modal */}
      <TypeScriptPreview
        routeId={route.id}
        open={tsOpen}
        onOpenChange={setTsOpen}
      />
    </div>
  );
};

const IdleInspector = ({
  activeRoutesCount,
}: {
  activeRoutesCount: number;
}): React.JSX.Element => {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border/60 flex shrink-0 items-center border-b px-4 py-3">
        <h2 className="text-foreground text-xs font-semibold">
          Node Inspector
        </h2>
      </div>

      {/* Empty State Body */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="bg-muted/40 border-border/60 mb-3 flex size-12 items-center justify-center rounded-xl border">
          <PikaIcon
            icon={PikaCore.GitBranchIcon}
            size={24}
            className="text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <h3 className="text-foreground text-xs font-semibold">
          No Node Selected
        </h3>
        <p className="text-muted-foreground text-caption mt-1.5 max-w-56 leading-relaxed">
          Click a route&apos;s pencil button to inspect and edit its properties,
          or click a field badge to edit that field&apos;s type and mock
          provider.
        </p>

        <div className="bg-muted/30 border-border/50 mt-6 w-full rounded-lg border p-3 text-left">
          <div className="text-caption flex items-center justify-between">
            <span className="text-muted-foreground">Active Canvas Routes</span>
            <span className="text-foreground font-mono font-semibold">
              {activeRoutesCount}
            </span>
          </div>
          <div className="text-muted-foreground text-mini mt-2 flex items-center gap-1.5">
            <PikaIcon
              icon={PikaCore.SparkleAi01Icon}
              size={12}
              className="text-primary shrink-0"
              aria-hidden="true"
            />
            <span>Drag providers from the left sidebar onto any route.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Permanently visible Right Sidebar Node Inspector.
 *
 * Dedicated strictly to inspecting and editing node and field values on the canvas.
 * Unifies all route editing, schema fields, rules, chaos, headers, and live testing.
 */
export const NodeInspector = ({
  route,
  inspectedFieldId,
  activeRoutesCount,
  projectSlug,
  endpoints,
  onRouteUpdated,
  onRouteDeleted,
  onCloseInspector,
}: NodeInspectorProps): React.JSX.Element => {
  const setInspectedField = useCanvasDndStore((s) => s.setInspectedField);

  // Parse fields for route
  const activeResponseSchema = route?.responseSchema;
  const initialFields: SchemaField[] = React.useMemo(() => {
    if (!activeResponseSchema) return [];
    try {
      const parsed = JSON.parse(activeResponseSchema);
      return parseSchemaToFields(parsed);
    } catch {
      return [];
    }
  }, [activeResponseSchema]);

  // Find inspected field
  const inspectedField = React.useMemo(() => {
    if (!inspectedFieldId) return null;
    return initialFields.find((f) => f.id === inspectedFieldId) ?? null;
  }, [initialFields, inspectedFieldId]);

  if (route && inspectedField) {
    return (
      <FieldPropertyEditor
        key={inspectedField.id}
        field={inspectedField}
        allFields={initialFields}
        route={route}
        endpoints={endpoints}
        onRouteUpdated={onRouteUpdated}
        onBack={() => setInspectedField(null)}
      />
    );
  }

  if (route) {
    return (
      <SchemaStoreProvider key={route.id} initialFields={initialFields}>
        <RouteEditor
          key={route.id}
          route={route}
          endpoints={endpoints}
          projectSlug={projectSlug}
          onRouteUpdated={onRouteUpdated}
          onRouteDeleted={onRouteDeleted}
          onSelectField={(fieldId) => setInspectedField(fieldId)}
          onDeselect={onCloseInspector}
        />
      </SchemaStoreProvider>
    );
  }

  return <IdleInspector activeRoutesCount={activeRoutesCount} />;
};

export default NodeInspector;
