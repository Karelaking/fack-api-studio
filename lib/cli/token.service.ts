/**
 * Fack CLI — Token & actor resolution.
 *
 * Long-lived terminal credentials are stored as SHA-256 hashes only. The raw
 * token exists in two places: the CLI's private credentials file and the single
 * response that issues it. Everything server-side after that compares hashes.
 */

import crypto from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db, ensureCliTables, storageConnection } from "@/db";
import { cliDevices, type CliDevice } from "@/db/schema";
import { UnauthorizedError } from "@/lib/auth";

/** Prefix reserved for Studio-issued CLI tokens (`fack_cli_...`). */
export const CLI_TOKEN_PREFIX = "fack_cli_";

/** How much of the token is safe to show in device lists. */
const TOKEN_DISPLAY_LENGTH = CLI_TOKEN_PREFIX.length + 4;

export interface CliActor {
  userId: string;
  /** `token` when a terminal credential authenticated the request. */
  source: "token" | "local";
  deviceId?: string;
  deviceName?: string;
  /** Full device record for token-authenticated requests. */
  device?: Pick<
    CliDevice,
    "id" | "name" | "platform" | "createdAt" | "lastUsedAt"
  >;
}

export function generateCliToken(): string {
  return `${CLI_TOKEN_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;
}

export function hashCliToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Human-readable prefix stored for the dashboard, e.g. `fack_cli_9a2f`. */
export function tokenDisplayPrefix(token: string): string {
  return token.slice(0, TOKEN_DISPLAY_LENGTH);
}

export function isCliToken(value: string | undefined | null): boolean {
  return typeof value === "string" && value.startsWith(CLI_TOKEN_PREFIX);
}

export function readBearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : undefined;
}

function isExpired(device: Pick<CliDevice, "expiresAt">): boolean {
  return device.expiresAt ? device.expiresAt.getTime() <= Date.now() : false;
}

/**
 * Resolves a raw CLI token to its device and owner, or `null` when the token is
 * unknown, revoked, or expired.
 */
export async function authenticateCliToken(
  token: string,
): Promise<{ device: CliDevice; userId: string } | null> {
  if (!isCliToken(token)) return null;

  await ensureCliTables();
  const device = await db.query.cliDevices.findFirst({
    where: eq(cliDevices.tokenHash, hashCliToken(token)),
  });

  if (!device || device.revokedAt || isExpired(device)) {
    return null;
  }

  // Best-effort activity stamp; authentication never fails because of it.
  void db
    .update(cliDevices)
    .set({ lastUsedAt: new Date() })
    .where(eq(cliDevices.id, device.id))
    .catch(() => undefined);

  return { device, userId: device.userId };
}

/**
 * Authenticates an `/api/cli/**` request.
 *
 * Terminals authenticate with a bearer token. Deployments that do not require
 * Studio sign-in (local mode) act as the shared `system` workspace so the CLI
 * works with zero configuration.
 */
export async function requireCliActor(request: Request): Promise<CliActor> {
  const token = readBearerToken(request);

  if (token) {
    if (!isCliToken(token)) {
      throw new UnauthorizedError("Invalid CLI token");
    }
    const auth = await authenticateCliToken(token);
    if (!auth) {
      throw new UnauthorizedError("CLI token is invalid, revoked, or expired");
    }
    return {
      userId: auth.userId,
      source: "token",
      deviceId: auth.device.id,
      deviceName: auth.device.name,
      device: {
        id: auth.device.id,
        name: auth.device.name,
        platform: auth.device.platform,
        createdAt: auth.device.createdAt,
        lastUsedAt: auth.device.lastUsedAt,
      },
    };
  }

  if (!storageConnection.authRequired) {
    return { userId: "system", source: "local" };
  }

  throw new UnauthorizedError(
    "Sign in with `fack login` or provide a valid CLI token",
  );
}

/**
 * Revokes a device. Returns false when the device does not belong to the user
 * or is already revoked.
 */
export async function revokeCliDevice(
  deviceId: string,
  userId: string,
): Promise<boolean> {
  await ensureCliTables();
  const revoked = await db
    .update(cliDevices)
    .set({ revokedAt: new Date() })
    .where(and(eq(cliDevices.id, deviceId), eq(cliDevices.userId, userId)))
    .returning({ id: cliDevices.id });

  return revoked.length > 0;
}

/** Revokes the device backing the current bearer token. */
export async function revokeCurrentCliToken(token: string): Promise<boolean> {
  if (!isCliToken(token)) return false;
  await ensureCliTables();
  const revoked = await db
    .update(cliDevices)
    .set({ revokedAt: new Date() })
    .where(eq(cliDevices.tokenHash, hashCliToken(token)))
    .returning({ id: cliDevices.id });
  return revoked.length > 0;
}
