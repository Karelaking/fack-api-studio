import fs from "node:fs";
import path from "node:path";
import { ensureDataDir } from "@/lib/storage/data-dir";

interface ProjectFileMapping {
  projectId: string;
  filePath: string;
  lastSavedAt: string | null;
}

function projectFilesConfigPath(): string {
  return path.join(ensureDataDir(), "config", "project-files.json");
}

function loadProjectFiles(): Map<
  string,
  { filePath: string; lastSavedAt: string | null }
> {
  const map = new Map<
    string,
    { filePath: string; lastSavedAt: string | null }
  >();
  try {
    const file = projectFilesConfigPath();
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf-8");
      const list = JSON.parse(raw) as ProjectFileMapping[];
      for (const item of list) {
        map.set(item.projectId, {
          filePath: item.filePath,
          lastSavedAt: item.lastSavedAt,
        });
      }
    }
  } catch {
    // Missing or invalid
  }
  return map;
}

function saveProjectFiles(
  map: Map<string, { filePath: string; lastSavedAt: string | null }>,
): void {
  try {
    const file = projectFilesConfigPath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const list: ProjectFileMapping[] = Array.from(map.entries()).map(
      ([projectId, info]) => ({
        projectId,
        filePath: info.filePath,
        lastSavedAt: info.lastSavedAt,
      }),
    );
    const tempFile = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(list, null, 2), "utf-8");
    fs.renameSync(tempFile, file);
  } catch {
    // Ignore config write failures
  }
}

// In-memory singletons across hot-reloads
const globalForTracker = globalThis as unknown as {
  __fackDirtyProjects?: Set<string>;
  __fackProjectFiles?: Map<
    string,
    { filePath: string; lastSavedAt: string | null }
  >;
};

const dirtyProjects = globalForTracker.__fackDirtyProjects ?? new Set<string>();
const projectFiles = globalForTracker.__fackProjectFiles ?? loadProjectFiles();

if (process.env.NODE_ENV !== "production") {
  globalForTracker.__fackDirtyProjects = dirtyProjects;
  globalForTracker.__fackProjectFiles = projectFiles;
}

export function markProjectDirty(projectId: string): void {
  dirtyProjects.add(projectId);
}

export function markProjectClean(
  projectId: string,
  lastSavedAt = new Date().toISOString(),
): void {
  dirtyProjects.delete(projectId);
  const existing = projectFiles.get(projectId);
  if (existing) {
    existing.lastSavedAt = lastSavedAt;
    saveProjectFiles(projectFiles);
  }
}

export function isProjectDirty(projectId: string): boolean {
  return dirtyProjects.has(projectId);
}

export function associateProjectFile(
  projectId: string,
  filePath: string,
  lastSavedAt: string | null = null,
): void {
  projectFiles.set(projectId, {
    filePath: path.resolve(filePath),
    lastSavedAt,
  });
  saveProjectFiles(projectFiles);
}

export function disassociateProjectFile(projectId: string): void {
  projectFiles.delete(projectId);
  dirtyProjects.delete(projectId);
  saveProjectFiles(projectFiles);
}

export function getProjectFilePath(projectId: string): string | null {
  return projectFiles.get(projectId)?.filePath ?? null;
}

export function getProjectLastSavedAt(projectId: string): string | null {
  return projectFiles.get(projectId)?.lastSavedAt ?? null;
}

export function getAllProjectFiles(): Array<{
  projectId: string;
  filePath: string;
  lastSavedAt: string | null;
  isDirty: boolean;
}> {
  return Array.from(projectFiles.entries()).map(([projectId, info]) => ({
    projectId,
    filePath: info.filePath,
    lastSavedAt: info.lastSavedAt,
    isDirty: dirtyProjects.has(projectId),
  }));
}
