"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  RiSettings2Line,
  RiFileCodeLine,
  RiPulseLine,
  RiPlayLine,
} from "@remixicon/react";
import { useCanvasDndStore } from "@/stores/canvas-dnd-store-provider";
import { useSchemaStore } from "@/stores/store-provider";
import { updateRoute, deleteRoute } from "@/lib/actions/routes";
import { clearFieldsFromRoute } from "@/lib/actions/canvas-dnd";
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
  detectParameterRenames,
  remapFieldsParameters,
  syncRoutePathFields,
  insertFieldInCanonicalOrder,
  sortFieldsCanonically,
} from "@/lib/services/route-param.service";
import type { HeaderRow } from "@/components/edit-bar/HeadersEditor";
import { TypeScriptPreview } from "@/components/edit-bar/TypeScriptPreview";
import type { ConditionalRule } from "@/lib/mock-engine";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type HttpMethod,
  type InspectorTab,
  type RouteEditorProps,
  type TryResponse,
  normalizeTab,
} from "./inspector.types";
import { RouteInspectorHeader } from "./RouteInspectorHeader";
import { InspectorRouteTab } from "./InspectorRouteTab";
import { InspectorSchemaTab } from "./InspectorSchemaTab";
import { InspectorBehaviorTab } from "./InspectorBehaviorTab";
import { InspectorTryTab } from "./InspectorTryTab";
import { RouteInspectorFooter } from "./RouteInspectorFooter";

