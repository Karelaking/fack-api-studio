/**
 * Fack CLI — Login Command
 *
 * GitHub/Vercel-style device authorization: show a short code, open Studio,
 * poll until the developer approves, then store the issued credential.
 */

import type { LoginCommandOptions } from "../cli.type";
import { credentialsPath, saveSession } from "../services/credentials.service";
import {
  describeNetworkError,
  FackApiClient,
} from "../services/api-client.service";
import {
  detectDeviceName,
  detectPlatform,
  openBrowser,
} from "../services/browser.service";
import { resolveCliSession } from "../services/session.service";
import { banner, log, logger, sleep, t } from "../ui/terminal";

const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;

export async function runLogin(options: LoginCommandOptions): Promise<void> {
  const session = resolveCliSession({ url: options.url });
  const studioUrl = session.studioUrl;
  const client = new FackApiClient(studioUrl);
  const deviceName = options.deviceName?.trim() || detectDeviceName();
  const platform = detectPlatform();

  banner("Sign in to Fack CLI", studioUrl);

  let authorization;
  try {
    authorization = await client.startDeviceFlow({ deviceName, platform });
  } catch (error: unknown) {
    log.error(describeNetworkError(error, studioUrl));
    log.muted("Check the Studio URL and try again with --url <url>.");
    process.exitCode = 1;
    return;
  }

  const verificationUrl = `${studioUrl}${authorization.verificationUriComplete}`;

  logger.raw(`  ${t.dim("Code")}    ${t.bold(t.cyan(authorization.userCode))}`);
  logger.raw(`  ${t.dim("Device")}  ${deviceName} ${t.dim(`(${platform})`)}`);
  logger.raw(`  ${t.dim("Open")}    ${t.underline(verificationUrl)}`);
  log.blank();

  if (openBrowser(verificationUrl)) {
    log.info("Opened your browser. Waiting for approval...");
  } else {
    log.warn("Couldn't open a browser automatically.");
    log.info("Open the URL above, then approve the code.");
  }

  const deadline =
    Date.now() + Math.min(authorization.expiresIn * 1000, LOGIN_TIMEOUT_MS);
  const intervalMs = Math.max(authorization.interval, 2) * 1000;
  let warnedAboutNetwork = false;

  while (Date.now() < deadline) {
    await sleep(intervalMs);

    let poll;
    try {
      poll = await client.pollDeviceToken(authorization.deviceCode);
    } catch (error: unknown) {
      if (warnedAboutNetwork === false) {
        log.warn(describeNetworkError(error, studioUrl));
        log.muted("Still waiting for approval...");
        warnedAboutNetwork = true;
      }
      continue;
    }

    if (poll.status === "approved") {
      const savedUrl = saveSession({
        studioUrl,
        token: poll.token,
        tokenPrefix: poll.tokenPrefix,
        deviceName: poll.device.name || deviceName,
        platform: poll.device.platform || platform,
        createdAt: new Date().toISOString(),
        userId: poll.userId,
      });

      log.blank();
      log.success(
        `Signed in to ${t.bold(savedUrl)} as ${t.bold(
          poll.device.name || deviceName,
        )}.`,
      );
      log.muted(`Credential saved to ${credentialsPath()}`);
      log.blank();
      logger.raw(`  ${t.dim("Next")}  ${t.bold("fack projects")}`);
      logger.raw(
        `        ${t.bold("fack pull")}    ${t.dim(
          "in a repository, to fetch its bundle",
        )}`,
      );
      log.blank();
      return;
    }

    if (poll.status === "denied") {
      log.error("This terminal request was denied in Studio.");
      log.muted("Run `fack login` again if that was a mistake.");
      process.exitCode = 1;
      return;
    }

    if (poll.status === "expired") {
      log.error("The code expired before it was approved.");
      log.muted("Run `fack login` again to get a fresh code.");
      process.exitCode = 1;
      return;
    }

    if (poll.status === "invalid") {
      log.error(poll.error ?? "Studio rejected this login request.");
      process.exitCode = 1;
      return;
    }
  }

  log.error("Login timed out before the code was approved.");
  log.muted("Run `fack login` again to get a fresh code.");
  process.exitCode = 1;
}
