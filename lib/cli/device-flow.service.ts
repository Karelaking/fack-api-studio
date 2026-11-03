/**
 * Fack CLI — Device authorization flow (RFC 8628 shape).
 *
 * The terminal receives a secret device code plus a short human code, opens the
 * Studio approval page, and polls until the signed-in user approves. Approval
 * mints a long-lived CLI token; the device code is single-use.
 */

import crypto from "node:crypto";

import { and, eq, lt } from "drizzle-orm";

import { db, ensureCliTables } from "@/db";
import { cliAuthRequests, cliDevices, type CliAuthRequest } from "@/db/schema";
import { generateId } from "@/lib/utils";
import {
  generateCliToken,
  hashCliToken,
  tokenDisplayPrefix,
} from "./token.service";

/** Ten minutes is enough to switch to a browser without leaving a stale code. */
export const DEVICE_CODE_TTL_MS = 10 * 60 * 1000;

/** CLI tokens automatically expire after 90 days. */
export const CLI_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Polling cadence advertised to the CLI. */
export const DEVICE_POLL_INTERVAL_SECONDS = 5;

const USER_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const USER_CODE_GROUP_LENGTH = 4;
const USER_CODE_GROUPS = 2;
const MAX_USER_CODE_ATTEMPTS = 5;

export type DeviceRequestStatus =
  | "pending"
  | "approved"
  | "denied"
  | "consumed";

export interface DeviceAuthorizationRequest {
  deviceCode: string;
  userCode: string;
  expiresIn: number;
  interval: number;
}

export interface DeviceRequestView {
  userCode: string;
  deviceName: string;
  platform: string;
  status: DeviceRequestStatus;
  createdAt: Date;
  expiresAt: Date;
  expired: boolean;
}

export type DeviceExchangeResult =
  | {
      status: "approved";
      token: string;
      tokenPrefix: string;
      deviceName: string;
      platform: string;
      userId: string;
    }
  | { status: "pending" | "denied" | "expired" | "invalid" };

function randomUserCode(): string {
  const bytes = crypto.randomBytes(USER_CODE_GROUP_LENGTH * USER_CODE_GROUPS);
  const characters = Array.from(bytes, (byte) => {
    return USER_CODE_ALPHABET[byte % USER_CODE_ALPHABET.length];
  });
  const groups: string[] = [];
  for (
    let index = 0;
    index < characters.length;
    index += USER_CODE_GROUP_LENGTH
  ) {
    groups.push(
      characters.slice(index, index + USER_CODE_GROUP_LENGTH).join(""),
    );
  }
  return groups.join("-");
}

/** Uppercases and re-groups a user-typed code (`abcd1234` → `ABCD-1234`). */
export function normalizeUserCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length <= USER_CODE_GROUP_LENGTH) return raw;
  return `${raw.slice(0, USER_CODE_GROUP_LENGTH)}-${raw.slice(USER_CODE_GROUP_LENGTH)}`;
}

export function isCompleteUserCode(input: string): boolean {
  return (
    normalizeUserCode(input).replace("-", "").length ===
    USER_CODE_GROUP_LENGTH * USER_CODE_GROUPS
  );
}

export function hashDeviceCode(deviceCode: string): string {
  return crypto.createHash("sha256").update(deviceCode).digest("hex");
}

function isRequestExpired(request: Pick<CliAuthRequest, "expiresAt">): boolean {
  return request.expiresAt.getTime() <= Date.now();
}

function toView(request: CliAuthRequest): DeviceRequestView {
  return {
    userCode: request.userCode,
    deviceName: request.deviceName,
    platform: request.platform,
    status: request.status,
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
    expired: isRequestExpired(request),
  };
}

/** Clears abandoned requests so the table does not accumulate forever. */
async function pruneStaleRequests(): Promise<void> {
  try {
    await db
      .delete(cliAuthRequests)
      .where(
        lt(
          cliAuthRequests.expiresAt,
          new Date(Date.now() - 24 * 60 * 60 * 1000),
        ),
      );
  } catch {
    // Housekeeping must never block a login attempt.
  }
}

