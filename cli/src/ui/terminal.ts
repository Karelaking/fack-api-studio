/**
 * Fack CLI — terminal presentation helpers.
 *
 * Built on the shared NestJS-style logger and @clack/prompts. Every helper
 * respects NO_COLOR, non-TTY output, and FACK_LOG_FORMAT so command output and
 * live request logs share one visual system.
 */

import pc from "picocolors";
import {
  intro,
  outro,
  spinner,
  note,
  cancel,
  isCancel,
  select,
  confirm,
  text,
} from "@clack/prompts";
import { logger } from "../logger";
import { stripAnsi } from "../logger/logger.utils";

export {
  intro,
  outro,
  spinner,
  note,
  cancel,
  isCancel,
  select,
  confirm,
  text,
  pc,
};
export {
  Logger,
  RequestLogger,
  configureLogger,
  createLogger,
  logger,
} from "../logger";
export type {
  LoggerOptions,
  LoggerService,
  LogFormat,
  LogLevel,
  LogMetadata,
  LogRecord,
  LogThreshold,
  RequestLogEntry,
} from "../logger";

export { stripAnsi };

export const t = {
  bold: pc.bold,
  dim: pc.dim,
  italic: pc.italic,
  underline: pc.underline,
  red: pc.red,
  green: pc.green,
  yellow: pc.yellow,
  blue: pc.blue,
  magenta: pc.magenta,
  cyan: pc.cyan,
  gray: pc.gray,
};

/**
 * Backwards-compatible command feedback API.
 *
 * New code should import `Logger`/`createLogger` and give each module its own
 * context. These helpers keep the existing `[fack]` context and route through
 * the same formatter, level filter, and redaction pipeline.
 */
export const log = {
  info(message: string): void {
    logger.log(message);
  },
  success(message: string): void {
    logger.success(message);
  },
  warn(message: string): void {
    logger.warn(message);
  },
  error(message: string | Error): void {
    logger.error(message);
  },
  muted(message: string): void {
    logger.note(message);
  },
  debug(message: string): void {
    logger.debug(message);
  },
  blank(): void {
    logger.blank();
  },
  raw(line: string): void {
    logger.raw(line);
  },
};

export function banner(title: string, subtitle?: string): void {
  logger.banner(title, subtitle);
}

export function printCommand(command: string): void {
  logger.raw(`  ${t.green("$")} ${t.bold(command)}`);
}

export function printFields(
  fields: Array<[label: string, value: string]>,
  options: { indent?: number; labelWidth?: number } = {},
): void {
  const indent = " ".repeat(options.indent ?? 2);
  const labelWidth =
    options.labelWidth ??
    fields.reduce((width, [label]) => Math.max(width, label.length), 0);

  for (const [label, value] of fields) {
    logger.raw(`${indent}${t.dim(label.padEnd(labelWidth))}${value}`);
  }
}

export function printTable(headers: string[], rows: string[][]): void {
  const widths = headers.map((header, index) =>
    Math.max(
      header.length,
      ...rows.map((row) => stripAnsi(row[index] ?? "").length),
    ),
  );

  const format = (cells: string[]): string =>
    cells
      .map((cell, index) => {
        const padding = " ".repeat(
          Math.max(0, widths[index] - stripAnsi(cell).length),
        );
        return `${cell}${padding}`;
      })
      .join("  ")
      .trimEnd();

  logger.raw(t.dim(format(headers)));
  for (const row of rows) {
    logger.raw(format(row));
  }
}

/** One endpoint row in the `fack dev` and `fack inspect` summaries. */
export function printRoute(route: {
  method: string;
  fullPath: string;
  statusCode: number;
  isAuthRequired?: boolean;
}): void {
  const method = logger.theme.method(route.method);
  const auth = route.isAuthRequired ? `${t.yellow("[Auth]")} ` : "";
  logger.raw(
    `  ${method} ${auth}${route.fullPath} ${t.dim(`-> ${route.statusCode}`)}`,
  );
}

/** Sleeps without pulling in a dependency. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
