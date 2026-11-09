/**
 * Fack CLI - Inspect Command
 *
 * Inspects routes, endpoints, latency, and status codes of an encrypted bundle in the terminal.
 */

import fs from "node:fs";
import path from "node:path";
import { decryptBundle } from "../../../lib/bundle/bundle-crypto.service";
import { loadLocalEnv } from "../services/project-files.service";
import type { InspectCommandOptions } from "../cli.type";
import { banner, log, logger, printFields, t } from "../ui/terminal";

export async function runInspect(
  options: InspectCommandOptions,
): Promise<void> {
  loadLocalEnv();

  const filePath = path.resolve(process.cwd(), options.file || "fack.enc");

  if (!fs.existsSync(filePath)) {
    log.error(`Bundle file not found at ${filePath}`);
    process.exit(1);
  }

  const secretKey = options.key || process.env.FACK_PROJECT_KEY;
  if (!secretKey) {
    log.error(
      "Project secret key is required (--key or FACK_PROJECT_KEY in .env).",
    );
    process.exit(1);
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const { bundle } = decryptBundle(buffer, secretKey);

    banner("Fack Project Inspection");
    printFields([
      ["Name", bundle.projectName],
      ["Slug", bundle.projectSlug],
      ["Version", `v${bundle.version}`],
      ["Exported", bundle.exportedAt],
      ["Endpoints", String(bundle.endpoints.length)],
      ["Routes", String(bundle.routes.length)],
      ["Scenarios", String(bundle.scenarios.length)],
      ["Mock States", String(bundle.mockStates.length)],
    ]);

    log.blank();
    log.info(t.bold("Configured Routes"));
    logger.raw(t.dim("─".repeat(70)));

    for (const route of bundle.routes) {
      const method = logger.theme.method(route.method);
      const status = logger.theme.status(route.statusCode);
      const latency = t.dim(
        `${route.latencyMin}-${route.latencyMax}ms`.padEnd(10),
      );
      const auth = route.isAuthRequired ? t.yellow("[Auth]") : "      ";
      logger.raw(` ${method} ${status} ${latency} ${auth} ${route.fullPath}`);
    }

    logger.raw(t.dim("─".repeat(70)));
    log.blank();
  } catch (err) {
    log.error(err instanceof Error ? err : String(err));
    process.exit(1);
  }
}
