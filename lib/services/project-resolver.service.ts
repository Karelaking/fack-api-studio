import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { projects, type Project } from "@/db/schema";
import {
  getCachedProjectBySlug,
  setCachedProjectBySlug,
  isNegativeSlug,
  setNegativeSlug,
} from "@/lib/cache";
import { LoggerRegistry } from "@/lib/logger-registry";

export interface ProjectResolution {
  project: Project;
  matchedSlug: string;
  requestPath: string;
}

const projectResolverLogger = LoggerRegistry.get("mock");

function getCandidateSlugs(slugSegments: string[]): string[] {
  const candidates: string[] = [];
  for (let index = slugSegments.length; index > 0; index -= 1) {
    candidates.push(slugSegments.slice(0, index).join("/"));
  }
  return candidates;
}

function createResolution(
  project: Project,
  matchedSlug: string,
  slugSegments: string[],
): ProjectResolution {
  const segmentCount = matchedSlug.split("/").length;
  return {
    project,
    matchedSlug,
    requestPath: "/" + slugSegments.slice(segmentCount).join("/"),
  };
}

/**
 * Resolves the longest project namespace prefix from a mock request path.
 * Cache lookup is attempted for every candidate before issuing one batched query.
 */
export async function resolveProjectFromSlug(
  slugSegments: string[],
): Promise<ProjectResolution | null> {
  const sanitizedSegments = slugSegments.filter(Boolean);
  const candidates = getCandidateSlugs(sanitizedSegments);

  // Check positive cache first
  for (const candidate of candidates) {
    const cachedProject = getCachedProjectBySlug(candidate);
    if (cachedProject) {
      projectResolverLogger.debug(
        `Resolved project slug from cache: ${candidate}`,
      );
      return createResolution(cachedProject, candidate, sanitizedSegments);
    }
  }

  // Filter out candidates already verified as non-existent (Negative Caching / Penetration Defense)
  const activeCandidates = candidates.filter(
    (candidate) => !isNegativeSlug(candidate),
  );

  if (activeCandidates.length === 0) {
    return null;
  }

  const foundProjects = await db.query.projects.findMany({
    where: inArray(projects.slug, activeCandidates),
  });

  const foundProjectSlugs = new Set(foundProjects.map((p) => p.slug));

  for (const candidate of activeCandidates) {
    const project = foundProjects.find(
      (foundProject) => foundProject.slug === candidate,
    );
    if (project) {
      projectResolverLogger.info(
        `Resolved project slug (DB batch): ${project.slug}`,
      );
      setCachedProjectBySlug(candidate, project);
      return createResolution(project, candidate, sanitizedSegments);
    }
  }

  // Record verified misses in negative slug cache to protect DB under sustained scanner load
  for (const candidate of activeCandidates) {
    if (!foundProjectSlugs.has(candidate)) {
      setNegativeSlug(candidate);
    }
  }

  return null;
}
