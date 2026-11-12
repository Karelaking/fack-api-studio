import React from "react";
import Link from "next/link";
import {
  LightningThunderElectricOnIcon,
  File02Icon,
  CodeIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  SparkleAi01Icon,
  GraphTrendLineIcon,
} from "@pikaicons/core-free";
import { PikaIcon, type IconSvgElement } from "@pikaicons/react";

type Feature = {
  icon: IconSvgElement;
  badge: string;
  title: string;
  description: string;
  iconColor: string;
  iconBg: string;
};

const FEATURES: Feature[] = [
  {
    icon: LightningThunderElectricOnIcon,
    badge: "Flow canvas",
    title: "Visual Flow Canvas",
    description:
      "Construct API schema nodes, define route parameters, and draw relation edges using a responsive React Flow interactive canvas.",
    iconColor: "text-info",
    iconBg: "bg-info/15 border-info/30",
  },
  {
    icon: SparkleAi01Icon,
    badge: "Faker.js",
    title: "20+ Faker.js Generators",
    description:
      "Synthesize realistic users, transactions, UUIDs, dates, and addresses automatically powered by @faker-js/faker.",
    iconColor: "text-primary",
    iconBg: "bg-primary/15 border-primary/30",
  },
  {
    icon: GraphTrendLineIcon,
    badge: "Chaos engine",
    title: "Chaos & Latency Injector",
    description:
      "Simulate real-world network edge cases: status code errors (404, 500), response delays (100ms - 5000ms), and custom HTTP headers.",
    iconColor: "text-warning",
    iconBg: "bg-warning/15 border-warning/30",
  },
  {
    icon: ShieldCheckIcon,
    badge: "Local first",
    title: "Local-First SQLite Engine",
    description:
      "Run it on your machine or your own infrastructure. Schema definitions, route configs, and execution logs stay in the SQLite database you control.",
    iconColor: "text-success",
    iconBg: "bg-success/15 border-success/30",
  },
  {
    icon: File02Icon,
    badge: "DTO & OpenAPI",
    title: "1-Click DTO Export",
    description:
      "Instantly generate TypeScript interfaces, Drizzle ORM schemas, or OpenAPI 3.0 spec files ready to paste into your codebase.",
    iconColor: "text-method-patch",
    iconBg: "bg-method-patch/15 border-method-patch/30",
  },
  {
    icon: CodeIcon,
    badge: "Low latency",
    title: "Low-Latency Mocks",
    description:
      "Mock responses come from the local runtime, with in-memory caching and dynamic route path pattern matching keeping the round trip short.",
    iconColor: "text-danger",
    iconBg: "bg-danger/15 border-danger/30",
  },
];

export const FeaturesSection = (): React.JSX.Element => {
  return (
    <section
      id="features"
      aria-label="Key features"
      className="border-border/40 bg-background relative w-full scroll-mt-20 overflow-hidden border-b"
    >
      <div className="border-border/40 relative mx-auto max-w-7xl border-x">
        <header className="mx-auto max-w-full space-y-4 px-4 pt-16 pb-14 text-center md:pt-24">
          <h2 className="text-foreground mx-auto w-full px-2 text-3xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl xl:text-7xl 2xl:text-[8rem]">
            Everything You Need for Modern Mock APIs
          </h2>
          <p className="text-muted-foreground mx-auto max-w-3xl text-sm leading-relaxed sm:text-base md:text-lg">
            Built from the ground up for developers, QA engineers, and frontend
            teams working with visual, type-safe API simulation.
          </p>
        </header>

        <div className="border-border/40 grid grid-cols-1 border-t md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat) => {
            return (
              <article
                key={feat.title}
                className="border-border/40 bg-card/30 hover:bg-card/75 group relative flex flex-col justify-between space-y-4 border-b px-6 py-5 transition-[background-color,transform] duration-300 last:border-b-0 hover:-translate-y-1 sm:px-8 sm:py-6 md:border-r md:max-lg:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(3n)]:border-r-0 md:max-lg:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0"
              >
                <div>
                  <div className="mb-3.5 flex items-center justify-between gap-3">
                    <div
                      className={`flex size-10 items-center justify-center rounded-xl border ${feat.iconBg}`}
                    >
                      <PikaIcon
                        icon={feat.icon}
                        className={`size-4.5 ${feat.iconColor}`}
                        aria-hidden="true"
                      />
                    </div>

                    <span className="text-muted-foreground border-border/60 bg-muted/40 group-hover:border-border group-hover:text-foreground text-caption rounded-full border px-2.5 py-0.5 font-semibold transition-colors duration-300">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-foreground mb-1.5 text-base font-bold tracking-tight sm:text-lg">
                    {feat.title}
                  </h3>

                  <p className="text-muted-foreground group-hover:text-foreground/80 text-xs leading-relaxed transition-colors duration-300">
                    {feat.description}
                  </p>
                </div>

                <div className="border-border/40 border-t pt-3">
                  <Link
                    href="/dashboard"
                    className="bg-muted/40 group-hover:bg-foreground group-hover:text-background border-border/60 group-hover:border-foreground focus-visible:ring-ring/50 flex w-full cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2 text-xs font-bold shadow-xs transition-colors duration-300 focus-visible:ring-3 focus-visible:outline-none"
                  >
                    <span>
                      Explore feature
                      <span className="sr-only">: {feat.title}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="bg-background group-hover:bg-background/20 border-border/60 group-hover:border-background/30 flex size-5 shrink-0 items-center justify-center rounded border transition-colors"
                    >
                      <PikaIcon
                        icon={ArrowRightIcon}
                        className="text-foreground group-hover:text-background size-3 transition-transform duration-300 group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
