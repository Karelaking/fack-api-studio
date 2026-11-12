"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitBranchIcon,
  GraphTrendLineIcon,
  FilterHorizontalIcon,
  ClockIcon,
  PencilEditIcon,
} from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { getProjectUrl } from "@/lib/utils/project-slug";

export function MobileBottomNav(): React.JSX.Element | null {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "projects" || segments.length < 2) return null;

  const lastSegment = segments[segments.length - 1];
  const subpages = new Set([
    "canvas",
    "endpoints",
    "logs",
    "notes",
    "settings",
  ]);

  let activeTab = "canvas";
  let projectSlugSegments = segments.slice(1);

  if (subpages.has(lastSegment)) {
    activeTab = lastSegment;
    projectSlugSegments = segments.slice(1, -1);
  }

  const projectSlug = projectSlugSegments.join("/");

  const tabs = [
    {
      name: "Canvas",
      href: getProjectUrl(projectSlug, "canvas") as Route,
      icon: GitBranchIcon,
    },
    {
      name: "Endpoints",
      href: getProjectUrl(projectSlug, "endpoints") as Route,
      icon: GraphTrendLineIcon,
    },
    {
      name: "Logs",
      href: getProjectUrl(projectSlug, "logs") as Route,
      icon: ClockIcon,
    },
    {
      name: "Notes",
      href: getProjectUrl(projectSlug, "notes") as Route,
      icon: PencilEditIcon,
    },
    {
      name: "Settings",
      href: getProjectUrl(projectSlug, "settings") as Route,
      icon: FilterHorizontalIcon,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="bg-card/85 border-border fixed right-0 bottom-0 left-0 z-40 flex h-16 items-center justify-around border-t pt-0 pr-[max(1rem,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] pl-[max(1rem,env(safe-area-inset-left))] backdrop-blur-md select-none md:hidden"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name.toLowerCase();

        return (
          <Link
            key={tab.name}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex h-full flex-1 flex-col items-center justify-center gap-1 text-mini font-bold transition-[color,transform] duration-200 ease-out active:scale-95",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "bg-primary absolute inset-x-4 top-0 h-0.5 rounded-full transition-opacity duration-200",
                isActive ? "opacity-100" : "opacity-0",
              )}
            />
            <PikaIcon
              icon={tab.icon}
              className="size-6 shrink-0"
              aria-hidden="true"
            />
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
