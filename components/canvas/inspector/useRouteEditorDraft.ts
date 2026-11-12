"use client";

import * as React from "react";
import { toast } from "sonner";
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
  getDefaultProviderForParam,
  getFapiFallbackValue,
  generateRandomFapiValueAsync,
} from "@/lib/services/fapi-preview.service";
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
import type { ConditionalRule } from "@/lib/mock-engine";
import {
  type HttpMethod,
  type InspectorTab,
  type RouteEditorProps,
  type TryResponse,
  normalizeTab,
} from "./inspector.types";

export interface UseRouteEditorDraftReturn {
  // Navigation & Modals
  activeTab: InspectorTab;
  handleTabChange: (tab: InspectorTab) => void;
  tsOpen: boolean;
  setTsOpen: (open: boolean) => void;
  copiedJson: boolean;
  confirmDelete: boolean;
  setConfirmDelete: (confirm: boolean) => void;
  isDeleting: boolean;
  loading: boolean;
  isDirty: boolean;

  // Route Basic Settings
  method: HttpMethod;
  setMethod: (method: HttpMethod) => void;
  path: string;
  setPath: (path: string) => void;
  statusCode: number;
  setStatusCode: (code: number) => void;
  isEnabled: boolean;
  setIsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  latencyMin: number;
  setLatencyMin: (val: number) => void;
  latencyMax: number;
  setLatencyMax: (val: number) => void;
  errorRate: number;
  setErrorRate: (val: number) => void;
  headers: HeaderRow[];
  setHeaders: React.Dispatch<React.SetStateAction<HeaderRow[]>>;
  rules: ConditionalRule[];
  setRules: React.Dispatch<React.SetStateAction<ConditionalRule[]>>;

  // Schema & Parameters
  fields: SchemaField[];
  effectiveBasePath: string;
  effectivePath: string;
  detectedParams: { name: string }[];
  paramConfigs: Record<string, RouteParamConfig>;
  testParamValues: Record<string, string>;
  synchronizeParameterRenames: (targetEffectivePath: string) => void;
  handleToggleParamMode: (paramName: string, mode: "static" | "fapi") => void;
  handleParamStaticValueChange: (paramName: string, value: string) => void;
  handleParamProviderChange: (paramName: string, provider: string) => void;
  handleRerollParam: (paramName: string) => void;
  handleRerollAllFapi: () => void;
  handleAddParamField: (paramName: string) => Promise<void>;

  // Try live test runner
  isTryingRequest: boolean;
  tryResponse: TryResponse | null;
  constructedTryUrl: string;
  handleSendTryRequest: () => Promise<void>;

  // Actions
  handleClearAllFields: () => Promise<void>;
  handleCopySchema: () => Promise<void>;
  handleDeleteRoute: () => Promise<void>;
  handleSaveRoute: () => Promise<void>;
}

/**
 * Custom hook encapsulating the route draft state, parameter synchronization,
 * interactive request runner, and mutation handlers for the Route Editor.
 */
