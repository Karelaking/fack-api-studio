/**
 * Fack CLI - Dev Command
 *
 * Boots the local mock server from the encrypted bundle with environment loading,
 * port conflict suggestions, and graceful shutdown handling.
 */

import fs from "node:fs";
import path from "node:path";
import { decryptBundle } from "../../../lib/bundle/bundle-crypto.service";
import { MockServer } from "../server.service";
import { loadFackRc, loadLocalEnv } from "../services/project-files.service";
import type { DevCommandOptions } from "../cli.type";
import { banner, log, printFields, printRoute, t } from "../ui/terminal";

export async function runDev(options: DevCommandOptions): Promise<void> {
  loadLocalEnv();
  const config = loadFackRc();

  const filePath = path.resolve(process.cwd(), options.file || "fack.enc");

  if (!fs.existsSync(filePath)) {
    log.error(`Bundle file not found at ${filePath}`);
    log.muted("To get started, either:");
    log.raw(
      "  1. Download 'fack.enc' from Fack Studio dashboard into this folder.",
    );
    log.raw("  2. Run: fack pull <project-slug> --key <secret-key>");
    log.blank();
    process.exit(1);
  }

  const secretKey = options.key || process.env.FACK_PROJECT_KEY;

  if (!secretKey) {
    log.error("Project secret key is required to decrypt the bundle.");
    log.muted("Provide it via:");
    log.raw("  --key <secret-key>");
    log.raw("  or set FACK_PROJECT_KEY in your .env file.");
    log.blank();
    process.exit(1);
  }

  let bundleBuffer: Buffer;
  try {
    bundleBuffer = fs.readFileSync(filePath);
  } catch (err) {
    log.error(`Failed to read bundle file: ${String(err)}`);
    process.exit(1);
  }

  let decryptedBundle;
  try {
    const result = decryptBundle(bundleBuffer, secretKey);
    decryptedBundle = result.bundle;
  } catch (err) {
    log.error(err instanceof Error ? err : String(err));
    process.exit(1);
  }

  const rawPort =
    options.port ?? config.port ?? parseInt(process.env.PORT || "4000", 10);
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    log.error(
      `Invalid port "${rawPort}". Port must be an integer between 1 and 65535.`,
    );
    process.exit(1);
  }

  const host = options.host || "0.0.0.0";

  const server = new MockServer({
    port,
    host,
    bundle: decryptedBundle,
    silent: options.silent,
  });

  try {
    await server.start();

    const displayHost = host === "0.0.0.0" ? "localhost" : host;
    banner("Fack API Local Runner");
    printFields([
      [
        "Project",
        `${t.bold(decryptedBundle.projectName)} ${t.dim(
          `(${decryptedBundle.projectSlug})`,
        )}`,
      ],
      ["Serving", t.green(`http://${displayHost}:${port}`)],
      [
        "Routes",
        `${t.bold(String(decryptedBundle.routes.length))} active mock endpoints`,
      ],
      ["Health", `http://${displayHost}:${port}/__fack/health`],
    ]);
    log.blank();

    log.info(t.bold("Available Endpoints"));
    const previewRoutes = decryptedBundle.routes.slice(0, 10);
    for (const route of previewRoutes) {
      printRoute(route);
    }
    if (decryptedBundle.routes.length > 10) {
      log.muted(`... and ${decryptedBundle.routes.length - 10} more routes`);
    }

    log.blank();
    log.muted("Ready for frontend requests. Press Ctrl+C to stop.");
    log.blank();

    // Live hot-reload when bundle file changes (e.g. via `fack pull` or re-export)
    let watchDebounceTimer: NodeJS.Timeout | undefined;
    try {
      fs.watch(filePath, (eventType) => {
        if (eventType === "change" || eventType === "rename") {
          clearTimeout(watchDebounceTimer);
          watchDebounceTimer = setTimeout(() => {
            try {
              if (!fs.existsSync(filePath)) return;
              const updatedBuffer = fs.readFileSync(filePath);
              const { bundle: updatedBundle } = decryptBundle(
                updatedBuffer,
                secretKey,
              );
              server.updateBundle(updatedBundle);
              log.blank();
              log.success(
                `Hot-reloaded ${updatedBundle.routes.length} mock routes from ${path.basename(
                  filePath,
                )}`,
              );
              log.blank();
            } catch {
              // Ignore transient file lock or incomplete write
            }
          }, 150);
        }
      });
    } catch {
      // Best-effort file watching
    }

    const shutdown = async (): Promise<void> => {
      log.warn("Shutting down Fack runner...");
      await server.stop();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err: unknown) {
    const error = err as Record<string, unknown>;
    if (error?.code === "EADDRINUSE") {
      log.error(`Port ${port} is already in use by another process.`);
      log.muted("Try running on a different port:");
      log.raw(`  fack dev --port ${port + 1}`);
      log.blank();
    } else {
      log.error(
        err instanceof Error ? err : `Failed to start server: ${String(err)}`,
      );
    }
    process.exit(1);
  }
}
