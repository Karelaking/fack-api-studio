/**
 * Fack CLI - Init Command
 *
 * One-command onboarding: sign in when the Studio requires it, choose a
 * project, pull the encrypted bundle, and provision `.env` and `.fackrc.json`.
 */

import path from "node:path";

import type { CliProject } from "../services/api-client.service";
import type { InitCommandOptions } from "../cli.type";
import { runLogin } from "./login.command";
import {
  describeNetworkError,
  FackApiClient,
  isUnauthorized,
} from "../services/api-client.service";
import { selectProject } from "../services/project-selection.service";
import { loadFackRc, loadLocalEnv } from "../services/project-files.service";
import { pullProjectBundle } from "../services/pull.service";
import { resolveCliSession } from "../services/session.service";
import { formatBytes, log, printCommand, t } from "../ui/terminal";

export async function runInit(options: InitCommandOptions): Promise<void> {
  loadLocalEnv();
  const rc = loadFackRc();
  let session = resolveCliSession({
    url: options.url,
    preferredUrl: rc.studioUrl,
  });
  let client = new FackApiClient(session.studioUrl, session.token);

  let projects: CliProject[];
  try {
    projects = (await client.listProjects()).projects;
  } catch (error: unknown) {
    if (!isUnauthorized(error)) {
      log.error(describeNetworkError(error, session.studioUrl));
      process.exitCode = 1;
      return;
    }

    if (session.token) {
      log.error("This terminal's credential is invalid, revoked, or expired.");
      log.muted("Run `fack login` to authorize it again.");
      process.exitCode = 1;
      return;
    }

    log.info("This Studio requires sign-in. Starting `fack login`...");
    await runLogin({ url: session.studioUrl });

    session = resolveCliSession({ url: session.studioUrl });
    if (!session.token) {
      log.error("Sign-in did not complete, so setup stopped.");
      process.exitCode = 1;
      return;
    }

    client = new FackApiClient(session.studioUrl, session.token);
    try {
      projects = (await client.listProjects()).projects;
    } catch (retryError: unknown) {
      log.error(describeNetworkError(retryError, session.studioUrl));
      process.exitCode = 1;
      return;
    }
  }

  let project: CliProject;
  try {
    project = await selectProject(
      projects,
      options.projectSlug || rc.projectSlug,
    );
  } catch (error: unknown) {
    log.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  log.info(`Setting up ${t.bold(project.name)} (${project.slug})...`);

  try {
    const result = await pullProjectBundle(client, {
      project,
      studioUrl: session.studioUrl,
      out: options.out,
      fallbackKey: options.key || process.env.FACK_PROJECT_KEY,
    });

    const displayedOut =
      path.relative(process.cwd(), result.outFile) || result.outFile;

    console.log("");
    log.success(
      `Saved ${t.bold(displayedOut)} ${t.dim(
        `(${formatBytes(result.bytes)})`,
      )}`,
    );
    if (result.envPath) {
      log.success(`Wrote FACK_PROJECT_KEY to ${result.envPath}`);
    } else {
      log.warn(
        "No project key was returned; set FACK_PROJECT_KEY manually before `fack dev`.",
      );
    }
    log.success(`Remembered ${project.slug} in ${result.rcPath}`);

    console.log("");
    log.info(t.bold("Setup complete."));
    console.log("");
    printCommand("fack dev");
    console.log("");
    log.muted(
      "The local runner serves your mock API on http://localhost:4000.",
    );
    console.log("");
  } catch (error: unknown) {
    if (isUnauthorized(error)) {
      log.error("Fack Studio rejected this terminal's credential.");
      log.muted("Run `fack login` and try again.");
    } else {
      log.error(describeNetworkError(error, session.studioUrl));
    }
    process.exitCode = 1;
  }
}
