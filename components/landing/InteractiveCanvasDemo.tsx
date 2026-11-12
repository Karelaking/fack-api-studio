"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  CopyIcon,
  CheckTickCircleIcon,
  SparkleAi01Icon,
  GraphTrendLineIcon,
  ArrowRightIcon,
  GlobeIcon,
  CodeIcon,
  RefreshIcon,
  LayerThreeIcon,
  ClockIcon,
  AlertTriangleIcon,
  LightningThunderElectricOnIcon,
} from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { HttpMethod } from "@/db/schema";

export type ResponseTab = "json" | "curl" | "typescript";
export type LatencyPreset = "instant" | "normal" | "slow" | "error";

interface FieldItem {
  id: string;
  key: string;
  fakerProvider: string;
  enabled: boolean;
  sampleValue: string;
}

const DEFAULT_FIELDS: FieldItem[] = [
  {
    id: "f1",
    key: "id",
    fakerProvider: "faker.string.uuid()",
    enabled: true,
    sampleValue: "usr_99a8b1",
  },
  {
    id: "f2",
    key: "name",
    fakerProvider: "faker.person.fullName()",
    enabled: true,
    sampleValue: "Alexander Vance",
  },
  {
    id: "f3",
    key: "email",
    fakerProvider: "faker.internet.email()",
    enabled: true,
    sampleValue: "alex.vance@fackapi.dev",
  },
  {
    id: "f4",
    key: "role",
    fakerProvider: "faker.person.jobTitle()",
    enabled: true,
    sampleValue: "Principal Systems Architect",
  },
  {
    id: "f5",
    key: "avatar",
    fakerProvider: "faker.image.avatar()",
    enabled: false,
    sampleValue: "https://avatars.fackapi.dev/usr_99.png",
  },
  {
    id: "f6",
    key: "status",
    fakerProvider: 'faker.helpers.arrayElement(["active", "offline"])',
    enabled: true,
    sampleValue: "active",
  },
  {
    id: "f7",
    key: "createdAt",
    fakerProvider: "faker.date.recent()",
    enabled: false,
    sampleValue: "2026-08-01T12:00:00Z",
  },
];

const FIRST_NAMES = ["Jordan", "Maya", "Elena", "Tomas", "Priya", "Noah"];
const LAST_NAMES = [
  "Peterson",
  "Okafor",
  "Lindqvist",
  "Ramos",
  "Shah",
  "Becker",
];
const JOB_TITLES = [
  "Staff Backend Engineer",
  "Principal Systems Architect",
  "Frontend Platform Lead",
  "QA Automation Engineer",
];

const pick = <T,>(list: readonly T[]): T =>
  list[Math.floor(Math.random() * list.length)];

const randomHex = (length: number): string =>
  Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");

const randomSample = (fieldId: string): string => {
  switch (fieldId) {
    case "f1":
      return `usr_${randomHex(6)}`;
    case "f2":
      return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    case "f3":
      return `${pick(FIRST_NAMES)}.${pick(LAST_NAMES)}@fackapi.dev`.toLowerCase();
    case "f4":
      return pick(JOB_TITLES);
    case "f5":
      return `https://avatars.fackapi.dev/${randomHex(6)}.png`;
    case "f6":
      return Math.random() > 0.5 ? "active" : "offline";
    case "f7":
      return new Date(
        Date.now() - Math.floor(Math.random() * 60) * 86_400_000,
      ).toISOString();
    default:
      return randomHex(6);
  }
};

const METHOD_TONE: Record<HttpMethod, string> = {
  GET: "border-method-get/40 bg-method-get/15 text-method-get",
  POST: "border-method-post/40 bg-method-post/15 text-method-post",
  PUT: "border-method-put/40 bg-method-put/15 text-method-put",
  PATCH: "border-method-patch/40 bg-method-patch/15 text-method-patch",
  DELETE: "border-method-delete/40 bg-method-delete/15 text-method-delete",
};

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  500: "Internal Server Error",
};

