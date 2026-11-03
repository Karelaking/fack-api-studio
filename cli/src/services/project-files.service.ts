/**
 * Fack CLI — repository-local configuration.
 *
 * `.env` holds the project decryption key the runner needs; `.fackrc.json`
 * remembers which project and Studio this directory belongs to.
 */

import fs from "node:fs";
import path from "node:path";

export interface FackRc {
  projectSlug?: string;
  projectId?: string;
  studioUrl?: string;
  port?: number;
  [key: string]: unknown;
}

export function loadLocalEnv(): void {
  const envFiles = [".env", ".env.local"];
  for (const filename of envFiles) {
    const envPath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(envPath)) continue;

    try {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex <= 0) continue;

        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    } catch {
      // Ignore unreadable environment file.
    }
  }
}

export function loadFackRc(): FackRc {
  const configPath = path.resolve(process.cwd(), ".fackrc.json");
  if (!fs.existsSync(configPath)) return {};

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8")) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as FackRc) : {};
  } catch {
    return {};
  }
}

/** Merges a patch into `.fackrc.json` and returns the relative path written. */
export function writeFackRc(patch: Partial<FackRc>): string {
  const configPath = path.resolve(process.cwd(), ".fackrc.json");
  const current = loadFackRc();
  const next: FackRc = {
    ...current,
    ...patch,
    port: patch.port ?? current.port ?? 4000,
  };

  fs.writeFileSync(configPath, `${JSON.stringify(next, null, 4)}\n`, "utf-8");
  return ".fackrc.json";
}

/**
 * Ensures sensitive files (like .env and .env.local) are listed in .gitignore
 * to prevent accidental repository secret leaks.
 */
export function ensureGitIgnoreEntry(entry: string): void {
  const gitignorePath = path.resolve(process.cwd(), ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    try {
      fs.writeFileSync(gitignorePath, `${entry}\n`, "utf-8");
    } catch {
      // Best-effort
    }
    return;
  }

  try {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    const lines = content.split("\n").map((line) => line.trim());
    if (!lines.includes(entry)) {
      const separator = content.endsWith("\n") ? "" : "\n";
      fs.appendFileSync(gitignorePath, `${separator}${entry}\n`, "utf-8");
    }
  } catch {
    // Best-effort
  }
}

/**
 * Creates or updates `FACK_PROJECT_KEY` in the repository `.env` without
 * disturbing any other variable. Returns the relative path written.
 */
export function writeProjectKeyEnv(secretKey: string): string {
  const localEnvExists = fs.existsSync(
    path.resolve(process.cwd(), ".env.local"),
  );
  const targetEnv = localEnvExists ? ".env.local" : ".env";
  const envPath = path.resolve(process.cwd(), targetEnv);
  const line = `FACK_PROJECT_KEY=${secretKey}`;

  // Automatically protect .env file from accidental git commits
  ensureGitIgnoreEntry(targetEnv);

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, `# Fack API Local Runner\n${line}\n`, "utf-8");
    return targetEnv;
  }

  const content = fs.readFileSync(envPath, "utf-8");
  const pattern = /^[ \t]*FACK_PROJECT_KEY[ \t]*=.*$/m;

  if (pattern.test(content)) {
    fs.writeFileSync(envPath, content.replace(pattern, line), "utf-8");
    return targetEnv;
  }

  const separator = content.endsWith("\n") ? "\n" : "\n\n";
  fs.appendFileSync(
    envPath,
    `${separator}# Fack API Local Runner\n${line}\n`,
    "utf-8",
  );
  return targetEnv;
}

/** Resolves the bundle output path relative to the current directory. */
export function resolveBundleOutput(out?: string): string {
  return path.resolve(process.cwd(), out || "fack.enc");
}
