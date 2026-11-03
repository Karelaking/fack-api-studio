/**
 * Fack CLI — Whoami Command
 *
 * Shows the Studio account and terminal behind the current credential, or the
 * local-mode workspace when the deployment does not require sign-in.
 */

import type { WhoamiCommandOptions } from "../cli.type";
import {
  describeNetworkError,
  FackApiClient,
  isUnauthorized,
} from "../services/api-client.service";
import { resolveCliSession } from "../services/session.service";
import { log, t } from "../ui/terminal";

function row(label: string, value: string): void {
  console.log(`  ${t.dim(label.padEnd(8))}${value}`);
}

export async function runWhoami(options: WhoamiCommandOptions): Promise<void> {
  const session = resolveCliSession({ url: options.url });
  const client = new FackApiClient(session.studioUrl, session.token);

  try {
    const me = await client.fetchMe();

    console.log("");
    row("Studio", t.bold(session.studioUrl));
    row(
      "Mode",
      me.mode === "local"
        ? "Local workspace (no sign-in required)"
        : "Signed in",
    );

    if (me.mode === "token") {
      row("User", me.user.id);
      if (me.device) {
        row("Device", `${me.device.name} ${t.dim(`(${me.device.platform})`)}`);
        row("Since", me.device.createdAt.slice(0, 10));
        row("Last use", me.device.lastUsedAt?.slice(0, 10) ?? "This session");
      }
    } else {
      row("Device", "This terminal");
    }
    console.log("");
  } catch (error: unknown) {
    if (isUnauthorized(error)) {
      log.error("This terminal is not authorized.");
      log.muted("Run `fack login` to connect it to your Studio account.");
      process.exitCode = 1;
      return;
    }

    log.error(describeNetworkError(error, session.studioUrl));
    process.exitCode = 1;
  }
}
