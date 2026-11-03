/**
 * Fack CLI - Inspect Command
 *
 * Inspects routes, endpoints, latency, and status codes of an encrypted bundle in the terminal.
 */

import fs from "node:fs";
import path from "node:path";
import { decryptBundle } from "../../../lib/bundle/bundle-crypto.service";
import type { InspectCommandOptions } from "../cli.type";

function loadLocalEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  try {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch {
    // Ignore unreadable .env
  }
}

export async function runInspect(
  options: InspectCommandOptions,
): Promise<void> {
  loadLocalEnv();

  const filePath = path.resolve(process.cwd(), options.file || "fack.enc");

  if (!fs.existsSync(filePath)) {
    console.error(
      `\x1b[31m[fack] Error: Bundle file not found at ${filePath}\x1b[0m`,
    );
    process.exit(1);
  }

  const secretKey = options.key || process.env.FACK_PROJECT_KEY;
  if (!secretKey) {
    console.error(
      "\x1b[31m[fack] Error: Project secret key is required (--key or FACK_PROJECT_KEY in .env).\x1b[0m",
    );
    process.exit(1);
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const { bundle } = decryptBundle(buffer, secretKey);

    console.log("\n\x1b[36m\x1b[1m⚡ Fack Project Inspection\x1b[0m");
    console.log(`\x1b[2mName:\x1b[0m        ${bundle.projectName}`);
    console.log(`\x1b[2mSlug:\x1b[0m        ${bundle.projectSlug}`);
    console.log(`\x1b[2mVersion:\x1b[0m     v${bundle.version}`);
    console.log(`\x1b[2mExported:\x1b[0m    ${bundle.exportedAt}`);
    console.log(`\x1b[2mEndpoints:\x1b[0m   ${bundle.endpoints.length}`);
    console.log(`\x1b[2mRoutes:\x1b[0m      ${bundle.routes.length}`);
    console.log(`\x1b[2mScenarios:\x1b[0m   ${bundle.scenarios.length}`);
    console.log(`\x1b[2mMock States:\x1b[0m ${bundle.mockStates.length}\n`);

    console.log("\x1b[1mConfigured Routes:\x1b[0m");
    console.log("─".repeat(70));
    for (const route of bundle.routes) {
      const method = route.method.padEnd(7);
      const status = String(route.statusCode).padEnd(4);
      const latency = `${route.latencyMin}-${route.latencyMax}ms`.padEnd(10);
      const auth = route.isAuthRequired ? "[Auth]" : "      ";
      console.log(
        ` \x1b[34m${method}\x1b[0m \x1b[32m${status}\x1b[0m \x1b[2m${latency}\x1b[0m \x1b[33m${auth}\x1b[0m ${route.fullPath}`,
      );
    }
    console.log("─".repeat(70) + "\n");
  } catch (err) {
    console.error(`\x1b[31m[fack] ${String(err)}\x1b[0m`);
    process.exit(1);
  }
}
