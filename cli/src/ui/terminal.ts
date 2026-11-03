/**
 * Fack CLI — terminal presentation helpers.
 *
 * Built with picocolors and @clack/prompts for an award-winning developer experience.
 * Automatically respects NO_COLOR and non-TTY environments for clean CI output.
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

export const log = {
  info(message: string): void {
    console.log(`${t.cyan("[fack]")} ${message}`);
  },
  success(message: string): void {
    console.log(`${t.green("✔")} ${message}`);
  },
  warn(message: string): void {
    console.log(`${t.yellow("!")} ${message}`);
  },
  error(message: string): void {
    console.error(`${t.red("[fack]")} ${message}`);
  },
  muted(message: string): void {
    console.log(t.dim(message));
  },
  blank(): void {
    console.log("");
  },
};

export function banner(title: string, subtitle?: string): void {
  console.log("");
  console.log(`${t.cyan(t.bold("⚡"))} ${t.bold(title)}`);
  if (subtitle) console.log(t.dim(subtitle));
  console.log("");
}

export function printCommand(command: string): void {
  console.log(`  ${t.green("$")} ${t.bold(command)}`);
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

  console.log(t.dim(format(headers)));
  for (const row of rows) {
    console.log(format(row));
  }
}

function stripAnsi(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/\x1b\[[0-9;]*m/g, "");
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
