import path from "node:path";
import fs from "node:fs";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { resolveDataDir } from "@/lib/storage/data-dir";
import {
  readFackFile,
  writeFackFile,
  deserializeProject,
  serializeProject,
} from "./fack-io";
import { addRecentFile } from "./recents-store";
import {
  associateProjectFile,
  getProjectFilePath,
  getProjectLastSavedAt,
  isProjectDirty,
  markProjectClean,
} from "./dirty-tracker";
import type { FackProjectFile, OpenProjectSummary } from "./types";

/**
 * Returns a recommended default directory on this machine for saving `.fack` files.
 */
export function getDefaultProjectsDirectory(): string {
  const dir = path.join(resolveDataDir(), "projects");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Opens a `.fack` file from disk, imports its data into SQLite,
 * records it in recent files, and associates the file path.
 */
export async function openProjectFile(
  filePath: string,
): Promise<{ project: schema.Project; fackFile: FackProjectFile }> {
  const resolvedPath = path.resolve(filePath);
  const fackFile = await readFackFile(resolvedPath);

  const { project } = await deserializeProject(fackFile);

  // Mark clean and associate file
  associateProjectFile(project.id, resolvedPath, fackFile.savedAt);
  markProjectClean(project.id, fackFile.savedAt);

  // Record in recent files
  addRecentFile(resolvedPath, project.name, project.slug, fackFile.savedAt);

  return { project, fackFile };
}

/**
 * Saves a project from SQLite out to a `.fack` file on disk.
 * If targetPath is not provided, uses the already associated file path.
 */
export async function saveProjectToFile(
  projectId: string,
  targetPath?: string,
): Promise<{ filePath: string; savedAt: string }> {
  const resolvedPath =
    targetPath ||
    getProjectFilePath(projectId) ||
    path.join(getDefaultProjectsDirectory(), `${projectId}.fack`);

  const fullPath = path.resolve(resolvedPath);
  const serialized = await serializeProject(projectId, fullPath);

  await writeFackFile(fullPath, serialized);

  const savedAt = serialized.savedAt;
  associateProjectFile(projectId, fullPath, savedAt);
  markProjectClean(projectId, savedAt);

  // Update recent entry
  addRecentFile(
    fullPath,
    serialized.project.name,
    serialized.project.slug,
    savedAt,
  );

  return { filePath: fullPath, savedAt };
}

/**
 * Retrieves the live summary of all projects currently loaded in the database,
 * along with their file association and dirty state.
 */
export async function getOpenProjectsSummary(): Promise<OpenProjectSummary[]> {
  const projects = await db.query.projects.findMany({
    with: {
      endpoints: {
        with: {
          routes: true,
        },
      },
    },
  });

  return projects.map((proj) => {
    let routeCount = 0;
    for (const ep of proj.endpoints) {
      routeCount += ep.routes.length;
    }

    return {
      projectId: proj.id,
      name: proj.name,
      slug: proj.slug,
      description: proj.description ?? "",
      filePath: getProjectFilePath(proj.id),
      isDirty: isProjectDirty(proj.id),
      lastSavedAt: getProjectLastSavedAt(proj.id),
      endpointCount: proj.endpoints.length,
      routeCount,
    };
  });
}
