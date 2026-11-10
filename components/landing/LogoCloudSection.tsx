"use client";

import React from "react";
import {
  Zap,
  Layers,
  Cpu,
  Code2,
  Sparkles,
  Network,
  FileCode,
} from "lucide-react";
import { LogoCloudStackMark, type StackItem } from "./LogoCloudStackMark";

const STACK: StackItem[] = [
  {
    id: "faker",
    name: "faker.js",
    icon: Sparkles,
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
    icon: Layers,
    iconClasses: "border-info/30 bg-info/15 text-info",
  },
  {
    id: "typescript",
    name: "TypeScript",
    icon: Code2,
    iconClasses: "border-info/30 bg-info/15 text-info",
  },
  {
    id: "drizzle",
    name: "drizzle.orm",
    icon: Zap,
    iconClasses: "border-warning/30 bg-warning/15 text-warning",
  },
  {
    id: "reactflow",
    name: "React Flow",
    icon: Network,
    iconClasses: "border-primary/30 bg-primary/15 text-primary",
  },
  {
    id: "zustand",
    name: "Zustand",
    icon: Cpu,
    iconClasses: "border-success/30 bg-success/15 text-success",
  },
  {
    id: "openapi",
    name: "OpenAPI 3.0",
    icon: FileCode,
    iconClasses: "border-method-patch/30 bg-method-patch/15 text-method-patch",
  },
];

/**
 * Animated infinite marquee displaying industry-standard open source libraries.
 */
export const LogoCloudSection = (): React.JSX.Element => {
  return (
    <section className="border-border/40 bg-background relative overflow-hidden border-b py-10 select-none">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-muted-foreground/60 mb-6 text-center text-xs font-medium tracking-wider uppercase">
          Powered by industry-standard open source libraries
        </p>

        <div className="relative flex overflow-x-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <div className="animate-marquee flex items-center gap-16 whitespace-nowrap sm:gap-24">
            <div className="flex items-center gap-16 sm:gap-24">
              {STACK.map((item) => (
                <LogoCloudStackMark key={`logo-1-${item.id}`} item={item} />
              ))}
            </div>

            <div
              aria-hidden="true"
              className="flex items-center gap-16 sm:gap-24"
            >
              {STACK.map((item) => (
                <LogoCloudStackMark key={`logo-2-${item.id}`} item={item} />
              ))}
            </div>

            <div
              aria-hidden="true"
              className="flex items-center gap-16 sm:gap-24"
            >
              {STACK.map((item) => (
                <LogoCloudStackMark key={`logo-3-${item.id}`} item={item} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </section>
  );
};
