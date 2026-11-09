import fs from "node:fs";
import path from "node:path";
import { ensureDataDir } from "@/lib/storage/data-dir";
import type { RecentFileEntry } from "./types";

const MAX_RECENTS = 20;

function recentsFilePath(): string {
  return path.join(ensureDataDir(), "config", "recents.json");
}

export function readRecents(): RecentFileEntry[] {
  try {
    const file = recentsFilePath();
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as RecentFileEntry[];
    }
  } catch {
    // Missing or invalid recents file
  }
  return [];
}

export function writeRecents(recents: RecentFileEntry[]): void {
  const file = recentsFilePath();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempFile = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(recents, null, 2), "utf-8");
  fs.renameSync(tempFile, file);
}

export function addRecentFile(
  filePath: string,
  projectName: string,
  slug: string,
  lastSavedAt: string | null = null,
): RecentFileEntry {
  const resolved = path.resolve(filePath);
  const fileName = path.basename(resolved);

  let fileSizeBytes = 0;
  try {
    fileSizeBytes = fs.statSync(resolved).size;
  } catch {
    fileSizeBytes = 0;
  }

  const existing = readRecents();
  const filtered = existing.filter(
    (item) => path.resolve(item.filePath) !== resolved,
  );

  const newEntry: RecentFileEntry = {
    id: resolved,
    filePath: resolved,
    fileName,
    projectName,
    slug,
    lastOpenedAt: new Date().toISOString(),
    lastSavedAt,
    fileSizeBytes,
  };

  const updated = [newEntry, ...filtered].slice(0, MAX_RECENTS);
  writeRecents(updated);
  return newEntry;
}

export function removeRecentFile(filePath: string): void {
  const resolved = path.resolve(filePath);
  const existing = readRecents();
  const updated = existing.filter(
    (item) => path.resolve(item.filePath) !== resolved,
  );
  writeRecents(updated);
}

export function clearRecentFiles(): void {
  writeRecents([]);
}
