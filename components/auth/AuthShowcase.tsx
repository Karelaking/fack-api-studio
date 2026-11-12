"use client";

import * as React from "react";
import {
  CheckTickCircleIcon,
  WifiOnIcon,
  SparkleAi01Icon,
} from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SignInWorkbench } from "./SignInWorkbench";
import { SignUpWorkbench } from "./SignUpWorkbench";

export interface AuthShowcaseProps {
  mode: "sign-in" | "sign-up";
}

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
          <span className="border-border/80 bg-background/80 text-muted-foreground text-mini rounded-md border px-1.5 py-0.5 font-mono font-semibold">
            v1.20
          </span>
        </div>

        {isSignIn ? (
          <div className="border-border/80 bg-background/80 text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-xs">
            <PikaIcon
              icon={WifiOnIcon}
              className="text-success size-3 animate-pulse motion-reduce:animate-none"
            />
            <span>Workspace Login</span>
          </div>
        ) : (
          <div className="border-border/80 bg-background/80 text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-xs">
            <PikaIcon icon={SparkleAi01Icon} className="text-primary size-3" />
            <span>New Workspace</span>
          </div>
        )}
      </div>

      {/* Hero value proposition & Interactive workbench */}
      <div className="relative z-10 my-auto flex flex-col gap-6 py-6">
        <div className="space-y-3">
          <h1 className="font-heading text-foreground text-3xl leading-tight font-extrabold tracking-tight xl:text-4xl">
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
              <PikaIcon
                icon={CheckTickCircleIcon}
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
            className="border-border/70 bg-background/70 text-muted-foreground text-mini rounded-full border px-2.5 py-1 font-mono tracking-wide shadow-2xs"
          >
            {chip}
          </span>
        ))}
      </div>
    </aside>
  );
};
