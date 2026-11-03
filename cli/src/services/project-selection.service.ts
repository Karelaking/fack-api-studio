/**
 * Fack CLI — project selection.
 *
 * One project auto-selects. Several become a short numbered prompt, which keeps
 * `fack pull` fully automatic in the common single-project workspace without
 * guessing when the choice is real.
 */

import { stdin, stdout } from "node:process";
import readline from "node:readline/promises";

import type { CliProject } from "./api-client.service";
import { log, t } from "../ui/terminal";

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

  console.log("");
  log.info("Select a project:");
  projects.forEach((project, index) => {
    console.log(
      `  ${t.bold(String(index + 1))}. ${project.name} ${t.dim(
        `(${project.slug})`,
      )} ${t.dim(
        `· ${project.endpointCount} endpoints · ${project.routeCount} routes`,
      )}`,
    );
  });
  console.log("");

  const prompt = readline.createInterface({
    input: stdin,
    output: stdout,
  });

  try {
    for (;;) {
      const answer = (
        await prompt.question(`Choose 1-${projects.length} [1]: `)
      ).trim();

      if (answer.length === 0) return projects[0];

      const index = Number(answer);
      if (Number.isInteger(index) && index >= 1 && index <= projects.length) {
        return projects[index - 1];
      }

      log.warn(`Enter a number between 1 and ${projects.length}.`);
    }
  } finally {
    prompt.close();
  }
}
