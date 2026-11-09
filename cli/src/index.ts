#!/usr/bin/env node

/**
 * Fack CLI - Main Entrypoint
 *
 * Ultra-fast, zero-overhead local mock runner built with Commander.
 */

import fs from "node:fs";
import path from "node:path";
import { Command, InvalidArgumentError } from "commander";
import { runDev } from "./commands/dev.command";
import { runPull } from "./commands/pull.command";
import { runInspect } from "./commands/inspect.command";
import { runInit } from "./commands/init.command";
import { runLogin } from "./commands/login.command";
import { runLogout } from "./commands/logout.command";
import { runProjects } from "./commands/projects.command";
import { runWhoami } from "./commands/whoami.command";
import { logger, pc } from "./ui/terminal";

const VERSION = "1.19.0";

function parsePort(value: string): number {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new InvalidArgumentError(
      "Port must be an integer between 1 and 65535.",
    );
  }
  return port;
}

export function buildCliProgram(): Command {
  const program = new Command();

  program
    .name("fack")
    .description(
      `${pc.cyan(pc.bold("⚡ Fack API Local CLI"))}\n${pc.dim(
        "Zero-overhead local runner for encrypted mock API projects.",
      )}`,
    )
    .version(VERSION, "-v, --version", "Show current CLI version");

  program
    .command("dev [file]")
    .alias("start")
    .alias("serve")
    .description("Starts the local mock HTTP server (default: fack.enc)")
    .option("-p, --port <port>", "Port to serve mock endpoints on", parsePort)
    .option(
      "-h, --host <host>",
      "Host to bind on (default: 0.0.0.0)",
      "0.0.0.0",
    )
    .option("-k, --key <key>", "Project decryption / sync secret key")
    .option("-s, --silent", "Suppress request logging output", false)
    .action(
      async (
        file: string | undefined,
        options: {
          port?: number;
          host?: string;
          key?: string;
          silent?: boolean;
        },
      ): Promise<void> => {
        await runDev({
          file: file || "fack.enc",
          port: options.port,
          host: options.host,
          key: options.key,
          silent: options.silent,
        });
      },
    );

  program
    .command("pull [slug]")
    .alias("sync")
    .alias("fetch")
    .description("Pulls the latest encrypted bundle from Fack Studio")
    .option("-k, --key <key>", "Project secret key")
    .option("-o, --out <path>", "Output path for downloaded bundle", "fack.enc")
    .option(
      "-u, --url <url>",
      "Fack Studio base URL (default: https://lotusapi-studio.vercel.app)",
    )
    .action(
      async (
        slug: string | undefined,
        options: {
          key?: string;
          out?: string;
          url?: string;
        },
      ): Promise<void> => {
        await runPull({
          projectSlug: slug || "",
          key: options.key,
          out: options.out,
          url: options.url,
        });
      },
    );

  program
    .command("inspect [file]")
    .alias("list")
    .alias("routes")
    .description("Inspects endpoints, routes, and chaos rules in terminal")
    .option("-k, --key <key>", "Project decryption / sync secret key")
    .action(
      async (
        file: string | undefined,
        options: {
          key?: string;
        },
      ): Promise<void> => {
        await runInspect({
          file: file || "fack.enc",
          key: options.key,
        });
      },
    );

  program
    .command("init [slug]")
    .description("Connects Studio, downloads bundle, and provisions .env")
    .option("-k, --key <key>", "Project secret key")
    .option(
      "-u, --url <url>",
      "Fack Studio base URL (default: https://lotusapi-studio.vercel.app)",
    )
    .option("-o, --out <path>", "Output path for downloaded bundle")
    .action(
      async (
        slug: string | undefined,
        options: {
          key?: string;
          url?: string;
          out?: string;
        },
      ): Promise<void> => {
        await runInit({
          projectSlug: slug,
          key: options.key,
          url: options.url,
          out: options.out,
        });
      },
    );

  program
    .command("login")
    .alias("auth")
    .description("Authorizes this terminal via device approval flow")
    .option(
      "-u, --url <url>",
      "Fack Studio base URL (default: https://lotusapi-studio.vercel.app)",
    )
    .option(
      "--device-name <name>",
      "Custom label for this terminal during login",
    )
    .action(
      async (options: { url?: string; deviceName?: string }): Promise<void> => {
        await runLogin({
          url: options.url,
          deviceName: options.deviceName,
        });
      },
    );

  program
    .command("logout")
    .description("Revokes terminal token and clears stored credentials")
    .option(
      "-u, --url <url>",
      "Fack Studio base URL (default: https://lotusapi-studio.vercel.app)",
    )
    .action(async (options: { url?: string }): Promise<void> => {
      await runLogout({ url: options.url });
    });

  program
    .command("projects")
    .alias("proj")
    .description("Lists all Studio projects accessible to this terminal")
    .option(
      "-u, --url <url>",
      "Fack Studio base URL (default: https://lotusapi-studio.vercel.app)",
    )
    .option("-j, --json", "Output results as JSON", false)
    .action(
      async (options: { url?: string; json?: boolean }): Promise<void> => {
        await runProjects({
          url: options.url,
          json: options.json,
        });
      },
    );

  program
    .command("whoami")
    .alias("me")
    .description("Displays current Studio account and terminal status")
    .option(
      "-u, --url <url>",
      "Fack Studio base URL (default: https://lotusapi-studio.vercel.app)",
    )
    .option("-j, --json", "Output results as JSON", false)
    .action(
      async (options: { url?: string; json?: boolean }): Promise<void> => {
        await runWhoami({
          url: options.url,
          json: options.json,
        });
      },
    );

  return program;
}

async function main(): Promise<void> {
  const program = buildCliProgram();
  const rawArgs = process.argv.slice(2);

  const knownCommands = new Set([
    "dev",
    "start",
    "serve",
    "pull",
    "sync",
    "fetch",
    "inspect",
    "list",
    "routes",
    "init",
    "login",
    "auth",
    "logout",
    "projects",
    "proj",
    "whoami",
    "me",
    "help",
    "--help",
    "-h",
    "--version",
    "-v",
    "-V",
  ]);

  // If invoked with no arguments:
  if (rawArgs.length === 0) {
    const defaultBundlePath = path.resolve(process.cwd(), "fack.enc");
    if (fs.existsSync(defaultBundlePath)) {
      await runDev({ file: "fack.enc" });
      return;
    }
    program.outputHelp();
    return;
  }

  // If first argument is a flag like `-p` or `--port`, route to `dev`
  const firstArg = rawArgs[0];
  if (firstArg && !knownCommands.has(firstArg) && firstArg.startsWith("-")) {
    rawArgs.unshift("dev");
  }

  await program.parseAsync(rawArgs, { from: "user" });
}

main().catch((err) => {
  logger.fatal(err);
  process.exit(1);
});
