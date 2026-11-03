/**
 * Fack CLI — authenticated bundle pull.
 *
 * Shared by `fack pull` and `fack init`: download once, save the encrypted
 * bundle, remember the project in `.fackrc.json`, and provision the project key
 * in `.env` so the runner works immediately after.
 */

import fs from "node:fs";

import type { CliProject, FackApiClient } from "./api-client.service";
import {
  loadFackRc,
  resolveBundleOutput,
  writeFackRc,
  writeProjectKeyEnv,
} from "./project-files.service";

export interface PullProjectOptions {
  project: CliProject;
  studioUrl: string;
  out?: string;
  fallbackKey?: string;
}

export interface PullProjectResult {
  outFile: string;
  rcPath: string;
  envPath?: string;
  bytes: number;
  projectKey?: string;
  projectName: string;
  projectSlug: string;
}

export async function pullProjectBundle(
  client: FackApiClient,
  options: PullProjectOptions,
): Promise<PullProjectResult> {
  const existing = loadFackRc();
  const download = await client.downloadBundle(
    options.project.slug,
    options.fallbackKey,
  );

  const outFile = resolveBundleOutput(options.out);
  fs.writeFileSync(outFile, download.bytes);

  const rcPath = writeFackRc({
    projectSlug: options.project.slug,
    projectId: download.projectId ?? options.project.id,
    studioUrl: options.studioUrl,
    port: existing.port ?? 4000,
  });

  const projectKey = download.projectKey ?? options.fallbackKey;
  const envPath = projectKey ? writeProjectKeyEnv(projectKey) : undefined;

  return {
    outFile,
    rcPath,
    envPath,
    bytes: download.bytes.length,
    projectKey,
    projectName: download.projectName ?? options.project.name,
    projectSlug: download.projectSlug ?? options.project.slug,
  };
}
