"use server";

import { cache } from "react";
import path from "node:path";
import { db, storageConnection } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateId, slugify, slugifyPath } from "@/lib/utils";
import { requireUserId } from "@/lib/auth";
import { assertProjectQuota } from "@/lib/services/quota.service";
import {
  associateProjectFile,
  markProjectDirty,
} from "@/lib/file-manager/dirty-tracker";
import { getDefaultProjectsDirectory } from "@/lib/file-manager/file-manager.service";
import {
  getCachedProjectBySlug,
  setCachedProjectBySlug,
  getCachedProjectsList,
  setCachedProjectsList,
  clearProjectCache,
} from "@/lib/cache";
import {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "@/lib/validators";
import { LoggerRegistry } from "@/lib/logger-registry";

const projectsTrace = LoggerRegistry.getTrace("db-projects");

export const getProjects = cache(async function getProjects(): Promise<
  (typeof projects.$inferSelect)[]
> {
  projectsTrace.traceCall("getProjects");

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return [];
  }

  const cached = getCachedProjectsList(userId);
  if (cached) {
    projectsTrace.traceSuccess(
      "getProjects (LRU cache hit)",
      `${cached.length} projects`,
    );
    return cached;
  }

  try {
    // The dashboard only needs counts and HTTP-method breakdowns. Selecting full
    // route rows pulled every `response_schema` blob (often several KB per route)
    // for every project on every dashboard load. Narrow projections keep the
    // same shape while shipping a fraction of the bytes.
    const list = await db.query.projects.findMany({
      where: userId === "system" ? undefined : eq(projects.userId, userId),
      orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
      with: {
        endpoints: {
          columns: { id: true },
          with: {
            routes: {
              columns: { method: true },
            },
          },
        },
      },
    });

    setCachedProjectsList(list, userId);
    projectsTrace.traceSuccess(
      "getProjects (DB fetched)",
      `${list.length} projects`,
    );
    return list;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("no such table: projects")) {
      console.warn(
        '[fack-api] Database schema is not initialized. Run "pnpm db:push" to create the required tables.',
      );
      projectsTrace.traceSuccess("getProjects (not initialized)", []);
      return [];
    }

    projectsTrace.traceError("getProjects", error);
    throw error;
  }
});

export const getProjectBySlug = cache(async function getProjectBySlug(
  slug: string,
): Promise<typeof projects.$inferSelect | undefined> {
  projectsTrace.traceCall("getProjectBySlug", slug);
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return undefined;
  }

  let project = getCachedProjectBySlug(slug);
  let cacheHit = true;

  if (!project) {
    cacheHit = false;
    try {
      // Callers only need the project row itself (name/slug/auth checks) and
      // fetch endpoints separately. Joining the whole endpoint/route graph here
      // loaded every `response_schema` blob on each first page view.
      project = await db.query.projects.findFirst({
        where: eq(projects.slug, slug),
      });

      if (project) {
        setCachedProjectBySlug(slug, project);
      }
    } catch (error) {
      projectsTrace.traceError("getProjectBySlug", error);
      throw error;
    }
  }

  if (
    project &&
    project.userId !== userId &&
    project.userId !== "system" &&
    userId !== "system"
  ) {
    projectsTrace.traceError(
      "getProjectBySlug",
      "Unauthorized access to project",
    );
    return undefined;
  }

  projectsTrace.traceSuccess(
    `getProjectBySlug (${cacheHit ? "cache hit" : "DB fetched"})`,
    project ? project.name : "undefined",
  );
  return project;
});

export const getProjectById = cache(async function getProjectById(
  id: string,
): Promise<typeof projects.$inferSelect | undefined> {
  projectsTrace.traceCall("getProjectById", id);
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return undefined;
  }

  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    });

    if (
      project &&
      project.userId !== userId &&
      project.userId !== "system" &&
      userId !== "system"
    ) {
      projectsTrace.traceError("getProjectById", "Unauthorized");
      return undefined;
    }

    projectsTrace.traceSuccess(
      "getProjectById",
      project ? project.name : "undefined",
    );
    return project;
  } catch (error) {
    projectsTrace.traceError("getProjectById", error);
    throw error;
  }
});

