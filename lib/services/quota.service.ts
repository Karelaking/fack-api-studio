import { count, eq } from "drizzle-orm";
import { db, storageConnection } from "@/db";
import { projects, workspaceMeta } from "@/db/schema";

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

/**
 * Enforces project creation limits in the SaaS tier.
 * In local mode or self-hosted mode without quotas, this is a no-op.
 */
export async function assertProjectQuota(userId: string): Promise<void> {
  if (!storageConnection.features.quotas) {
    return;
  }

  // Find user's subscription metadata
  const meta = await db.query.workspaceMeta.findFirst({
    where: eq(workspaceMeta.userId, userId),
  });

  const projectLimit = meta?.projectLimit ?? 3; // Default free tier: 3 projects

  const [projectCount] = await db
    .select({ value: count() })
    .from(projects)
    .where(eq(projects.userId, userId));

  const currentCount = projectCount?.value ?? 0;

  if (currentCount >= projectLimit) {
    throw new QuotaExceededError(
      `You have reached the limit of ${projectLimit} projects for your plan. Please upgrade your subscription to create more projects.`,
    );
  }
}