export const RouteEditor = ({
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
    (tab: InspectorTab): void => {
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
  const [lastKnownEffectivePath, setLastKnownEffectivePath] = React.useState(
    getEffectiveRoutePath(effectiveBasePath, route.path),
  );
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

  const synchronizeParameterRenames = React.useCallback(
    (targetEffectivePath: string): void => {
      if (targetEffectivePath === lastKnownEffectivePath) return;

      const renames = detectParameterRenames(
        lastKnownEffectivePath,
        targetEffectivePath,
      );

      if (Object.keys(renames).length === 0) {
        setLastKnownEffectivePath(targetEffectivePath);
        return;
      }

      // 1. Remap fields in Zustand schema store
      const updatedFields = remapFieldsParameters(fields, renames);
      setSchema(updatedFields);

      // 2. Migrate paramConfigs
      setParamConfigs((prev) => {
        const next = { ...prev };
        for (const [oldP, newP] of Object.entries(renames)) {
          if (next[oldP]) {
            next[newP] = next[oldP];
            delete next[oldP];
          }
        }
        return next;
      });

      // 3. Migrate testParamValues
      setTestParamValues((prev) => {
        const next = { ...prev };
        for (const [oldP, newP] of Object.entries(renames)) {
          if (next[oldP] !== undefined) {
            next[newP] = next[oldP];
            delete next[oldP];
          }
        }
        return next;
      });

      setLastKnownEffectivePath(targetEffectivePath);

      const descriptions = Object.entries(renames)
        .map(([oldP, newP]) => `:${oldP} → :${newP}`)
        .join(", ");
      toast.info(`Updated parameter ${descriptions} in route fields`);
    },
    [
      lastKnownEffectivePath,
      fields,
      setSchema,
      setParamConfigs,
      setTestParamValues,
    ],
  );

  // Automatically synchronize fields when path parameters change (renaming or introducing new parameters)
  React.useEffect(() => {
    const declaredNames = detectedParams.map((p) => p.name);
    if (declaredNames.length === 0) return;

    // Check if any field has an orphaned pathParam source
    const hasOrphaned = fields.some(
      (f) =>
        f.source?.type === "pathParam" &&
        !declaredNames.includes(f.source.name),
    );

    const mappedNames = new Set(
      fields
        .filter(
          (f) =>
            f.source?.type === "pathParam" && typeof f.source.name === "string",
        )
        .map((f) => (f.source?.type === "pathParam" ? f.source.name : f.name)),
    );
    const hasUnmapped = declaredNames.some((p) => !mappedNames.has(p));

    if (hasOrphaned || hasUnmapped) {
      const {
        fields: updatedFields,
        renames,
        addedParams,
      } = syncRoutePathFields(fields, declaredNames);

      if (Object.keys(renames).length > 0 || addedParams.length > 0) {
        setSchema(updatedFields);

        // eslint-disable-next-line react/set-state-in-effect
        setParamConfigs((prev) => {
          const next = { ...prev };
          for (const [oldP, newP] of Object.entries(renames)) {
            if (next[oldP]) {
              next[newP] = next[oldP];
              delete next[oldP];
            }
          }
          for (const newP of addedParams) {
            if (!next[newP]) {
              next[newP] = {
                mode: "static",
                staticValue: newP === "id" ? "295" : `sample_${newP}`,
                provider: getDefaultProviderForParam(newP),
              };
            }
          }
          return next;
        });

        // eslint-disable-next-line react/set-state-in-effect
        setTestParamValues((prev) => {
          const next = { ...prev };
          for (const [oldP, newP] of Object.entries(renames)) {
            if (next[oldP] !== undefined) {
              next[newP] = next[oldP];
              delete next[oldP];
            }
          }
          for (const newP of addedParams) {
            if (next[newP] === undefined) {
              next[newP] = newP === "id" ? "295" : `sample_${newP}`;
            }
          }
          return next;
        });

        if (Object.keys(renames).length > 0) {
          const descriptions = Object.entries(renames)
            .map(([oldP, newP]) => `:${oldP} → :${newP}`)
            .join(", ");
          toast.info(`Updated existing field for parameter ${descriptions}`);
        }

        if (addedParams.length > 0) {
          const descriptions = addedParams.map((p) => `:${p}`).join(", ");
          toast.success(
            `Automatically added field for parameter ${descriptions}`,
          );
        }
      }
    }
  }, [detectedParams, fields, setSchema]);

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
      const declaredNames = detectedParams.map((p) => p.name);
      // Check if there is an existing orphaned pathParam field to reuse
      const orphanedIndex = fields.findIndex(
        (f) =>
          f.source?.type === "pathParam" &&
          !declaredNames.includes(f.source.name),
      );

      let updatedFields: SchemaField[];
      if (orphanedIndex !== -1) {
        // Update the existing field in-place instead of adding a new one
        updatedFields = fields.map((f, idx) =>
          idx === orphanedIndex
            ? {
                ...f,
                name: paramName,
                source: { type: "pathParam", name: paramName },
              }
            : f,
        );
        updatedFields = sortFieldsCanonically(updatedFields);
      } else {
        const newField: SchemaField = {
          id: `field-${Date.now()}`,
          name: paramName,
          type: "string",
          nullable: false,
          source: { type: "pathParam", name: paramName },
        };
        updatedFields = insertFieldInCanonicalOrder(fields, newField);
        updatedFields = sortFieldsCanonically(updatedFields);
      }

      setSchema(updatedFields);
      const updated = await updateRoute({
        id: route.id,
        responseSchema: JSON.stringify(
          synthesizeSchema(updatedFields, paramConfigs),
        ),
      });
      onRouteUpdated(updated);
      toast.success(
        orphanedIndex !== -1
          ? `Updated existing field to "${paramName}" and bound to URL parameter!`
          : `Field "${paramName}" added and bound to URL parameter!`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update field",
      );
    } finally {
      setLoading(false);
    }
  };

  // Live Try Request test runner state
  const [isTryingRequest, setIsTryingRequest] = React.useState(false);
  const [tryResponse, setTryResponse] = React.useState<TryResponse | null>(
    null,
  );

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
      const currentEffectivePath = getEffectiveRoutePath(
        effectiveBasePath,
        path.trim(),
      );
      const renames = detectParameterRenames(
        lastKnownEffectivePath,
        currentEffectivePath,
      );

      let currentFields = fields;
      let currentParamConfigs = paramConfigs;

      if (Object.keys(renames).length > 0) {
        currentFields = remapFieldsParameters(fields, renames);
        setSchema(currentFields);

        const nextConfigs = { ...paramConfigs };
        for (const [oldP, newP] of Object.entries(renames)) {
          if (nextConfigs[oldP]) {
            nextConfigs[newP] = nextConfigs[oldP];
            delete nextConfigs[oldP];
          }
        }
        currentParamConfigs = nextConfigs;
        setParamConfigs(nextConfigs);
        setLastKnownEffectivePath(currentEffectivePath);
      }

      // Reconcile and synchronize all declared route parameters into fields
      const currentDeclared = extractRoutePathParameters(
        currentEffectivePath,
      ).map((p) => p.name);
      const synced = syncRoutePathFields(currentFields, currentDeclared);
      if (
        Object.keys(synced.renames).length > 0 ||
        synced.addedParams.length > 0
      ) {
        currentFields = synced.fields;
        setSchema(currentFields);

        const nextConfigs = { ...currentParamConfigs };
        for (const [oldP, newP] of Object.entries(synced.renames)) {
          if (nextConfigs[oldP]) {
            nextConfigs[newP] = nextConfigs[oldP];
            delete nextConfigs[oldP];
          }
        }
        for (const newP of synced.addedParams) {
          if (!nextConfigs[newP]) {
            nextConfigs[newP] = {
              mode: "static",
              staticValue: newP === "id" ? "295" : `sample_${newP}`,
              provider: getDefaultProviderForParam(newP),
            };
          }
        }
        currentParamConfigs = nextConfigs;
        setParamConfigs(nextConfigs);
      }

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
        responseSchema: JSON.stringify(
          synthesizeSchema(currentFields, currentParamConfigs),
        ),
        customHeaders: JSON.stringify(headerObj),
        conditionalRules: JSON.stringify(rules),
      });
      onRouteUpdated(updated);
      toast.success("Route details saved successfully!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update route",
      );
    } finally {
      setLoading(false);
    }
  }, [
    path,
    effectiveBasePath,
    lastKnownEffectivePath,
    fields,
    paramConfigs,
    setParamConfigs,
    setSchema,
    headers,
    route.id,
    method,
    statusCode,
    isEnabled,
    latencyMin,
    latencyMax,
    errorRate,
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
      {/* Header: Method Dropdown, Enabled Toggle, Dirty State, Path */}
      <RouteInspectorHeader
        method={method}
        setMethod={setMethod}
        isEnabled={isEnabled}
        setIsEnabled={setIsEnabled}
        isDirty={isDirty}
        loading={loading}
        path={path}
        setPath={setPath}
        effectiveBasePath={effectiveBasePath}
        effectivePath={effectivePath}
        onSynchronizeParameters={synchronizeParameterRenames}
        onDeselect={onDeselect}
      />

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
            className="gap-1 px-1.5 py-1 text-xs font-medium transition-all"
            title="Route, Status & Headers (⌥1)"
          >
            <RiSettings2Line className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Route</span>
            {headers.length > 0 && (
              <span className="bg-info/15 text-info py-0.2 rounded px-1.5 font-mono text-xs font-bold">
                {headers.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="schema"
            size="compact"
            className="gap-1 px-1.5 py-1 text-xs font-medium transition-all"
            title="Response Schema & Types (⌥2)"
          >
            <RiFileCodeLine className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Schema</span>
            <span className="bg-muted-foreground/15 text-muted-foreground py-0.2 rounded px-1.5 font-mono text-xs">
              {fields.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="behavior"
            size="compact"
            className="gap-1 px-1.5 py-1 text-xs font-medium transition-all"
            title="Chaos Simulation & Rules (⌥3)"
          >
            <RiPulseLine className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Behavior</span>
            {latencyMin > 0 || latencyMax > 0 || errorRate > 0 ? (
              <span className="bg-warning/15 text-warning py-0.2 rounded px-1.5 font-mono text-xs font-bold">
                ON
              </span>
            ) : rules.length > 0 ? (
              <span className="bg-primary/15 text-primary py-0.2 rounded px-1.5 font-mono text-xs font-bold">
                {rules.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value="try"
            size="compact"
            className="gap-1 px-1.5 py-1 text-xs font-medium transition-all"
            title="Try Live Request (⌥4)"
          >
            <RiPlayLine className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Try</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Route */}
        <InspectorRouteTab
          statusCode={statusCode}
          setStatusCode={setStatusCode}
          loading={loading}
          detectedParams={detectedParams}
          fields={fields}
          paramConfigs={paramConfigs}
          testParamValues={testParamValues}
          onAddParamField={handleAddParamField}
          headers={headers}
          setHeaders={setHeaders}
          latencyMin={latencyMin}
          latencyMax={latencyMax}
          errorRate={errorRate}
          rules={rules}
          onSelectTab={handleTabChange}
        />

        {/* Tab 2: Schema */}
        <InspectorSchemaTab
          fields={fields}
          loading={loading}
          copiedJson={copiedJson}
          onCopySchema={handleCopySchema}
          onOpenTypes={() => setTsOpen(true)}
          onClearAllFields={handleClearAllFields}
        />

        {/* Tab 3: Behavior */}
        <InspectorBehaviorTab
          latencyMin={latencyMin}
          latencyMax={latencyMax}
          errorRate={errorRate}
          setLatencyMin={setLatencyMin}
          setLatencyMax={setLatencyMax}
          setErrorRate={setErrorRate}
          rules={rules}
          setRules={setRules}
        />

        {/* Tab 4: Try */}
        <InspectorTryTab
          method={method}
          effectivePath={effectivePath}
          detectedParams={detectedParams}
          paramConfigs={paramConfigs}
          testParamValues={testParamValues}
          constructedTryUrl={constructedTryUrl}
          isTryingRequest={isTryingRequest}
          tryResponse={tryResponse}
          onToggleParamMode={handleToggleParamMode}
          onParamStaticValueChange={handleParamStaticValueChange}
          onParamProviderChange={handleParamProviderChange}
          onRerollParam={handleRerollParam}
          onRerollAllFapi={handleRerollAllFapi}
          onSendTryRequest={handleSendTryRequest}
        />
      </Tabs>

      {/* Footer with Delete and Save Route buttons */}
      <RouteInspectorFooter
        confirmDelete={confirmDelete}
        setConfirmDelete={setConfirmDelete}
        isDeleting={isDeleting}
        onDeleteRoute={handleDeleteRoute}
        loading={loading}
        isDirty={isDirty}
        path={path}
        onSaveRoute={handleSaveRoute}
      />

      {/* TypeScript Preview Modal */}
      <TypeScriptPreview
        routeId={route.id}
        open={tsOpen}
        onOpenChange={setTsOpen}
      />
    </div>
  );
};
