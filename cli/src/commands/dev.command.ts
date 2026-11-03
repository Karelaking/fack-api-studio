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

export async function runDev(options: DevCommandOptions): Promise<void> {
  loadLocalEnv();
  const config = loadFackRc();

  const filePath = path.resolve(process.cwd(), options.file || "fack.enc");

  if (!fs.existsSync(filePath)) {
    console.error(
      `\x1b[31m[fack] Error: Bundle file not found at ${filePath}\x1b[0m`,
    );
    console.log("\x1b[33mTo get started, either:\x1b[0m");
    console.log(
      "  1. Download 'fack.enc' from Fack Studio dashboard into this folder.",
    );
    console.log("  2. Run: fack pull <project-slug> --key <secret-key>\n");
    process.exit(1);
  }

  const secretKey = options.key || process.env.FACK_PROJECT_KEY;

  if (!secretKey) {
    console.error(
      "\x1b[31m[fack] Error: Project secret key is required to decrypt the bundle.\x1b[0m",
    );
    console.log("\x1b[33mProvide it via:\x1b[0m");
    console.log("  --key <secret-key>");
    console.log("  or set FACK_PROJECT_KEY in your .env file.\n");
    process.exit(1);
  }

  let bundleBuffer: Buffer;
  try {
    bundleBuffer = fs.readFileSync(filePath);
  } catch (err) {
    console.error(
      `\x1b[31m[fack] Failed to read bundle file: ${String(err)}\x1b[0m`,
    );
    process.exit(1);
  }

  let decryptedBundle;
  try {
    const result = decryptBundle(bundleBuffer, secretKey);
    decryptedBundle = result.bundle;
  } catch (err) {
    console.error(`\x1b[31m[fack] ${String(err)}\x1b[0m`);
    process.exit(1);
  }

  const rawPort =
    options.port ?? config.port ?? parseInt(process.env.PORT || "4000", 10);
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(
      `\x1b[31m[fack] Error: Invalid port "${rawPort}". Port must be an integer between 1 and 65535.\x1b[0m`,
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
    console.log("\n\x1b[36m\x1b[1m⚡ Fack API Local Runner\x1b[0m");
    console.log(
      `\x1b[2mProject:\x1b[0m   \x1b[1m${decryptedBundle.projectName}\x1b[0m \x1b[2m(${decryptedBundle.projectSlug})\x1b[0m`,
    );
    console.log(
      `\x1b[2mServing:\x1b[0m   \x1b[32mhttp://${displayHost}:${port}\x1b[0m`,
    );
    console.log(
      `\x1b[2mRoutes:\x1b[0m    \x1b[1m${decryptedBundle.routes.length}\x1b[0m active mock endpoints`,
    );
    console.log(
      `\x1b[2mHealth:\x1b[0m    http://${displayHost}:${port}/__fack/health\n`,
    );

    console.log("\x1b[1mAvailable Endpoints:\x1b[0m");
    const previewRoutes = decryptedBundle.routes.slice(0, 10);
    for (const route of previewRoutes) {
      const method = route.method.padEnd(6);
      const auth = route.isAuthRequired ? "\x1b[33m[Auth]\x1b[0m " : "";
      console.log(
        `  \x1b[34m${method}\x1b[0m ${auth}${route.fullPath} \x1b[2m-> ${route.statusCode}\x1b[0m`,
      );
    }
    if (decryptedBundle.routes.length > 10) {
      console.log(
        `  \x1b[2m... and ${decryptedBundle.routes.length - 10} more routes\x1b[0m`,
      );
    }
    console.log(
      "\n\x1b[2mReady for frontend requests. Press Ctrl+C to stop.\x1b[0m\n",
    );

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
              console.log(
                `\n\x1b[32m✔ [fack] Hot-reloaded ${updatedBundle.routes.length} mock routes from ${path.basename(filePath)}\x1b[0m\n`,
              );
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
      console.log("\n\x1b[33mShutting down Fack runner...\x1b[0m");
      await server.stop();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err: unknown) {
    const error = err as Record<string, unknown>;
    if (error?.code === "EADDRINUSE") {
      console.error(
        `\x1b[31m[fack] Port ${port} is already in use by another process.\x1b[0m`,
      );
      console.log(`\x1b[33mTry running on a different port:\x1b[0m`);
      console.log(`  fack dev --port ${port + 1}\n`);
    } else {
      console.error(
        `\x1b[31m[fack] Failed to start server: ${String(err)}\x1b[0m`,
      );
    }
    process.exit(1);
  }
}
