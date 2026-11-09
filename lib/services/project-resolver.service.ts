import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { projects, type Project } from "@/db/schema";
import {
  getCachedMockProject,
  setCachedMockProject,
  isNegativeSlug,
  setNegativeSlug,
} from "@/lib/cache";
import {
  getSharedValues,
  setSharedValue,
  sharedKeys,
} from "@/lib/cache/shared-store";
import { recordCacheHit, recordCacheMiss } from "@/lib/metrics";
import { singleFlight } from "@/lib/utils/single-flight";
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

  // Check the process-local cache first
  for (const candidate of candidates) {
    const cachedProject = getCachedMockProject(candidate);
    if (cachedProject) {
      projectResolverLogger.debug(
        `Resolved project slug from cache: ${candidate}`,
      );
      return createResolution(cachedProject, candidate, sanitizedSegments);
    }
  }

  // Then the shared cache, in one MGET for every candidate prefix.
  const sharedProjects = await getSharedValues<Project>(
    candidates.map((candidate) => sharedKeys.mockProjectBySlug(candidate)),
  );

  for (let index = 0; index < candidates.length; index += 1) {
    const project = sharedProjects[index];
    if (project) {
      recordCacheHit("shared:mock-project");
      setCachedMockProject(candidates[index], project);
      projectResolverLogger.debug(
        `Resolved project slug from shared cache: ${candidates[index]}`,
      );
      return createResolution(project, candidates[index], sanitizedSegments);
    }
  }
  recordCacheMiss("shared:mock-project");

  // Filter out candidates already verified as non-existent (Negative Caching /
  // Penetration Defense), locally and across instances.
  const locallyActive = candidates.filter(
    (candidate) => !isNegativeSlug(candidate),
  );

  if (locallyActive.length === 0) {
    return null;
  }

  const sharedNegatives = await getSharedValues<boolean>(
    locallyActive.map((candidate) => sharedKeys.negativeSlug(candidate)),
  );

  const activeCandidates = locallyActive.filter(
    (_candidate, index) => sharedNegatives[index] !== true,
  );

  if (activeCandidates.length === 0) {
    return null;
  }

  const { foundProjects, foundProjectSlugs } = await singleFlight(
    `resolve-slug:${activeCandidates.join("|")}`,
    async () => {
      const rows = await db.query.projects.findMany({
        where: inArray(projects.slug, activeCandidates),
      });
      return {
        foundProjects: rows,
        foundProjectSlugs: new Set(rows.map((project) => project.slug)),
      };
    },
  );

  for (const candidate of activeCandidates) {
    const project = foundProjects.find(
      (foundProject) => foundProject.slug === candidate,
    );
    if (project) {
      projectResolverLogger.info(
        `Resolved project slug (DB batch): ${project.slug}`,
      );
      setCachedMockProject(candidate, project);
      await setSharedValue(
        sharedKeys.mockProjectBySlug(candidate),
        project,
        10 * 60,
      );
      return createResolution(project, candidate, sanitizedSegments);
    }
  }

  // Record verified misses in both negative caches to protect the database
  // under sustained scanner load.
  for (const candidate of activeCandidates) {
    if (!foundProjectSlugs.has(candidate)) {
      setNegativeSlug(candidate);
      await setSharedValue(sharedKeys.negativeSlug(candidate), true, 30);
    }
  }

  return null;
}
