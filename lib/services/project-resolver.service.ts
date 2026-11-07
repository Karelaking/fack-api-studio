import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { projects, type Project } from "@/db/schema";
import {
  getCachedMockProject,
  setCachedMockProject,
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

/**
 * Project slugs are validated at <= 100 characters, so at most ~50 single
 * character segments can ever form one. Capping the candidate prefixes stops a
 * deep (or malicious) mock URL from allocating thousands of strings, doing
 * thousands of cache lookups, and issuing an `IN (...)` with thousands of
 * parameters on every cache miss.
 */
const MAX_CANDIDATE_SEGMENTS = 51;
const MAX_SLUG_LENGTH = 100;

function getCandidateSlugs(slugSegments: string[]): string[] {
  const candidates: string[] = [];
  const startIndex = Math.min(slugSegments.length, MAX_CANDIDATE_SEGMENTS);
  for (let index = startIndex; index > 0; index -= 1) {
    const candidate = slugSegments.slice(0, index).join("/");
    if (candidate.length <= MAX_SLUG_LENGTH) {
      candidates.push(candidate);
    }
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
    const cachedProject = getCachedMockProject(candidate);
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
      setCachedMockProject(candidate, project);
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
