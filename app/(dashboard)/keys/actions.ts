"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { revokeCliDevice } from "@/lib/cli/token.service";

export interface RevokeCliDeviceResult {
  ok: boolean;
  error?: string;
}

/**
 * Revokes one of the signed-in user's terminals. The next CLI request using
 * that credential receives a 401 and must run `fack login` again.
 */
export async function revokeCliDeviceAction(
  deviceId: string,
): Promise<RevokeCliDeviceResult> {
  const userId = await requireUserId();

  try {
    const revoked = await revokeCliDevice(deviceId, userId);
    if (!revoked) {
      return {
        ok: false,
        error: "That terminal no longer exists or is already revoked.",
      };
    }

    revalidatePath("/keys");
    return { ok: true };
  } catch (error: unknown) {
    console.error("[Fack CLI] Failed to revoke device:", error);
    return { ok: false, error: "Failed to revoke the terminal." };
  }
}