export async function startDeviceAuthorization(input: {
  deviceName?: string;
  platform?: string;
}): Promise<DeviceAuthorizationRequest> {
  await ensureCliTables();
  await pruneStaleRequests();

  const deviceCode = crypto.randomBytes(32).toString("base64url");
  const deviceCodeHash = hashDeviceCode(deviceCode);
  const deviceName =
    (input.deviceName || "Terminal").trim().slice(0, 80) || "Terminal";
  const platform =
    (input.platform || "unknown").trim().slice(0, 40) || "unknown";
  const expiresAt = new Date(Date.now() + DEVICE_CODE_TTL_MS);

  for (let attempt = 0; attempt < MAX_USER_CODE_ATTEMPTS; attempt += 1) {
    const userCode = randomUserCode();
    try {
      await db.insert(cliAuthRequests).values({
        id: generateId(),
        deviceCodeHash,
        userCode,
        deviceName,
        platform,
        expiresAt,
      });

      return {
        deviceCode,
        userCode,
        expiresIn: Math.floor(DEVICE_CODE_TTL_MS / 1000),
        interval: DEVICE_POLL_INTERVAL_SECONDS,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // A user-code collision is retryable; anything else is a real failure.
      if (
        !message.includes("UNIQUE") ||
        attempt === MAX_USER_CODE_ATTEMPTS - 1
      ) {
        throw error;
      }
    }
  }

  throw new Error("Could not allocate a device code");
}

export async function findDeviceRequest(
  userCode: string,
): Promise<DeviceRequestView | null> {
  const normalized = normalizeUserCode(userCode);
  if (!normalized) return null;

  await ensureCliTables();
  const request = await db.query.cliAuthRequests.findFirst({
    where: eq(cliAuthRequests.userCode, normalized),
  });
  return request ? toView(request) : null;
}

export async function approveDeviceRequest(
  userCode: string,
  userId: string,
): Promise<DeviceRequestView | null> {
  const normalized = normalizeUserCode(userCode);
  if (!normalized) return null;

  await ensureCliTables();
  const [updated] = await db
    .update(cliAuthRequests)
    .set({ status: "approved", userId, approvedAt: new Date() })
    .where(
      and(
        eq(cliAuthRequests.userCode, normalized),
        eq(cliAuthRequests.status, "pending"),
      ),
    )
    .returning();

  if (updated) return toView(updated);

  // Idempotent re-submit: show the already-approved request, not an error.
  const existing = await db.query.cliAuthRequests.findFirst({
    where: eq(cliAuthRequests.userCode, normalized),
  });
  return existing ? toView(existing) : null;
}

export async function denyDeviceRequest(
  userCode: string,
  userId: string,
): Promise<DeviceRequestView | null> {
  const normalized = normalizeUserCode(userCode);
  if (!normalized) return null;

  await ensureCliTables();
  const [updated] = await db
    .update(cliAuthRequests)
    .set({ status: "denied", userId, approvedAt: new Date() })
    .where(
      and(
        eq(cliAuthRequests.userCode, normalized),
        eq(cliAuthRequests.status, "pending"),
      ),
    )
    .returning();

  if (updated) return toView(updated);

  const existing = await db.query.cliAuthRequests.findFirst({
    where: eq(cliAuthRequests.userCode, normalized),
  });
  return existing ? toView(existing) : null;
}

/**
 * Exchanges an approved device code for a CLI token. The approval row flips to
 * `consumed` inside the same transaction that mints the token, so a second
 * concurrent poll cannot mint a second credential.
 */
export async function exchangeDeviceCode(
  deviceCode: string,
): Promise<DeviceExchangeResult> {
  await ensureCliTables();
  const deviceCodeHash = hashDeviceCode(deviceCode);

  return db.transaction(async (tx) => {
    const request = await tx.query.cliAuthRequests.findFirst({
      where: eq(cliAuthRequests.deviceCodeHash, deviceCodeHash),
    });

    if (!request) return { status: "invalid" } as const;

    if (isRequestExpired(request) || request.status === "consumed") {
      if (request.status !== "consumed") {
        await tx
          .update(cliAuthRequests)
          .set({ status: "denied" })
          .where(eq(cliAuthRequests.id, request.id));
      }
      return { status: "expired" } as const;
    }

    if (request.status === "pending") return { status: "pending" } as const;
    if (request.status === "denied") return { status: "denied" } as const;

    if (!request.userId) return { status: "invalid" } as const;

    const [claimed] = await tx
      .update(cliAuthRequests)
      .set({ status: "consumed", consumedAt: new Date() })
      .where(
        and(
          eq(cliAuthRequests.id, request.id),
          eq(cliAuthRequests.status, "approved"),
        ),
      )
      .returning();

    if (!claimed) return { status: "expired" } as const;

    const token = generateCliToken();
    const expiresAt = new Date(Date.now() + CLI_TOKEN_TTL_MS);

    await tx.insert(cliDevices).values({
      id: generateId(),
      userId: request.userId,
      name: request.deviceName,
      platform: request.platform,
      tokenHash: hashCliToken(token),
      tokenPrefix: tokenDisplayPrefix(token),
      expiresAt,
    });

    return {
      status: "approved",
      token,
      tokenPrefix: tokenDisplayPrefix(token),
      deviceName: request.deviceName,
      platform: request.platform,
      userId: request.userId,
    } as const;
  });
}
