"use client";

import React, { useState } from "react";
import {
  Activity,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Cpu,
  FileCode,
  Layers,
  Lock,
  Radio,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export interface AuthShowcaseProps {
  mode: "sign-in" | "sign-up";
}

/**
 * Terminal and live traffic workbench for returning users on the Sign-In flow.
 * Allows toggling between real-time HTTP traffic stream and the local CLI terminal runner.
 */
const SignInWorkbench = (): React.JSX.Element => {
  const [activeTab, setActiveTab] = useState<"traffic" | "cli">("traffic");
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  const handleCopyCommand = (): void => {
    void navigator.clipboard.writeText("fack dev --port 4000");
    setHasCopied(true);
    setTimeout((): void => setHasCopied(false), 2000);
  };

  return (
    <div className="border-border/80 bg-card/95 text-card-foreground ring-border/50 relative overflow-hidden rounded-xl border shadow-lg ring-1 backdrop-blur-xs transition-all duration-300">
      {/* Titlebar with window controls and interactive tab switcher */}
      <div className="border-border/70 bg-muted/40 flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-2">
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
          <div className="bg-muted/70 ml-2 inline-flex rounded-lg p-0.5">
            <button
              type="button"
              onClick={(): void => setActiveTab("traffic")}
              className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-medium transition-all ${
                activeTab === "traffic"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Live Traffic
            </button>
            <button
              type="button"
              onClick={(): void => setActiveTab("cli")}
              className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-medium transition-all ${
                activeTab === "cli"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              CLI Terminal
            </button>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          <span>12 Endpoints Active</span>
        </div>
      </div>

      {/* Tab 1: Live Traffic Log */}
      {activeTab === "traffic" && (
        <div className="space-y-2 p-3.5 font-mono text-[11px] leading-relaxed">
          <div className="border-border/40 bg-muted/20 hover:border-border/80 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-colors">
            <div className="flex items-center gap-2 truncate">
              <span className="text-muted-foreground/60 text-[10px]">
                10:42:15
              </span>
              <span className="py-0.2 rounded bg-emerald-500/15 px-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                GET
              </span>
              <span className="text-foreground/90 truncate font-medium">
                /api/v1/projects
              </span>
            </div>
            <span className="text-muted-foreground shrink-0 text-[10px]">
              200 OK · 14ms
            </span>
          </div>

          <div className="border-border/40 bg-muted/20 hover:border-border/80 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-colors">
            <div className="flex items-center gap-2 truncate">
              <span className="text-muted-foreground/60 text-[10px]">
                10:42:19
              </span>
              <span className="py-0.2 rounded bg-blue-500/15 px-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                POST
              </span>
              <span className="text-foreground/90 truncate font-medium">
                /api/cli/auth/device
              </span>
            </div>
            <span className="text-muted-foreground shrink-0 text-[10px]">
              201 Created · 22ms
            </span>
          </div>

          <div className="border-border/40 bg-muted/20 hover:border-border/80 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-colors">
            <div className="flex items-center gap-2 truncate">
              <span className="text-muted-foreground/60 text-[10px]">
                10:42:25
              </span>
              <span className="py-0.2 rounded bg-emerald-500/15 px-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                GET
              </span>
              <span className="text-foreground/90 truncate font-medium">
                /api/v1/endpoints/users
              </span>
            </div>
            <span className="text-muted-foreground shrink-0 text-[10px]">
              200 OK · 8ms
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: Interactive CLI Terminal */}
      {activeTab === "cli" && (
        <div className="p-3.5 font-mono text-[11px] leading-relaxed">
          <div className="border-border/50 bg-muted/30 text-foreground/90 space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="text-primary flex items-center gap-2">
                <Terminal className="size-3.5" aria-hidden="true" />
                <span className="font-semibold">$ fack dev --port 4000</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCommand}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy terminal command"
              >
                {hasCopied ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
            <p className="text-muted-foreground text-[10px]">
              Decrypted bundle with local secret key · AES-256-GCM
            </p>
            <div className="border-border/40 flex items-center justify-between border-t pt-1.5 text-[10px]">
              <span className="text-emerald-600 dark:text-emerald-400">
                ⚡ Serving mock endpoints on http://127.0.0.1:4000
              </span>
              <span className="text-muted-foreground">0ms cloud latency</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer bar */}
      <div className="border-border/60 bg-muted/20 text-muted-foreground flex items-center justify-between border-t px-3.5 py-1.5 font-mono text-[10px]">
        <span className="flex items-center gap-1.5">
          <Lock className="text-primary size-3" aria-hidden="true" />
          fack.enc · AES-256-GCM
        </span>
        <span className="flex items-center gap-1">
          <Activity className="size-3 text-emerald-500" />
          SQLite WAL Mode
        </span>
      </div>
    </div>
  );
};

/**
 * Visual canvas and schema pipeline workbench for new developers on the Sign-Up flow.
 * Allows toggling between the visual node pipeline and auto-generated TypeScript DTO output.
 */
const SignUpWorkbench = (): React.JSX.Element => {
  const [activeTab, setActiveTab] = useState<"canvas" | "typescript">("canvas");
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  const sampleTypeScript = `export interface UserProfile {\n  id: string;\n  name: string;\n  role: "Lead Architect" | "Engineer";\n  active: boolean;\n}`;

  const handleCopyCode = (): void => {
    void navigator.clipboard.writeText(sampleTypeScript);
    setHasCopied(true);
    setTimeout((): void => setHasCopied(false), 2000);
  };

  return (
    <div className="border-border/80 bg-card/95 text-card-foreground ring-border/50 relative overflow-hidden rounded-xl border shadow-lg ring-1 backdrop-blur-xs transition-all duration-300">
      {/* Titlebar with window controls and interactive tab switcher */}
      <div className="border-border/70 bg-muted/40 flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-2">
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
          <div className="bg-muted/70 ml-2 inline-flex rounded-lg p-0.5">
            <button
              type="button"
              onClick={(): void => setActiveTab("canvas")}
              className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-medium transition-all ${
                activeTab === "canvas"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Visual Canvas
            </button>
            <button
              type="button"
              onClick={(): void => setActiveTab("typescript")}
              className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-medium transition-all ${
                activeTab === "typescript"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              TypeScript DTO
            </button>
          </div>
        </div>

        <div className="border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold">
          <Zap className="size-3" aria-hidden="true" />
          <span>Faker Synthesizer</span>
        </div>
      </div>

      {/* Tab 1: Visual Schema Pipeline */}
      {activeTab === "canvas" && (
        <div className="space-y-2 p-3.5">
          <div className="border-border/60 bg-muted/30 flex items-center justify-between rounded-lg border px-3 py-2">
            <div className="flex items-center gap-2">
              <Layers className="text-primary size-3.5" aria-hidden="true" />
              <span className="text-foreground text-xs font-medium">
                Route: /api/v2/users
              </span>
            </div>
            <span className="text-muted-foreground font-mono text-[10px]">
              HTTP 200 · JSON
            </span>
          </div>

          <pre className="border-border/40 bg-muted/20 text-foreground/90 overflow-x-auto rounded-lg border p-2.5 font-mono text-[10.5px] leading-relaxed">
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
                &quot;Lead Architect&quot;
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
      )}

      {/* Tab 2: TypeScript DTO Export */}
      {activeTab === "typescript" && (
        <div className="p-3.5 font-mono text-[11px] leading-relaxed">
          <div className="border-border/50 bg-muted/20 relative rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
                <FileCode className="text-primary size-3" />
                types/user.dto.ts
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy TypeScript code"
              >
                {hasCopied ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
            <pre className="text-foreground/90 overflow-x-auto text-[10.5px]">
              <code>{sampleTypeScript}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Footer bar */}
      <div className="border-border/60 bg-muted/20 text-muted-foreground flex items-center justify-between border-t px-3.5 py-1.5 font-mono text-[10px]">
        <span className="flex items-center gap-1.5">
          <Cpu className="text-primary size-3" aria-hidden="true" />
          TypeScript &amp; OpenAPI 3.1
        </span>
        <span className="flex items-center gap-1">
          <Code2 className="text-primary size-3" />
          Deterministic Seed 1337
        </span>
      </div>
    </div>
  );
};

/**
 * Redesigned left showcase panel for the authentication screen.
 * Implements a modern Tailwind CSS v4 design system layout with interactive workbenches,
 * responsive typography, seamless light/dark theme adaptation, and flow-aligned messaging.
 */
export const AuthShowcase = ({
  mode,
}: AuthShowcaseProps): React.JSX.Element => {
  const isSignIn = mode === "sign-in";

  const capabilities = isSignIn
    ? [
        "Fast local mock runner with zero external cloud latency",
        "Encrypted bundle synchronization directly from your terminal",
        "Reproducible Faker payloads with deterministic seeds and chaos rules",
      ]
    : [
        "Interactive node canvas compiling to standard JSON Schema",
        "Synthetic Faker.js generation with nested relations and seed locking",
        "Instant one-click TypeScript interface and OpenAPI 3.1 export",
      ];

  const trustChips = isSignIn
    ? ["Local SQLite Storage", "AES-256-GCM Encrypted", "Zero Cloud Dependency"]
    : [
        "100% Self-Hostable",
        "No Credit Card Required",
        "Open Source & MIT Licensed",
      ];

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
          <span className="border-border/80 bg-background/80 text-muted-foreground rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold">
            v1.20
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

      {/* Hero value proposition & Interactive workbench */}
      <div className="relative z-10 my-auto flex flex-col gap-6 py-6">
        <div className="space-y-3">
          <h1 className="font-heading text-foreground text-3xl leading-tight font-extrabold tracking-tight xl:text-[2.5rem]">
            {isSignIn
              ? "Pick up where your mock API left off."
              : "Design, mock, and ship before backend code exists."}
          </h1>
          <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
            {isSignIn
              ? "Access your encrypted projects, inspect live payloads, and synchronize your local terminal CLI directly with your cloud workspace."
              : "Build nested JSON schemas on an intuitive visual canvas, synthesize realistic Faker.js datasets, and test edge cases before code is written."}
          </p>
        </div>

        {/* Live Interactive Workbench */}
        {isSignIn ? <SignInWorkbench /> : <SignUpWorkbench />}

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