export const useRouteEditorDraft = ({
  route,
  endpoints,
  projectSlug,
  onRouteUpdated,
  onRouteDeleted,
  onDeselect,
}: RouteEditorProps): UseRouteEditorDraftReturn => {
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
        initial[p.name] = getFapiFallbackValue(
          cfg.provider || getDefaultProviderForParam(p.name),
        );
      } else {
        initial[p.name] =
          cfg?.staticValue ?? (p.name === "id" ? "295" : `sample_${p.name}`);
      }
    }
    return initial;
  });

  const paramGenTokenRef = React.useRef<Record<string, number>>({});

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

      const updatedFields = remapFieldsParameters(fields, renames);
      setSchema(updatedFields);

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

  // Automatically synchronize fields when path parameters change
  React.useEffect(() => {
    const declaredNames = detectedParams.map((p) => p.name);
    if (declaredNames.length === 0) return;

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
      const token = (paramGenTokenRef.current[paramName] ?? 0) + 1;
      paramGenTokenRef.current[paramName] = token;
      setTestParamValues((prev) => ({
        ...prev,
        [paramName]: getFapiFallbackValue(provider),
      }));
      void generateRandomFapiValueAsync(provider).then((randomVal) => {
        if (paramGenTokenRef.current[paramName] === token) {
          setTestParamValues((prev) => ({
            ...prev,
            [paramName]: randomVal,
          }));
        }
      });
    } else {
      paramGenTokenRef.current[paramName] =
        (paramGenTokenRef.current[paramName] ?? 0) + 1;
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
    paramGenTokenRef.current[paramName] =
      (paramGenTokenRef.current[paramName] ?? 0) + 1;
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
    const token = (paramGenTokenRef.current[paramName] ?? 0) + 1;
    paramGenTokenRef.current[paramName] = token;
    setTestParamValues((prev) => ({
      ...prev,
      [paramName]: getFapiFallbackValue(provider),
    }));
    void generateRandomFapiValueAsync(provider).then((freshVal) => {
      if (paramGenTokenRef.current[paramName] === token) {
        setTestParamValues((prev) => ({
          ...prev,
          [paramName]: freshVal,
        }));
      }
    });
  };

  const handleRerollParam = (paramName: string): void => {
    const provider =
      paramConfigs[paramName]?.provider ||
      getDefaultProviderForParam(paramName);
    const token = (paramGenTokenRef.current[paramName] ?? 0) + 1;
    paramGenTokenRef.current[paramName] = token;
    void generateRandomFapiValueAsync(provider).then((freshVal) => {
      if (paramGenTokenRef.current[paramName] === token) {
        setTestParamValues((prev) => ({
          ...prev,
          [paramName]: freshVal,
        }));
        toast.success(
          `Generated fresh random value for :${paramName}: "${freshVal}"`,
        );
      }
    });
  };

  const handleRerollAllFapi = (): void => {
    const fapiParams = detectedParams.filter(
      (p) => paramConfigs[p.name]?.mode === "fapi",
    );
    if (fapiParams.length === 0) {
      toast.success("Rerolled all FAPI parameter values");
      return;
    }

    const requestTokens = new Map<string, number>();
    for (const p of fapiParams) {
      const token = (paramGenTokenRef.current[p.name] ?? 0) + 1;
      paramGenTokenRef.current[p.name] = token;
      requestTokens.set(p.name, token);
    }

    void Promise.all(
      fapiParams.map(async (p) => {
        const provider =
          paramConfigs[p.name]?.provider || getDefaultProviderForParam(p.name);
        return [p.name, await generateRandomFapiValueAsync(provider)] as const;
      }),
    ).then((entries) => {
      const nextVals: Record<string, string> = {};
      for (const [paramName, val] of entries) {
        if (
          paramGenTokenRef.current[paramName] === requestTokens.get(paramName)
        ) {
          nextVals[paramName] = val;
        }
      }
      setTestParamValues((prev) => ({
        ...prev,
        ...nextVals,
      }));
      toast.success("Rerolled all FAPI parameter values");
    });
  };

  const handleAddParamField = async (paramName: string): Promise<void> => {
    setLoading(true);
    try {
      const declaredNames = detectedParams.map((p) => p.name);
      const orphanedIndex = fields.findIndex(
        (f) =>
          f.source?.type === "pathParam" &&
          !declaredNames.includes(f.source.name),
      );

      let updatedFields: SchemaField[];
      if (orphanedIndex !== -1) {
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
      const fapiParams = detectedParams.filter(
        (p) => paramConfigs[p.name]?.mode === "fapi",
      );
      if (fapiParams.length > 0) {
        const generatedEntries = await Promise.all(
          fapiParams.map(async (p) => {
            const provider =
              paramConfigs[p.name]?.provider ||
              getDefaultProviderForParam(p.name);
            return [
              p.name,
              await generateRandomFapiValueAsync(provider),
            ] as const;
          }),
        );
        for (const [paramName, freshVal] of generatedEntries) {
          updatedRuntimeValues[paramName] = freshVal;
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

  return {
    activeTab,
    handleTabChange,
    tsOpen,
    setTsOpen,
    copiedJson,
    confirmDelete,
    setConfirmDelete,
    isDeleting,
    loading,
    isDirty,
    method,
    setMethod,
    path,
    setPath,
    statusCode,
    setStatusCode,
    isEnabled,
    setIsEnabled,
    latencyMin,
    setLatencyMin,
    latencyMax,
    setLatencyMax,
    errorRate,
    setErrorRate,
    headers,
    setHeaders,
    rules,
    setRules,
    fields,
    effectiveBasePath,
    effectivePath,
    detectedParams,
    paramConfigs,
    testParamValues,
    synchronizeParameterRenames,
    handleToggleParamMode,
    handleParamStaticValueChange,
    handleParamProviderChange,
    handleRerollParam,
    handleRerollAllFapi,
    handleAddParamField,
    isTryingRequest,
    tryResponse,
    constructedTryUrl,
    handleSendTryRequest,
    handleClearAllFields,
    handleCopySchema,
    handleDeleteRoute,
    handleSaveRoute,
  };
};

export default useRouteEditorDraft;
