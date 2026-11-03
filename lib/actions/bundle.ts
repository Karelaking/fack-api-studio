"use server";

import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { assertProjectOwnedBy, requireUserId } from "@/lib/auth";
import { generateProjectSecretKey } from "@/lib/bundle/bundle-crypto.service";

export interface ProjectCliDetails {
  projectId: string;
  projectSlug: string;
  secretKey: string;
  downloadUrl: string;
  pullCommand: string;
  devCommand: string;
}

/**
 * Server action to retrieve project CLI connection details and secret key.
 */
export async function getProjectCliDetails(
  projectId: string,
): Promise<ProjectCliDetails> {
  const userId = await requireUserId();

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new Error(`Project with ID "${projectId}" not found.`);
  }

  assertProjectOwnedBy(project, userId);

  const secretKey = generateProjectSecretKey(project.id);
  const downloadUrl = `/api/projects/${project.slug}/bundle`;
  const pullCommand = `fack pull ${project.slug} --key ${secretKey}`;
  const devCommand = "fack dev";

  return {
    projectId: project.id,
    projectSlug: project.slug,
    secretKey,
    downloadUrl,
    pullCommand,
    devCommand,
  };
}
