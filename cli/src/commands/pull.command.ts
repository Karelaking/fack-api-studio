/**
 * Fack CLI - Pull Command
 *
 * Pulls the latest encrypted bundle from Fack Studio. When a terminal is
 * signed in, the project is selected automatically and the project key is
 * provisioned for the local runner.
 */

import path from "node:path";

import type { CliProject } from "../services/api-client.service";
import type { PullCommandOptions } from "../cli.type";
import {
  describeNetworkError,
  FackApiClient,
  isUnauthorized,
} from "../services/api-client.service";
import { selectProject } from "../services/project-selection.service";
import { loadFackRc, loadLocalEnv } from "../services/project-files.service";
import { pullProjectBundle } from "../services/pull.service";
import { resolveCliSession } from "../services/session.service";
import { formatBytes, log, t } from "../ui/terminal";

function syntheticProject(slug: string, id?: string): CliProject {
  return {
    id: id ?? slug,
    name: slug,
    slug,
    description: "",
    endpointCount: 0,
    routeCount: 0,
    updatedAt: new Date().toISOString(),
  };
}

export async function runPull(options: PullCommandOptions): Promise<void> {
  loadLocalEnv();
  const rc = loadFackRc();
  const session = resolveCliSession({
    url: options.url,
    preferredUrl: rc.studioUrl,
  });
  const client: FackApiClient = new FackApiClient(
    session.studioUrl,
    session.token,
  );
  const fallbackKey = options.key || process.env.FACK_PROJECT_KEY;
  const requestedSlug = options.projectSlug || rc.projectSlug;

  // Listing projects doubles as a capability check: local deployments answer
  // without a token, hosted deployments answer only for a valid terminal.
  let projects: CliProject[] | null = null;
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

    if (!fallbackKey) {
      log.error("This Fack Studio requires a signed-in terminal.");
      log.muted(
        "Run `fack login`, or pass --key <project-secret-key> with a project slug.",
      );
      process.exitCode = 1;
      return;
    }

    if (!requestedSlug) {
      log.error("Project slug is required when pulling with a secret key.");
      log.muted("Usage: fack pull <slug> --key <secret-key>");
      process.exitCode = 1;
      return;
    }
  }

  let project: CliProject;
  if (projects !== null) {
    try {
      project = await selectProject(projects, requestedSlug);
    } catch (error: unknown) {
      log.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
      return;
    }
  } else {
    if (!requestedSlug) {
      log.error("Project slug is required.");
      log.muted("Usage: fack pull <slug>");
      process.exitCode = 1;
      return;
    }
    project = syntheticProject(requestedSlug, rc.projectId);
  }

  log.info(
    `Pulling ${t.bold(project.slug)} from ${t.dim(session.studioUrl)}...`,
  );

  try {
    const result = await pullProjectBundle(client, {
      project,
      studioUrl: session.studioUrl,
      out: options.out,
      fallbackKey,
    });

    const displayedPath =
      path.relative(process.cwd(), result.outFile) || result.outFile;

    log.success(
      `Saved ${t.bold(displayedPath)} ${t.dim(
        `(${formatBytes(result.bytes)})`,
      )}`,
    );
    log.success(`Remembered ${project.slug} in ${result.rcPath}`);
    if (result.envPath) {
      log.success(`Wrote FACK_PROJECT_KEY to ${result.envPath}`);
    } else {
      log.warn(
        "Fack Studio did not return a project key; set FACK_PROJECT_KEY manually before `fack dev`.",
      );
    }

    log.blank();
    log.muted("Run `fack dev` to serve it locally.");
    log.blank();
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
