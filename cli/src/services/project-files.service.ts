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
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

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
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore unreadable .env.
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
 * Creates or updates `FACK_PROJECT_KEY` in the repository `.env` without
 * disturbing any other variable. Returns the relative path written.
 */
export function writeProjectKeyEnv(secretKey: string): string {
  const envPath = path.resolve(process.cwd(), ".env");
  const line = `FACK_PROJECT_KEY=${secretKey}`;

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, `# Fack API Local Runner\n${line}\n`, "utf-8");
    return ".env";
  }

  const content = fs.readFileSync(envPath, "utf-8");
  const pattern = /^[ \t]*FACK_PROJECT_KEY[ \t]*=.*$/m;

  if (pattern.test(content)) {
    fs.writeFileSync(envPath, content.replace(pattern, line), "utf-8");
    return ".env";
  }

  const separator = content.endsWith("\n") ? "\n" : "\n\n";
  fs.appendFileSync(
    envPath,
    `${separator}# Fack API Local Runner\n${line}\n`,
    "utf-8",
  );
  return ".env";
}

/** Resolves the bundle output path relative to the current directory. */
export function resolveBundleOutput(out?: string): string {
  return path.resolve(process.cwd(), out || "fack.enc");
}
