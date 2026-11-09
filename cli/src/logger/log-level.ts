/**
 * Fack CLI — log levels and severity.
 *
 * Levels follow NestJS's Logger vocabulary (`fatal` → `verbose`) and carry an
 * RFC 5424 / syslog severity so structured output can be consumed by standard
 * log pipelines without a translation table.
 */

export const LOG_LEVELS = [
  "fatal",
  "error",
  "warn",
  "log",
  "debug",
  "verbose",
] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

/** The minimum level a logger emits, or `silent` to suppress everything. */
export type LogThreshold = LogLevel | "silent";

/** Lower numbers are more severe. A record emits when it is at or above the threshold. */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  log: 3,
  debug: 4,
  verbose: 5,
};

/** RFC 5424 / syslog severity (0–7) for structured log consumers. */
export const SYSLOG_SEVERITY: Record<LogLevel, number> = {
  fatal: 2, // critical
  error: 3, // error
  warn: 4, // warning
  log: 6, // informational
  debug: 7, // debug
  verbose: 7, // debug
};

const ALIASES: Record<string, LogThreshold> = {
  fatal: "fatal",
  critical: "fatal",
  crit: "fatal",
  error: "error",
  err: "error",
  warn: "warn",
  warning: "warn",
  log: "log",
  info: "log",
  notice: "log",
  debug: "debug",
  verbose: "verbose",
  trace: "verbose",
  silent: "silent",
  off: "silent",
  none: "silent",
};

export function isLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as readonly string[]).includes(value);
}

export function parseLogThreshold(
  value: string | undefined,
): LogThreshold | undefined {
  if (!value) return undefined;
  return ALIASES[value.trim().toLowerCase()];
}

export function shouldLog(level: LogLevel, threshold: LogThreshold): boolean {
  if (threshold === "silent") return false;
  return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[threshold];
}
