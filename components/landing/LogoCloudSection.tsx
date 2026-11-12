"use client";

import React from "react";
import {
  LightningThunderElectricOnIcon,
  LayerThreeIcon,
  TroubleshootIcon,
  CodeIcon,
  SparkleAi01Icon,
  GitBranchIcon,
  File02Icon,
} from "@pikaicons/core-free";
import { LogoCloudStackMark, type StackItem } from "./LogoCloudStackMark";

const STACK: StackItem[] = [
  {
    id: "faker",
    name: "faker.js",
    icon: SparkleAi01Icon,
    iconClasses: "border-primary/30 bg-primary/15 text-primary",
  },
  {
    id: "nextjs",
    name: "Next.js",
    icon: null,
    iconClasses: "bg-foreground text-background",
  },
  {
    id: "sqlite",
    name: "SQLite",
    icon: LayerThreeIcon,
    iconClasses: "border-info/30 bg-info/15 text-info",
  },
  {
    id: "typescript",
    name: "TypeScript",
    icon: CodeIcon,
    iconClasses: "border-info/30 bg-info/15 text-info",
  },
  {
    id: "drizzle",
    name: "drizzle.orm",
    icon: LightningThunderElectricOnIcon,
    iconClasses: "border-warning/30 bg-warning/15 text-warning",
  },
  {
    id: "reactflow",
    name: "React Flow",
    icon: GitBranchIcon,
    iconClasses: "border-primary/30 bg-primary/15 text-primary",
  },
  {
    id: "zustand",
    name: "Zustand",
    icon: TroubleshootIcon,
    iconClasses: "border-success/30 bg-success/15 text-success",
  },
  {
    id: "openapi",
    name: "OpenAPI 3.0",
    icon: File02Icon,
    iconClasses: "border-method-patch/30 bg-method-patch/15 text-method-patch",
  },
];

const MARQUEE_COPIES = [0, 1, 2] as const;

/**
 * Animated infinite marquee displaying industry-standard open source libraries.
 */
export const LogoCloudSection = (): React.JSX.Element => {
  return (
    <section
      aria-label="Powered by industry-standard open source libraries"
      className="border-border/40 bg-background relative overflow-hidden border-b py-10 select-none"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-muted-foreground/60 mb-6 text-center text-xs font-medium tracking-wider uppercase">
          Powered by industry-standard open source libraries
        </p>

        <div className="relative flex overflow-x-hidden mask-[linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <div className="animate-marquee flex w-max items-center whitespace-nowrap">
            {MARQUEE_COPIES.map((copyIndex) => (
              <div
                key={`logo-track-${copyIndex}`}
                aria-hidden={copyIndex > 0 ? true : undefined}
                className="flex shrink-0 items-center gap-16 pr-16 sm:gap-24 sm:pr-24"
              >
                {STACK.map((item) => (
                  <LogoCloudStackMark
                    key={`logo-${copyIndex + 1}-${item.id}`}
                    item={item}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
