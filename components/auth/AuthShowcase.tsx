"use client";

import React from "react";
import {
  CheckCircle2,
  Cpu,
  Layers,
  Lock,
  Radio,
  Sparkles,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export interface AuthShowcaseProps {
  mode: "sign-in" | "sign-up";
}

/**
 * Terminal mock runner preview tailored for the Sign-In workflow.
 * Reflects the developer experience of running `fack dev` and connecting workspaces.
 */
const SignInTrafficPreview = (): React.JSX.Element => (
  <div className="border-border/80 bg-card/90 text-card-foreground ring-border/50 relative overflow-hidden rounded-xl border shadow-lg ring-1 backdrop-blur-xs">
    {/* Terminal title bar */}
    <div className="border-border/70 bg-muted/40 flex items-center justify-between border-b px-3.5 py-2">
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full bg-red-400/80"
        />
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full bg-amber-400/80"
        />
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full bg-emerald-400/80"
        />
        <span className="text-muted-foreground ml-2 font-mono text-[11px] font-medium">
          fack dev --port 4000
        </span>
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
        <span>12 routes serving</span>
      </div>
    </div>

    {/* Real-time traffic log lines */}
    <div className="space-y-2 p-3.5 font-mono text-[11px] leading-relaxed">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          <span className="text-muted-foreground/60 shrink-0">10:42:15</span>
          <span className="py-0.2 rounded bg-emerald-500/15 px-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            GET
          </span>
          <span className="text-foreground/90 truncate">/api/v1/projects</span>
        </div>
        <div className="text-muted-foreground shrink-0 text-[10px]">
          200 OK · 14ms
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          <span className="text-muted-foreground/60 shrink-0">10:42:18</span>
          <span className="py-0.2 rounded bg-blue-500/15 px-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
            POST
          </span>
          <span className="text-foreground/90 truncate">
            /api/cli/auth/device
          </span>
        </div>
        <div className="text-muted-foreground shrink-0 text-[10px]">
          201 Created · 21ms
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          <span className="text-muted-foreground/60 shrink-0">10:42:24</span>
          <span className="py-0.2 rounded bg-emerald-500/15 px-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            GET
          </span>
          <span className="text-foreground/90 truncate">
            /api/v1/endpoints/users
          </span>
        </div>
        <div className="text-muted-foreground shrink-0 text-[10px]">
          200 OK · 8ms
        </div>
      </div>
    </div>

    {/* Terminal footer metadata */}
    <div className="border-border/60 bg-muted/20 text-muted-foreground flex items-center justify-between border-t px-3.5 py-1.5 font-mono text-[10px]">
      <span className="flex items-center gap-1.5">
        <Lock className="text-primary size-3" aria-hidden="true" />
        fack.enc · AES-256-GCM
      </span>
      <span>SQLite · WAL mode</span>
    </div>
  </div>
);

/**
 * Visual canvas & schema synthesis preview tailored for the Sign-Up workflow.
 * Reflects the creative process of designing schemas, Faker generators, and endpoints.
 */
const SignUpCanvasPreview = (): React.JSX.Element => (
  <div className="border-border/80 bg-card/90 text-card-foreground ring-border/50 relative overflow-hidden rounded-xl border shadow-lg ring-1 backdrop-blur-xs">
    {/* Canvas title bar */}
    <div className="border-border/70 bg-muted/40 flex items-center justify-between border-b px-3.5 py-2">
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full bg-red-400/80"
        />
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full bg-amber-400/80"
        />
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full bg-emerald-400/80"
        />
        <span className="text-muted-foreground ml-2 font-mono text-[11px] font-medium">
          Route Canvas: /api/v2/users
        </span>
      </div>
      <div className="border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold">
        <Zap className="size-3" aria-hidden="true" />
        <span>Schema Synthesizer</span>
      </div>
    </div>

    {/* Visual transformation nodes */}
    <div className="space-y-2.5 p-3.5">
      <div className="border-border/60 bg-muted/30 flex items-center justify-between rounded-lg border px-3 py-2">
        <div className="flex items-center gap-2">
          <Layers className="text-primary size-3.5" aria-hidden="true" />
          <span className="text-foreground text-xs font-medium">
            Node: EndpointRoute
          </span>
        </div>
        <span className="text-muted-foreground font-mono text-[10px]">
          HTTP 200 · JSON
        </span>
      </div>

      {/* Generated mock response payload */}
      <pre className="border-border/40 bg-muted/20 text-foreground/80 overflow-x-auto rounded-lg border p-2.5 font-mono text-[10.5px] leading-relaxed">
        <code>
          <span className="text-muted-foreground">{"{"}</span>
          <br />
          {"  "}
          <span className="text-primary">&quot;id&quot;</span>:{" "}
          <span className="text-amber-600 dark:text-amber-300">
            &quot;usr_9a4f21&quot;
          </span>
          ,
          <br />
          {"  "}
          <span className="text-primary">&quot;name&quot;</span>:{" "}
          <span className="text-amber-600 dark:text-amber-300">
            &quot;Ada Lovelace&quot;
          </span>
          ,
          <br />
          {"  "}
          <span className="text-primary">&quot;role&quot;</span>:{" "}
          <span className="text-amber-600 dark:text-amber-300">
            &quot;Staff Engineer&quot;
          </span>
          ,
          <br />
          {"  "}
          <span className="text-primary">&quot;active&quot;</span>:{" "}
          <span className="text-violet-600 dark:text-violet-400">true</span>
          <br />
          <span className="text-muted-foreground">{"}"}</span>
        </code>
      </pre>
    </div>

    {/* Canvas footer metadata */}
    <div className="border-border/60 bg-muted/20 text-muted-foreground flex items-center justify-between border-t px-3.5 py-1.5 font-mono text-[10px]">
      <span className="flex items-center gap-1.5">
        <Cpu className="text-primary size-3" aria-hidden="true" />
        TypeScript DTO &amp; OpenAPI 3.1
      </span>
      <span>Faker.js v10 · Seed 1337</span>
    </div>
  </div>
);

/**
 * Redesigned left showcase panel for the authentication screen.
 * Seamlessly adapts to theme colors (light and dark) and customizes its content,
 * headlines, capabilities, and live previews based on whether the user is signing in or signing up.
 */
export const AuthShowcase = ({
  mode,
}: AuthShowcaseProps): React.JSX.Element => {
  const isSignIn = mode === "sign-in";

  const capabilities = isSignIn
    ? [
        "Fast local mock runner with zero cloud latency",
        "Encrypted bundle pull and push via terminal CLI",
        "Deterministic seeds and chaos injection rules",
      ]
    : [
        "Visual node canvas that compiles to standard JSON Schema",
        "Realistic Faker.js synthesis with deep nested objects",
        "One-click TypeScript DTO and OpenAPI specification export",
      ];

  const trustChips = isSignIn
    ? ["Local SQLite Storage", "AES-256-GCM Encrypted", "Zero Cloud Lock-in"]
    : ["No Credit Card Required", "100% Self-Hostable", "MIT Open Source"];

  return (
    <aside className="border-border/60 bg-muted/20 relative hidden overflow-hidden border-r p-8 select-none lg:flex lg:flex-col lg:justify-between xl:p-12">
      {/* Theme-aware blueprint background pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_5%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_5%,transparent)_1px,transparent_1px)] bg-[size:32px_32px]"
      />

      {/* Subtle radial illumination */}
      <div
        aria-hidden="true"
        className="from-primary/10 pointer-events-none absolute -top-40 -left-40 size-160 rounded-full bg-radial via-transparent to-transparent blur-2xl"
      />

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandLogo size={32} />
          <span className="font-heading text-foreground text-base font-extrabold tracking-tight">
            fackapi<span className="text-primary">.</span>studio
          </span>
        </div>

        {isSignIn ? (
          <div className="border-border/80 bg-background/80 text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-xs">
            <Radio className="size-3 animate-pulse text-emerald-500" />
            <span>Workspace Login</span>
          </div>
        ) : (
          <div className="border-border/80 bg-background/80 text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-xs">
            <Sparkles className="text-primary size-3" />
            <span>New Workspace</span>
          </div>
        )}
      </div>

      {/* Hero value proposition */}
      <div className="relative z-10 my-auto flex flex-col gap-6 py-6">
        <div className="space-y-3">
          <h1 className="font-heading text-foreground text-3xl leading-tight font-extrabold tracking-tight xl:text-[2.5rem]">
            {isSignIn
              ? "Welcome back to your mock backend."
              : "Design and prototype your API before it exists."}
          </h1>
          <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
            {isSignIn
              ? "Access your encrypted projects, inspect live payloads, and synchronize your local terminal CLI directly with your cloud workspace."
              : "Build nested JSON schemas on an intuitive visual canvas, synthesize realistic Faker.js datasets, and test edge cases before code is written."}
          </p>
        </div>

        {/* Live workflow preview card */}
        {isSignIn ? <SignInTrafficPreview /> : <SignUpCanvasPreview />}

        {/* Capability bullet points */}
        <ul className="space-y-2.5 pt-1">
          {capabilities.map((capability) => (
            <li
              key={capability}
              className="text-foreground/80 flex items-center gap-2.5 text-xs font-medium"
            >
              <CheckCircle2
                className="text-primary size-4 shrink-0"
                aria-hidden="true"
              />
              <span>{capability}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Trust chips footer */}
      <div className="relative z-10 flex flex-wrap items-center gap-2 pt-4">
        {trustChips.map((chip) => (
          <span
            key={chip}
            className="border-border/70 bg-background/70 text-muted-foreground rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wide shadow-2xs"
          >
            {chip}
          </span>
        ))}
      </div>
    </aside>
  );
};
