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

type StackItem = {
  id: string;
  name: string;
  icon: typeof Zap | null;
  iconClasses: string;
};

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

const StackMark = ({ item }: { item: StackItem }): React.JSX.Element => {
  const Icon = item.icon;
  return (
    <div className="text-foreground flex items-center gap-3 text-base font-extrabold tracking-tight sm:text-lg md:text-xl">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-xl border sm:size-9 ${item.iconClasses}`}
      >
        {Icon ? (
          <Icon className="size-5 sm:size-6" aria-hidden="true" />
        ) : (
          <span aria-hidden="true" className="font-mono text-sm font-black">
            N
          </span>
        )}
      </div>
      <span className={"text-foreground font-black tracking-tight"}>
        {item.name}
      </span>
    </div>
  );
};

/**
 * The tools the product is built on, in a marquee that pauses on hover and
 * focus and stops entirely for reduced-motion users.
 */
export const LogoCloudSection = (): React.JSX.Element => {
  return (
    <section
      aria-label="Built with"
      className="border-border/40 bg-background relative w-full overflow-hidden border-b"
    >
      <div className="border-border/40 mx-auto flex max-w-7xl flex-col items-center justify-center border-x px-6 py-8 sm:px-10 sm:py-10">
        <div className="relative w-full flex-1 overflow-hidden py-2">
          <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-linear-to-r to-transparent" />
          <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-linear-to-l to-transparent" />

          <div className="flex w-max animate-[marquee_35s_linear_infinite] items-center gap-16 focus-within:[animation-play-state:paused] hover:[animation-play-state:paused] motion-reduce:animate-none sm:gap-24">
            <div className="flex items-center gap-16 sm:gap-24">
              {STACK.map((item) => (
                <StackMark key={`logo-1-${item.id}`} item={item} />
              ))}
            </div>

            <div
              aria-hidden="true"
              className="flex items-center gap-16 sm:gap-24"
            >
              {STACK.map((item) => (
                <StackMark key={`logo-2-${item.id}`} item={item} />
              ))}
            </div>

            <div
              aria-hidden="true"
              className="flex items-center gap-16 sm:gap-24"
            >
              {STACK.map((item) => (
                <StackMark key={`logo-3-${item.id}`} item={item} />
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
