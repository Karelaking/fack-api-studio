/**
 * Fack CLI — terminal presentation helpers.
 *
 * Colour is opt-out (NO_COLOR or a piped stdout) so logs stay clean in CI.
 */

const COLOUR_ENABLED = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

function wrap(open: string, close: string): (value: string) => string {
  return (value: string): string =>
    COLOUR_ENABLED ? `\x1b[${open}m${value}\x1b[${close}m` : value;
}

export const t = {
  bold: wrap("1", "22"),
  dim: wrap("2", "22"),
  italic: wrap("3", "23"),
  underline: wrap("4", "24"),
  red: wrap("31", "39"),
  green: wrap("32", "39"),
  yellow: wrap("33", "39"),
  blue: wrap("34", "39"),
  magenta: wrap("35", "39"),
  cyan: wrap("36", "39"),
  gray: wrap("90", "39"),
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
