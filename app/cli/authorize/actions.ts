"use server";

import { requireUserId } from "@/lib/auth";
import {
  approveDeviceRequest,
  denyDeviceRequest,
  findDeviceRequest,
  type DeviceRequestStatus,
} from "@/lib/cli/device-flow.service";

export interface DeviceRequestSummary {
  userCode: string;
  deviceName: string;
  platform: string;
  status: DeviceRequestStatus;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
}

export interface AuthorizeResult {
  ok: boolean;
  error?: string;
  request?: DeviceRequestSummary;
}

function toSummary(
  request: NonNullable<Awaited<ReturnType<typeof findDeviceRequest>>>,
): DeviceRequestSummary {
  return {
    userCode: request.userCode,
    deviceName: request.deviceName,
    platform: request.platform,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    expiresAt: request.expiresAt.toISOString(),
    expired: request.expired,
  };
}

/**
 * Looks up the pending request behind a user code before the developer commits
 * to authorizing it. Requires a Studio session so a signed-out visitor is sent
 * through sign-in instead.
 */
export async function inspectDeviceCode(
  code: string,
): Promise<AuthorizeResult> {
  await requireUserId();

  const request = await findDeviceRequest(code);
  if (!request) {
    return {
      ok: false,
      error:
        "That code doesn't match a pending `fack login`. Check the terminal and try again.",
    };
  }

  return { ok: true, request: toSummary(request) };
}

export async function approveDevice(code: string): Promise<AuthorizeResult> {
  const userId = await requireUserId();

  const request = await approveDeviceRequest(code, userId);
  if (!request) {
    return {
      ok: false,
      error:
        "That code doesn't match a pending `fack login`. It may have expired.",
    };
  }

  return { ok: true, request: toSummary(request) };
}

export async function denyDevice(code: string): Promise<AuthorizeResult> {
  const userId = await requireUserId();

  const request = await denyDeviceRequest(code, userId);
  if (!request) {
    return {
      ok: false,
      error:
        "That code doesn't match a pending `fack login`. It may have expired.",
    };
  }

  return { ok: true, request: toSummary(request) };
}
