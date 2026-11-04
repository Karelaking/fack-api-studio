"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiGitBranchLine,
  RiPulseLine,
  RiFileHistoryLine,
  RiStickyNoteLine,
  RiSettings2Line,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import { getProjectUrl } from "@/lib/utils/project-slug";

interface ProjectSectionMenuProps {
  projectSlug: string;
}

const SECTIONS = [
  { name: "Canvas", path: "canvas", icon: RiGitBranchLine },
  { name: "Endpoints", path: "endpoints", icon: RiPulseLine },
  { name: "Logs", path: "logs", icon: RiFileHistoryLine },
  { name: "Notes", path: "notes", icon: RiStickyNoteLine },
  { name: "Settings", path: "settings", icon: RiSettings2Line },
] as const;

/**
 * Top navigation bar section menu for switching between project views.
 *
 * Replaces the old vertical Project Menu in the left sidebar, freeing the left
 * sidebar to serve exclusively as the Mock Data Provider Catalog.
 */
export const ProjectSectionMenu = ({
  projectSlug,
}: ProjectSectionMenuProps): React.JSX.Element => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Project sections"
      className="hidden items-center gap-1 sm:flex"
    >
      {SECTIONS.map((section) => {
        const Icon = section.icon;
        const isActive = pathname.endsWith(`/${section.path}`);

        return (
          <Link
            key={section.path}
            href={getProjectUrl(projectSlug, section.path)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-secondary text-secondary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{section.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default ProjectSectionMenu;