export async function createProject(
  input: CreateProjectInput,
): Promise<typeof projects.$inferSelect> {
  projectsTrace.traceCall("createProject", input.name, input.slug);
  const userId = await requireUserId();
  await assertProjectQuota(userId);

  try {
    const parsed = createProjectSchema.parse(input);
    const id = generateId();
    const rawSlug = parsed.slug
      ? slugifyPath(parsed.slug)
      : slugify(parsed.name);
    const slug = rawSlug || slugify(parsed.name);

    // Ensure slug uniqueness by appending a short suffix if needed
    const existing = await db.query.projects.findFirst({
      where: eq(projects.slug, slug),
    });
    const finalSlug = existing ? `${slug}-${generateId(4)}` : slug;

    const hasLogsDb = !!process.env.LOGS_POSTGRES_URL;

    const [project] = await db
      .insert(projects)
      .values({
        id,
        userId,
        name: parsed.name,
        slug: finalSlug,
        description: parsed.description ?? "",
        isLoggingEnabled: hasLogsDb,
        isCachingEnabled: parsed.isCachingEnabled ?? true,
      })
      .returning();

    if (storageConnection.features.fileManager) {
      const defaultPath = path.join(
        getDefaultProjectsDirectory(),
        `${project.slug}.fack`,
      );
      associateProjectFile(project.id, defaultPath);
      markProjectDirty(project.id);
    }

    clearProjectCache(project.id, project.slug);
    revalidatePath("/");
    projectsTrace.traceSuccess("createProject", project.name);
    return project;
  } catch (error) {
    projectsTrace.traceError("createProject", error);
    throw error;
  }
}

export async function updateProject(
  input: UpdateProjectInput,
): Promise<typeof projects.$inferSelect> {
  projectsTrace.traceCall("updateProject", input.id, input.name);
  const userId = await requireUserId();

  try {
    const parsed = updateProjectSchema.parse(input);
    const { id, ...updates } = parsed;

    const existing = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    });
    if (
      !existing ||
      (existing.userId !== userId &&
        existing.userId !== "system" &&
        userId !== "system")
    ) {
      throw new Error("Unauthorized");
    }

    if (updates.slug) {
      const normalizedSlug = slugifyPath(updates.slug);

      if (normalizedSlug === existing.slug) {
        updates.slug = normalizedSlug;
      } else {
        // createProject enforces slug uniqueness; renames must too, otherwise
        // two projects could share a slug and resolve ambiguously.
        const conflict = await db.query.projects.findFirst({
          where: eq(projects.slug, normalizedSlug),
        });
        updates.slug =
          conflict && conflict.id !== id
            ? `${normalizedSlug}-${generateId(4)}`
            : normalizedSlug;
      }
    }

    const hasLogsDb = !!process.env.LOGS_POSTGRES_URL;
    if (!hasLogsDb) {
      updates.isLoggingEnabled = false;
    }

    const [project] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    if (storageConnection.features.fileManager) {
      markProjectDirty(project.id);
    }

    // projectBySlugCache is keyed by slug, so evict both the previous and the
    // new slug; otherwise the project keeps resolving under its old slug.
    clearProjectCache(project.id, project.slug);
    if (existing.slug !== project.slug) {
      clearProjectCache(project.id, existing.slug);
    }
    revalidatePath("/");
    projectsTrace.traceSuccess("updateProject", project.name);
    return project;
  } catch (error) {
    projectsTrace.traceError("updateProject", error);
    throw error;
  }
}

export async function deleteProject(id: string): Promise<void> {
  projectsTrace.traceCall("deleteProject", id);
  const userId = await requireUserId();

  try {
    const existing = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    });

    if (
      !existing ||
      (existing.userId !== userId &&
        existing.userId !== "system" &&
        userId !== "system")
    ) {
      throw new Error("Unauthorized");
    }

    await db.delete(projects).where(eq(projects.id, id));
    if (existing) {
      clearProjectCache(id, existing.slug);
    }
    revalidatePath("/");
    projectsTrace.traceSuccess("deleteProject", "void");
  } catch (error) {
    projectsTrace.traceError("deleteProject", error);
    throw error;
  }
}
