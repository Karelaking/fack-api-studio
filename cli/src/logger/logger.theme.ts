import pc from "picocolors";
import type { LogLevel } from "./log-level";
import { formatDuration } from "./logger.utils";

type Colors = ReturnType<typeof pc.createColors>;

export type BadgeTone =
  | "fatal"
  | "error"
  | "warn"
  | "info"
  | "success"
  | "debug"
  | "trace";

export const BADGE_LABEL: Record<BadgeTone, string> = {
  fatal: "FATAL",
  error: "ERROR",
  warn: "WARN ",
  info: "INFO ",
  success: "DONE ",
  debug: "DEBUG",
  trace: "TRACE",
};

export const LEVEL_TONE: Record<LogLevel, BadgeTone> = {
  fatal: "fatal",
  error: "error",
  warn: "warn",
  log: "info",
  debug: "debug",
  verbose: "trace",
};

export interface Theme {
  colors: boolean;
  paint: Colors;
  badge(tone: BadgeTone): string;
  context(context: string): string;
  time(value: string): string;
  note(value: string): string;
  meta(value: string): string;
  method(method: string): string;
  status(status: number): string;
  duration(ms: number): string;
  error(value: string): string;
  heading(value: string): string;
  rule(value: string): string;
}

/**
 * Terminal tokens derived from DESIGN.md's semantic palette.
 *
 * Terminals are a 16-color medium, so the OKLCH roles translate to the closest
 * ANSI hue: verified green, caution amber, protocol blue/cyan, and fault red.
 * HTTP methods keep the studio's fixed spectrum; PATCH uses magenta because
 * ANSI has no distinct orange.
 */
export function createTheme(colors: boolean): Theme {
  const c = pc.createColors(colors);

  const badge = (tone: BadgeTone): string => {
    const label = BADGE_LABEL[tone];
    switch (tone) {
      case "fatal":
        return c.bgRed(c.white(label));
      case "error":
        return c.bold(c.red(label));
      case "warn":
        return c.bold(c.yellow(label));
      case "info":
        return c.bold(c.cyan(label));
      case "success":
        return c.bold(c.green(label));
      case "debug":
        return c.bold(c.magenta(label));
      case "trace":
        return c.gray(label);
      default:
        return label;
    }
  };

  return {
    colors,
    paint: c,
    badge,
    context: (context) => c.dim(`[${context}]`),
    time: (value) => c.dim(value),
    note: (value) => c.dim(value),
    meta: (value) => c.dim(value),
    method: (method) => {
      const label = method.toUpperCase().padEnd(6);
      switch (method.toUpperCase()) {
        case "GET":
          return c.green(label);
        case "POST":
          return c.blue(label);
        case "PUT":
          return c.yellow(label);
        case "PATCH":
          return c.magenta(label);
        case "DELETE":
          return c.red(label);
        case "OPTIONS":
        case "HEAD":
          return c.gray(label);
        default:
          return c.cyan(label);
      }
    },
    status: (status) => {
      const label = String(status).padEnd(3);
      if (status >= 200 && status < 300) return c.green(label);
      if (status >= 300 && status < 400) return c.cyan(label);
      if (status >= 400 && status < 500) return c.yellow(label);
      if (status >= 500) return c.red(label);
      return c.gray(label);
    },
    duration: (ms) => {
      const label = formatDuration(ms);
      if (ms >= 3000) return c.red(label);
      if (ms >= 1000) return c.yellow(label);
      return c.dim(label);
    },
    error: (value) => c.red(value),
    heading: (value) => c.bold(value),
    rule: (value) => c.dim(value),
  };
}
