/**
 * Fack CLI — credential storage.
 *
 * One session per Studio URL lives in the OS config directory, never in the
 * repository. Files are written with owner-only permissions where the platform
 * supports it.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface StoredCliSession {
  studioUrl: string;
  token: string;
  tokenPrefix: string;
  deviceName: string;
  platform: string;
  createdAt: string;
  userId?: string;
}

interface CredentialsFile {
  version: 1;
  sessions: Record<string, StoredCliSession>;
}

const EMPTY_STORE: CredentialsFile = { version: 1, sessions: {} };

export function normalizeStudioUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

export function defaultStudioUrl(): string {
  return normalizeStudioUrl(
    process.env.FACK_STUDIO_URL || "http://localhost:3000",
  );
}

export function resolveStudioUrl(explicit?: string): string {
  if (explicit?.trim()) return normalizeStudioUrl(explicit);
  if (process.env.FACK_STUDIO_URL?.trim()) return defaultStudioUrl();
  return defaultStudioUrl();
}

export function credentialsDirectory(): string {
  if (process.env.FACK_CONFIG_DIR?.trim()) {
    return path.resolve(process.env.FACK_CONFIG_DIR.trim());
  }

  if (process.platform === "win32") {
    const appData =
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "fack");
  }

  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "fack");
  }

  const configHome =
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "fack");
}

export function credentialsPath(): string {
  return path.join(credentialsDirectory(), "credentials.json");
}

function readStore(): CredentialsFile {
  try {
    const raw = fs.readFileSync(credentialsPath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<CredentialsFile>;
    if (!parsed || typeof parsed !== "object" || !parsed.sessions) {
      return { ...EMPTY_STORE };
    }
    return { version: 1, sessions: parsed.sessions };
  } catch {
    return { ...EMPTY_STORE };
  }
}

function writeStore(store: CredentialsFile): void {
  const directory = credentialsDirectory();
  fs.mkdirSync(directory, { recursive: true });

  const target = credentialsPath();
  const temporary = `${target}.${process.pid}.tmp`;
  const body = `${JSON.stringify(store, null, 2)}\n`;

  fs.writeFileSync(temporary, body, { encoding: "utf-8", mode: 0o600 });
  try {
    fs.renameSync(temporary, target);
  } catch {
    // Windows cannot always replace an existing file atomically.
    fs.rmSync(target, { force: true });
    fs.renameSync(temporary, target);
  }

  try {
    fs.chmodSync(target, 0o600);
  } catch {
    // Permission bits are best-effort on Windows.
  }
}

export function getSession(studioUrl: string): StoredCliSession | undefined {
  const key = normalizeStudioUrl(studioUrl);
  return readStore().sessions[key];
}

export function getAnySession(): StoredCliSession | undefined {
  const sessions = Object.values(readStore().sessions);
  return sessions.sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  )[0];
}

export function saveSession(session: StoredCliSession): string {
  const studioUrl = normalizeStudioUrl(session.studioUrl);
  const store = readStore();
  store.sessions[studioUrl] = { ...session, studioUrl };
  writeStore(store);
  return studioUrl;
}

export function deleteSession(studioUrl: string): boolean {
  const key = normalizeStudioUrl(studioUrl);
  const store = readStore();
  if (!store.sessions[key]) return false;
  delete store.sessions[key];
  writeStore(store);
  return true;
}

/** A token supplied by CI overrides the on-disk session. */
export function environmentToken(): string | undefined {
  const token = process.env.FACK_TOKEN?.trim();
  return token && token.length > 0 ? token : undefined;
}
