#!/usr/bin/env node

/**
 * Fack CLI - Main Entrypoint
 *
 * Lightweight, zero-dependency local mock runner.
 */

import fs from "node:fs";
import path from "node:path";
import { runDev } from "./commands/dev.command";
import { runPull } from "./commands/pull.command";
import { runInspect } from "./commands/inspect.command";
import { runInit } from "./commands/init.command";

const VERSION = "1.19.0";

function printHelp(): void {
  console.log(`
\x1b[36m\x1b[1m⚡ Fack API Local CLI\x1b[0m \x1b[2mv${VERSION}\x1b[0m
Zero-overhead local runner for encrypted mock API projects.

\x1b[1mUSAGE\x1b[0m
  fack <command> [options]

\x1b[1mCOMMANDS\x1b[0m
  \x1b[32mdev\x1b[0m [file]               Starts the local mock HTTP server (default: fack.enc)
  \x1b[32mpull\x1b[0m <slug>             Pulls the latest encrypted bundle from Fack Studio
  \x1b[32minspect\x1b[0m [file]          Inspects endpoints, routes, and chaos rules in terminal
  \x1b[32minit\x1b[0m                    Configures .env with your project secret key

\x1b[1mOPTIONS\x1b[0m
  --key, -k <key>         Project decryption / sync secret key
  --port, -p <port>       Port to serve mock endpoints on (default: 4000)
  --host <host>           Host to bind on (default: 0.0.0.0)
  --url, -u <url>         Fack Studio base URL (default: http://localhost:3000)
  --out, -o <path>        Output path for downloaded bundle (default: fack.enc)
  --silent, -s            Suppress request logging output
  --help, -h              Show this help message
  --version, -v           Show version

\x1b[1mEXAMPLES\x1b[0m
  $ fack pull my-app --key fack_sec_a8b9...
  $ fack dev
  $ fack dev --port 5000
  $ fack inspect
`);
}

interface ParsedArgs {
  command: string;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(args: string[]): ParsedArgs {
  let command = "";
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  const aliasMap: Record<string, string> = {
    k: "key",
    p: "port",
    u: "url",
    o: "out",
    s: "silent",
    h: "help",
    v: "version",
  };

  const valueFlags = new Set([
    "key",
    "k",
    "port",
    "p",
    "host",
    "url",
    "u",
    "out",
    "o",
    "file",
    "slug",
  ]);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const eqIndex = arg.indexOf("=");
      if (eqIndex > 0) {
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        flags[key] = value;
      } else {
        const key = arg.slice(2);
        if (
          valueFlags.has(key) &&
          i + 1 < args.length &&
          !args[i + 1].startsWith("-")
        ) {
          flags[key] = args[i + 1];
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else if (arg.startsWith("-")) {
      const eqIndex = arg.indexOf("=");
      if (eqIndex > 0) {
        const rawKey = arg.slice(1, eqIndex);
        const resolvedKey = aliasMap[rawKey] || rawKey;
        const value = arg.slice(eqIndex + 1);
        flags[resolvedKey] = value;
      } else {
        const rawKey = arg.slice(1);
        const resolvedKey = aliasMap[rawKey] || rawKey;
        if (
          valueFlags.has(rawKey) &&
          i + 1 < args.length &&
          !args[i + 1].startsWith("-")
        ) {
          flags[resolvedKey] = args[i + 1];
          i++;
        } else {
          flags[resolvedKey] = true;
        }
      }
    } else if (!command) {
      command = arg;
    } else {
      positionals.push(arg);
    }
  }

  return { command, positionals, flags };
}

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const { command, positionals, flags } = parseArgs(rawArgs);

  if (flags.help || flags.h) {
    printHelp();
    return;
  }

  if (flags.version || flags.v) {
    console.log(`fack v${VERSION}`);
    return;
  }

  // Determine command: if empty, check if fack.enc exists or if dev flags were passed
  let effectiveCommand = command.toLowerCase();
  if (!effectiveCommand) {
    const defaultBundlePath = path.resolve(process.cwd(), "fack.enc");
    const hasDevFlags =
      flags.port || flags.key || flags.host || flags.silent || flags.file;

    if (hasDevFlags || fs.existsSync(defaultBundlePath)) {
      effectiveCommand = "dev";
    } else {
      printHelp();
      return;
    }
  }

  const secretKey = (flags.key as string) || undefined;

  switch (effectiveCommand) {
    case "dev":
    case "start":
    case "serve": {
      const file = positionals[0] || (flags.file as string) || "fack.enc";
      const port = flags.port ? parseInt(flags.port as string, 10) : undefined;
      const host = (flags.host as string) || undefined;
      const silent = Boolean(flags.silent);

      await runDev({
        file,
        port,
        host,
        key: secretKey,
        silent,
      });
      break;
    }

    case "pull":
    case "sync":
    case "fetch": {
      const projectSlug = positionals[0] || (flags.slug as string) || "";
      const out = (flags.out as string) || "fack.enc";
      const url = (flags.url as string) || undefined;

      await runPull({
        projectSlug,
        key: secretKey,
        out,
        url,
      });
      break;
    }

    case "inspect":
    case "list":
    case "routes": {
      const file = positionals[0] || (flags.file as string) || "fack.enc";
      await runInspect({
        file,
        key: secretKey,
      });
      break;
    }

    case "init": {
      const projectSlug = positionals[0] || (flags.slug as string) || undefined;
      await runInit({
        projectSlug,
        key: secretKey,
      });
      break;
    }

    default: {
      console.error(`\x1b[31m[fack] Unknown command: "${command}"\x1b[0m\n`);
      printHelp();
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(`\x1b[31m[fack] Fatal error: ${String(err)}\x1b[0m`);
  process.exit(1);
});
