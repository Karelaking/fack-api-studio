/**
 * Fack CLI — Logout Command
 *
 * Revokes the credential server-side first, then removes the local session.
 */

import type { LogoutCommandOptions } from "../cli.type";
import {
  deleteSession,
  environmentToken,
} from "../services/credentials.service";
import {
  describeNetworkError,
  FackApiClient,
} from "../services/api-client.service";
import { resolveCliSession } from "../services/session.service";
import { log, t } from "../ui/terminal";

export async function runLogout(options: LogoutCommandOptions): Promise<void> {
  const session = resolveCliSession({ url: options.url });

  if (!session.token) {
    log.info("This terminal is not signed in.");
    log.muted("Run `fack login` to authorize it.");
    return;
  }

  const client = new FackApiClient(session.studioUrl, session.token);

  try {
    await client.revoke();
    log.success(`Revoked this terminal's access to ${session.studioUrl}.`);
  } catch (error: unknown) {
    log.warn(describeNetworkError(error, session.studioUrl));
    log.muted("The local credential is removed anyway.");
  }

  if (environmentToken()) {
    log.muted(
      "FACK_TOKEN is set in your environment; unset it to finish logging out.",
    );
  }

  if (session.stored) {
    deleteSession(session.studioUrl);
    log.muted(`Removed ${t.dim("credentials.json")} for this Studio.`);
  }
}
