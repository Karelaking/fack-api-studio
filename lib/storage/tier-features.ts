/**
 * Tier-specific feature flags.
 *
 * Each deployment tier (local, selfhosted, saas) exposes a different surface
 * area. Components and middleware check these flags rather than raw env vars
 * so the entire product surface is controlled from one place.
 *
 * The flags are derived at startup from the resolved `StorageMode` and are
 * immutable for the lifetime of the process.
 */

export interface TierFeatures {
  /** Show the file manager sidebar for .fack project files. */
  fileManager: boolean;
  /** Allow cloud backup download/import. */
  cloudBackup: boolean;
  /** Multiple users with Clerk authentication. */
  multiUser: boolean;
  /** Clerk Billing integration (pricing table, plan gating). */
  billing: boolean;
  /** Enforce project count and resource quotas. */
  quotas: boolean;
  /** Analytics dashboard for workspace-level metrics. */
  analytics: boolean;
  /** Custom domain configuration for mock endpoints. */
  customDomains: boolean;
}

export type StorageMode = "local" | "selfhosted" | "saas";

/**
 * Returns the feature flags for the given storage mode.
 *
 * In `selfhosted` mode, `multiUser` is true only when the deployer has
 * configured Clerk by providing a `CLERK_SECRET_KEY`.
 */
export function getTierFeatures(mode: StorageMode): TierFeatures {
  switch (mode) {
    case "local":
      return {
        fileManager: true,
        cloudBackup: false,
        multiUser: false,
        billing: false,
        quotas: false,
        analytics: false,
        customDomains: false,
      };
    case "selfhosted":
      return {
        fileManager: false,
        cloudBackup: true,
        multiUser: !!process.env.CLERK_SECRET_KEY,
        billing: false,
        quotas: false,
        analytics: true,
        customDomains: true,
      };
    case "saas":
      return {
        fileManager: false,
        cloudBackup: true,
        multiUser: true,
        billing: true,
        quotas: true,
        analytics: true,
        customDomains: true,
      };
  }
}
