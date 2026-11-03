/**
 * Fack CLI — project selection.
 *
 * One project auto-selects. Multiple projects trigger an interactive
 * terminal selector powered by @clack/prompts, falling back to non-TTY hints.
 */

import { stdin, stdout } from "node:process";
import type { CliProject } from "./api-client.service";
import { cancel, isCancel, log, select, t } from "../ui/terminal";

export function findProject(
  projects: CliProject[],
  reference: string,
): CliProject | undefined {
  const needle = reference.trim().toLowerCase();
  return projects.find(
    (project) =>
      project.slug.toLowerCase() === needle ||
      project.id.toLowerCase() === needle ||
      project.name.toLowerCase() === needle,
  );
}

export async function selectProject(
  projects: CliProject[],
  requested?: string,
): Promise<CliProject> {
  if (projects.length === 0) {
    throw new Error(
      "This workspace has no projects yet. Create one in Fack Studio, then run `fack pull` again.",
    );
  }

  if (requested?.trim()) {
    const match = findProject(projects, requested);
    if (match) return match;

    const available = projects.map((project) => project.slug).join(", ");
    throw new Error(
      `Project "${requested}" was not found. Available projects: ${available}.`,
    );
  }

  if (projects.length === 1) {
    const [project] = projects;
    log.info(`Using project ${t.bold(project.name)} (${project.slug})`);
    return project;
  }

  if (!stdin.isTTY || !stdout.isTTY) {
    const available = projects
      .map((project) => `  - ${project.slug}  ${project.name}`)
      .join("\n");
    throw new Error(
      `Several projects are available. Pass a slug to choose one:\n${available}\n\nExample: fack pull ${projects[0].slug}`,
    );
  }

  const selection = await select({
    message: "Select a project to pull:",
    options: projects.map((project) => ({
      value: project.slug,
      label: `${project.name} (${project.slug})`,
      hint: `${project.endpointCount} endpoints · ${project.routeCount} routes`,
    })),
  });

  if (isCancel(selection)) {
    cancel("Project selection canceled.");
    process.exit(0);
  }

  const chosen = findProject(projects, selection as string);
  if (!chosen) {
    throw new Error("Invalid project selected.");
  }
  return chosen;
}
