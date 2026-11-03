/**
 * Shared utility for parsing and standardizing project slugs and URLs.
 *
 * Given a URL like `/projects/api/v1/canvas`, the `[...slug]` param yields
 * `["api", "v1", "canvas"]`. This utility separates the project slug from the
 * subpage identifier, normalizing away any double slashes or malformed segments.
 */

import type { Route } from "next";

export const PROJECT_SUBPAGES = [
  "canvas",
  "endpoints",
  "logs",
  "notes",
  "settings",
] as const;

export type ProjectSubpage = (typeof PROJECT_SUBPAGES)[number];

const SUBPAGE_SET = new Set<string>(PROJECT_SUBPAGES);

export interface ParsedProjectPath {
  /** The reconstructed project slug (e.g. "api/v1") */
  projectSlug: string;
  /** The active subpage, or empty string if none matched */
  subpage: ProjectSubpage | "";
}

/**
 * Strips leading, trailing, and duplicate slashes from a slug or path.
 *
 * @example
 * normalizeSlug("/the-project-slug//") → "the-project-slug"
 * normalizeSlug("//api///v1//")       → "api/v1"
 */
export function normalizeSlug(slug: string): string {
  if (!slug) return "";
  return slug.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\/+/g, "/");
}

/**
 * Constructs a standardized, single-slash project URL for a given slug and subpage tab.
 *
 * @param slug - The project slug
 * @param subpage - The subpage tab (defaults to "canvas")
 * @returns Clean path like `/projects/my-api/canvas`
 */
export function getProjectUrl(slug: string, subpage: string = "canvas"): Route {
  const cleanSlug = normalizeSlug(slug);
  const cleanTab = SUBPAGE_SET.has(subpage) ? subpage : "canvas";
  return `/projects/${cleanSlug}/${cleanTab}` as Route;
}

/**
 * Checks whether a given string is a valid project subpage.
 */
export function isProjectSubpage(subpage: string): subpage is ProjectSubpage {
  return SUBPAGE_SET.has(subpage);
}

/**
 * Parses the catch-all slug segments into a sanitized project slug and subpage.
 * Automatically filters out any empty or duplicate segments caused by double slashes.
 *
 * @example
 * parseProjectPath(["api", "v1", "canvas"]) → { projectSlug: "api/v1", subpage: "canvas" }
 * parseProjectPath(["", "demo", ""])         → { projectSlug: "demo",   subpage: "" }
 * parseProjectPath(["demo", "settings"])    → { projectSlug: "demo",   subpage: "settings" }
 */
export function parseProjectPath(slugSegments: string[]): ParsedProjectPath {
  if (!slugSegments || slugSegments.length === 0) {
    return { projectSlug: "", subpage: "" };
  }

  // Filter empty string segments caused by consecutive slashes (e.g. "//")
  const sanitizedSegments = slugSegments.map((s) => s.trim()).filter(Boolean);
  if (sanitizedSegments.length === 0) {
    return { projectSlug: "", subpage: "" };
  }

  const lastSegment = sanitizedSegments[sanitizedSegments.length - 1];

  if (SUBPAGE_SET.has(lastSegment)) {
    return {
      projectSlug: sanitizedSegments.slice(0, -1).join("/"),
      subpage: lastSegment as ProjectSubpage,
    };
  }

  return {
    projectSlug: sanitizedSegments.join("/"),
    subpage: "",
  };
}