const RESPONSE_TABS: ReadonlyArray<{ id: ResponseTab; label: string }> = [
  { id: "json", label: "Live JSON" },
  { id: "curl", label: "cURL" },
  { id: "typescript", label: "TypeScript DTO" },
];

const emptySubscribe = (): (() => void) => () => {};

/**
 * The demo prints a request URL. Derive the host from the deployment instead of
 * hard-coding a production domain, so the sample stays honest wherever the app
 * runs. The server snapshot uses the configured public URL; the client snapshot
 * prefers the browser origin.
 */
function useDemoOrigin(): string {
  return React.useSyncExternalStore(
    emptySubscribe,
    (): string =>
      typeof window === "undefined"
        ? (process.env.NEXT_PUBLIC_APP_URL ?? "")
        : window.location.origin,
    (): string => process.env.NEXT_PUBLIC_APP_URL ?? "",
  );
}

/**
 * Interactive endpoint builder and response console.
 *
 * Every control changes the output on the right: method and path change the
 * request, field toggles change the payload, latency and chaos change the
 * status line. Refresh genuinely regenerates the Faker-style sample values.
 */
export const InteractiveCanvasDemo = (): React.JSX.Element => {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [routePath, setRoutePath] = useState<string>("/api/v1/users");
  const [fields, setFields] = useState<FieldItem[]>(DEFAULT_FIELDS);
  const [latencyPreset, setLatencyPreset] = useState<LatencyPreset>("normal");
  const [activeTab, setActiveTab] = useState<ResponseTab>("json");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [generatedAt, setGeneratedAt] = useState<string>(
    "2026-08-01T12:00:00.000Z",
  );
  const demoOrigin = useDemoOrigin();

  const toggleField = (id: string): void => {
    setFields((prev: FieldItem[]): FieldItem[] =>
      prev.map((f: FieldItem): FieldItem =>
        f.id === id ? { ...f, enabled: !f.enabled } : f,
      ),
    );
  };

  const latencyMs = useMemo((): number => {
    switch (latencyPreset) {
      case "instant":
        return 6;
      case "normal":
        return 24;
      case "slow":
        return 280;
      case "error":
        return 45;
    }
  }, [latencyPreset]);

  const statusCode = useMemo((): number => {
    if (latencyPreset === "error") {
      return 500;
    }
    if (method === "POST") {
      return 201;
    }
    return 200;
  }, [latencyPreset, method]);

  const generatedJson = useMemo((): string => {
    if (statusCode === 500) {
      return JSON.stringify(
        {
          error: "Internal Server Error",
          status: 500,
          message: "Chaos injection active: simulated backend failure.",
          timestamp: generatedAt,
        },
        undefined,
        2,
      );
    }

    const activeProps = fields.filter((f: FieldItem): boolean => f.enabled);
    const item: Record<string, string> = {};
    activeProps.forEach((f: FieldItem): void => {
      item[f.key] = f.sampleValue;
    });

    if (method === "POST") {
      return JSON.stringify(
        {
          status: 201,
          message: "Resource created successfully",
          data: item,
        },
        undefined,
        2,
      );
    }

    return JSON.stringify(
      {
        page: 1,
        limit: 10,
        total: 150,
        data: [item],
      },
      undefined,
      2,
    );
  }, [fields, statusCode, method, generatedAt]);

  const generatedCurl = useMemo((): string => {
    return `curl -X ${method} "${demoOrigin}${routePath}" \\
  -H "Accept: application/json"`;
  }, [method, routePath, demoOrigin]);

  const generatedTs = useMemo((): string => {
    const activeProps = fields.filter((f: FieldItem): boolean => f.enabled);
    const lines = activeProps.map((f: FieldItem): string => {
      return `  ${f.key}: string;`;
    });

    return `// Generated TypeScript DTO for ${routePath}
export interface UserDto {
${lines.join("\n")}
}

export type ApiResponse = {
  status: ${statusCode};
  data: UserDto[];
};`;
  }, [fields, routePath, statusCode]);

  const currentCode = useMemo((): string => {
    switch (activeTab) {
      case "json":
        return generatedJson;
      case "curl":
        return generatedCurl;
      case "typescript":
        return generatedTs;
    }
  }, [activeTab, generatedJson, generatedCurl, generatedTs]);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout((): void => setCopyState("idle"), 2400);
  };

  const handleSimulateRequest = (): void => {
    setRefreshing(true);
    setFields((prev: FieldItem[]): FieldItem[] =>
      prev.map((f: FieldItem): FieldItem => ({
        ...f,
        sampleValue: randomSample(f.id),
      })),
    );
    setGeneratedAt(new Date().toISOString());
    window.setTimeout((): void => setRefreshing(false), 600);
  };

  const statusText = STATUS_TEXT[statusCode] ?? "Error";

  return (
    <section
      id="showcase"
      aria-labelledby="showcase-title"
      className="border-border/40 bg-background relative w-full scroll-mt-20 overflow-hidden border-b"
    >
      <div className="border-border/40 relative mx-auto max-w-7xl border-x">
        <div className="mx-auto max-w-360 space-y-4 px-4 pt-12 pb-10 text-center md:pt-16 md:pb-12 lg:pt-20 lg:pb-14">
          <h2
            id="showcase-title"
            className="text-foreground mx-auto w-full text-3xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl"
          >
            Create Mock Endpoints in Seconds.{" "}
            <br className="hidden sm:inline" />
            Deploy Without Writing a Server.
          </h2>
          <p className="text-muted-foreground mx-auto max-w-4xl text-sm leading-relaxed sm:text-base md:text-lg">
            Create mock routes in the Fack API dashboard. Configure methods,
            assign Faker.js generators, inject simulated chaos, and see live
            output below.
          </p>
        </div>

        <div className="divide-border/40 border-border/40 grid grid-cols-1 divide-y border-t lg:grid-cols-12 lg:divide-x lg:divide-y-0">
          <div className="bg-card/30 flex flex-col justify-between space-y-5 p-5 sm:p-6 lg:col-span-6 lg:p-7">
            <div className="border-border/40 flex items-center justify-between gap-3 border-b pb-4">
              <span className="text-foreground flex min-w-0 items-center gap-1.5 text-xs font-bold">
                <PikaIcon
                  icon={LayerThreeIcon}
                  className="text-info size-3.5"
                  aria-hidden="true"
                />
                <span className="truncate">Dashboard: Endpoint Builder</span>
              </span>
              <span className="text-muted-foreground bg-muted/60 border-border/60 text-caption shrink-0 rounded-full border px-2.5 py-0.5 font-semibold">
                Configure
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-foreground flex items-center justify-between gap-3 text-xs font-bold">
                <span>Select method and route path</span>
                <span className="text-muted-foreground text-caption shrink-0">
                  HTTP route
                </span>
              </span>

              <div className="flex flex-col gap-2 sm:flex-row">
                <fieldset className="bg-muted/50 border-border/40 m-0 flex min-w-0 shrink-0 items-center gap-1 rounded-xl border p-1">
                  <legend className="sr-only">HTTP method</legend>
                  {(["GET", "POST", "PUT", "DELETE"] as const).map(
                    (m: HttpMethod) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={method === m}
                        onClick={(): void => setMethod(m)}
                        className={cn(
                          "cursor-pointer rounded-lg border px-2.5 py-1 font-mono text-xs font-bold transition-colors focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
                          method === m
                            ? METHOD_TONE[m]
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
                        )}
                      >
                        {m}
                      </button>
                    ),
                  )}
                </fieldset>

                <Select value={routePath} onValueChange={setRoutePath}>
                  <SelectTrigger
                    aria-label="Select route path"
                    className="border-border/60 bg-background text-foreground h-auto flex-1 rounded-xl border px-3 py-1.5 font-mono text-xs font-semibold shadow-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="/api/v1/users"
                      className="font-mono text-xs"
                    >
                      /api/v1/users
                    </SelectItem>
                    <SelectItem
                      value="/api/v1/products"
                      className="font-mono text-xs"
                    >
                      /api/v1/products
                    </SelectItem>
                    <SelectItem
                      value="/api/v1/orders"
                      className="font-mono text-xs"
                    >
                      /api/v1/orders
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-foreground flex items-center justify-between gap-3 text-xs font-bold">
                <span>Assign Faker.js schema generators</span>
                <span className="text-muted-foreground text-caption shrink-0">
                  Click to toggle
                </span>
              </span>

              <div className="scrollbar-subtle grid max-h-52 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                {fields.map((f: FieldItem) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={f.enabled}
                    onClick={(): void => toggleField(f.id)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-2 text-left font-mono text-xs transition-colors select-none focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
                      f.enabled
                        ? "bg-background border-border text-foreground shadow-xs"
                        : "bg-muted/20 border-border/40 text-muted-foreground",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-3.5 shrink-0 items-center justify-center rounded border",
                          f.enabled
                            ? "border-success bg-success/15 text-success"
                            : "border-border/60 text-transparent",
                        )}
                      >
                        <PikaIcon
                          icon={CheckTickCircleIcon}
                          className="size-3"
                        />
                      </span>
                      <span className="truncate font-bold">{f.key}</span>
                    </span>
                    <span className="text-info text-micro max-w-30 truncate font-normal">
                      {f.fakerProvider.replace("faker.", "")}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-foreground flex items-center justify-between gap-3 text-xs font-bold">
                <span className="flex items-center gap-1">
                  <PikaIcon
                    icon={GraphTrendLineIcon}
                    className="text-warning size-3.5"
                    aria-hidden="true"
                  />
                  <span>Network latency and chaos simulation</span>
                </span>
                <span className="text-warning text-caption shrink-0 font-mono">
                  {latencyMs}ms delay
                </span>
              </span>

              <fieldset className="m-0 grid min-w-0 grid-cols-2 gap-1.5 border-0 p-0 text-xs sm:grid-cols-4">
                <legend className="sr-only">Latency preset</legend>
                <button
                  type="button"
                  aria-pressed={latencyPreset === "instant"}
                  onClick={(): void => setLatencyPreset("instant")}
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-1 rounded-lg border p-2 text-center transition-colors focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
                    latencyPreset === "instant"
                      ? "border-success/50 bg-success/10 font-bold text-success"
                      : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <PikaIcon
                    icon={LightningThunderElectricOnIcon}
                    className="size-3"
                    aria-hidden="true"
                  />{" "}
                  6ms
                </button>
                <button
                  type="button"
                  aria-pressed={latencyPreset === "normal"}
                  onClick={(): void => setLatencyPreset("normal")}
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-1 rounded-lg border p-2 text-center transition-colors focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
                    latencyPreset === "normal"
                      ? "border-info/50 bg-info/10 font-bold text-info"
                      : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <PikaIcon
                    icon={GlobeIcon}
                    className="size-3"
                    aria-hidden="true"
                  />{" "}
                  24ms
                </button>
                <button
                  type="button"
                  aria-pressed={latencyPreset === "slow"}
                  onClick={(): void => setLatencyPreset("slow")}
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-1 rounded-lg border p-2 text-center transition-colors focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
                    latencyPreset === "slow"
                      ? "border-warning/50 bg-warning/10 font-bold text-warning"
                      : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <PikaIcon
                    icon={ClockIcon}
                    className="size-3"
                    aria-hidden="true"
                  />{" "}
                  280ms
                </button>
                <button
                  type="button"
                  aria-pressed={latencyPreset === "error"}
                  onClick={(): void => setLatencyPreset("error")}
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-1 rounded-lg border p-2 text-center transition-colors focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
                    latencyPreset === "error"
                      ? "border-danger/50 bg-danger/10 font-bold text-danger"
                      : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <PikaIcon
                    icon={AlertTriangleIcon}
                    className="size-3"
                    aria-hidden="true"
                  />{" "}
                  500 error
                </button>
              </fieldset>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard"
                className="bg-foreground text-background focus-visible:ring-ring/50 hover:bg-foreground/90 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-bold whitespace-nowrap shadow-md transition-colors focus-visible:ring-3 focus-visible:outline-none sm:text-sm"
              >
                <span>Launch dashboard to create yours</span>
                <PikaIcon
                  icon={ArrowRightIcon}
                  className="size-3.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value): void => setActiveTab(value as ResponseTab)}
            className="bg-background flex flex-col justify-between gap-4 p-6 sm:p-8 lg:col-span-6"
          >
            <div className="border-border/40 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <TabsList
                aria-label="Response format"
                className="bg-muted/50 border-border/40 flex h-auto items-center gap-1 rounded-xl border p-1"
              >
                {RESPONSE_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    size="compact"
                    className="h-auto cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSimulateRequest}
                  aria-label="Regenerate sample values"
                  className="border-border/60 bg-muted/40 hover:bg-muted text-foreground focus-visible:ring-ring/50 cursor-pointer rounded-lg border p-1.5 transition-colors focus-visible:ring-3 focus-visible:outline-none"
                >
                  <PikaIcon
                    icon={RefreshIcon}
                    className={cn(
                      "size-3.5",
                      refreshing && "text-info animate-spin",
                    )}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={(): void => {
                    void handleCopy();
                  }}
                  aria-label={
                    copyState === "copied"
                      ? "Output copied to the clipboard"
                      : copyState === "failed"
                        ? "Copy failed. Select the output and copy it manually"
                        : "Copy output to the clipboard"
                  }
                  className="border-border/60 bg-muted/40 hover:bg-muted text-foreground focus-visible:ring-ring/50 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:outline-none"
                >
                  {copyState === "copied" ? (
                    <>
                      <PikaIcon
                        icon={CheckTickCircleIcon}
                        className="text-success size-3.5"
                        aria-hidden="true"
                      />
                      <span className="text-success font-bold">Copied</span>
                    </>
                  ) : copyState === "failed" ? (
                    <>
                      <PikaIcon
                        icon={AlertTriangleIcon}
                        className="text-danger size-3.5"
                        aria-hidden="true"
                      />
                      <span className="text-danger font-bold">Copy failed</span>
                    </>
                  ) : (
                    <>
                      <PikaIcon
                        icon={CopyIcon}
                        className="size-3.5"
                        aria-hidden="true"
                      />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-muted/40 border-border/60 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2.5 font-mono text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "shrink-0 rounded border px-1.5 py-0.5 text-micro font-bold",
                    METHOD_TONE[method],
                  )}
                >
                  {method}
                </span>
                <span className="text-foreground truncate font-bold">
                  {demoOrigin}
                  {routePath}
                </span>
              </div>

              <span
                className={cn(
                  "inline-flex shrink-0 items-center justify-center rounded border px-2 py-0.5 text-micro",
                  statusCode === 200 || statusCode === 201
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-danger/30 bg-danger/10 text-danger",
                )}
              >
                {statusCode} {statusText}, {latencyMs}ms
              </span>
            </div>

            {RESPONSE_TABS.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="border-border/60 bg-muted/30 focus-visible:ring-ring/50 scrollbar-subtle relative mt-0 min-h-77.5 flex-1 overflow-x-auto rounded-2xl border p-5 font-mono text-xs shadow-sm focus-visible:ring-3 focus-visible:outline-none"
              >
                <pre className="text-foreground font-mono text-xs leading-relaxed whitespace-pre">
                  {currentCode}
                </pre>
              </TabsContent>
            ))}

            <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-success flex items-center gap-1">
                  <PikaIcon
                    icon={SparkleAi01Icon}
                    className="size-3"
                    aria-hidden="true"
                  />
                  <span>Instant dynamic synthesis</span>
                </span>
                <span className="text-info flex items-center gap-1">
                  <PikaIcon
                    icon={CodeIcon}
                    className="size-3"
                    aria-hidden="true"
                  />
                  <span>Ready for curl and fetch</span>
                </span>
              </div>
              <span className="text-muted-foreground">Result</span>
            </div>
          </Tabs>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {copyState === "copied"
          ? "Output copied to the clipboard"
          : copyState === "failed"
            ? "Copy failed. Select the output and copy it manually."
            : ""}
      </p>
    </section>
  );
};
