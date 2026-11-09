/**
 * Fack CLI — Projects Command
 *
 * Lists the projects the signed-in terminal can pull.
 */

import type { ProjectsCommandOptions } from "../cli.type";
import {
  describeNetworkError,
  FackApiClient,
  isUnauthorized,
} from "../services/api-client.service";
import { resolveCliSession } from "../services/session.service";
import { log, printTable, t } from "../ui/terminal";

export async function runProjects(
  options: ProjectsCommandOptions,
): Promise<void> {
  const session = resolveCliSession({ url: options.url });
  const client = new FackApiClient(session.studioUrl, session.token);

  let result;
  try {
    result = await client.listProjects();
  } catch (error: unknown) {
    if (isUnauthorized(error)) {
      log.error("This terminal is not authorized.");
      log.muted("Run `fack login` to connect it to your Studio account.");
      process.exitCode = 1;
      return;
    }

    log.error(describeNetworkError(error, session.studioUrl));
    process.exitCode = 1;
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(result.projects, null, 2));
    return;
  }

  if (result.projects.length === 0) {
    log.info(`No projects in ${session.studioUrl}.`);
    log.muted("Create one in Studio, then run `fack projects` again.");
    return;
  }

  log.blank();
  log.info(
    `${result.projects.length} ${
      result.projects.length === 1 ? "project" : "projects"
    } in ${t.bold(session.studioUrl)}`,
  );
  log.blank();

  printTable(
    ["SLUG", "NAME", "ENDPOINTS", "ROUTES", "UPDATED"],
    result.projects.map((project) => [
      t.cyan(project.slug),
      project.name,
      String(project.endpointCount),
      String(project.routeCount),
      project.updatedAt.slice(0, 10),
    ]),
  );

  log.blank();
  log.muted("Pull one with: fack pull <slug>");
  log.blank();
}
