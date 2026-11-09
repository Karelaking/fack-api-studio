import { SYSLOG_SEVERITY } from "./log-level";
import type {
  LogRecord,
  RequestLogEntry,
  ResolvedLoggerOptions,
  SerializedError,
} from "./logger.types";
import { BADGE_LABEL, LEVEL_TONE, type Theme } from "./logger.theme";
import {
  formatClockTime,
  formatDuration,
  formatIsoTime,
  redactValue,
  stripAnsi,
  stripAnsiDeep,
} from "./logger.utils";

function metadataValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    return /\s/.test(value) ? JSON.stringify(value) : value;
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  return JSON.stringify(redactValue(value));
}

function formatMetadata(metadata: Record<string, unknown>): string {
  return Object.entries(metadata)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${metadataValue(value)}`)
    .join(" ");
}

function formatRequestPlain(request: RequestLogEntry): string {
  const note = request.note ? `, ${request.note}` : "";
  return `${request.method.toUpperCase()} ${request.path} -> ${
    request.status
  } (${formatDuration(request.durationMs)}${note})`;
}

function formatErrorPlain(error: SerializedError, indent = "  "): string {
  const lines = [`${indent}${error.name}: ${error.message}`];
  if (error.code) lines.push(`${indent}code: ${error.code}`);
  if (error.stack) {
    const frames = error.stack
      .split("\n")
      .slice(1)
      .map((line) => `${indent}  ${line.trim()}`);
    lines.push(...frames);
  }
  if (error.cause) {
    lines.push(
      typeof error.cause === "string"
        ? `${indent}caused by: ${error.cause}`
        : formatErrorPlain(error.cause, `${indent}  `),
    );
  }
  return lines.join("\n");
}

function formatRequestPretty(request: RequestLogEntry, theme: Theme): string {
  const note = request.note ? theme.meta(`, ${request.note}`) : "";
  return [
    theme.method(request.method),
    request.path,
    theme.meta("->"),
    theme.status(request.status),
    `${theme.meta("(")}${theme.duration(request.durationMs)}${note}${theme.meta(
      ")",
    )}`,
  ].join(" ");
}

function formatErrorPretty(
  error: SerializedError,
  theme: Theme,
  indent = "  ",
): string {
  const lines = [`${indent}${theme.error(`${error.name}: ${error.message}`)}`];
  if (error.code) lines.push(`${indent}${theme.meta(`code: ${error.code}`)}`);
  if (error.stack) {
    const frames = error.stack
      .split("\n")
      .slice(1)
      .map((line) => `${indent}  ${theme.note(line.trim())}`);
    lines.push(...frames);
  }
  if (error.cause) {
    lines.push(
      typeof error.cause === "string"
        ? `${indent}${theme.meta(`caused by: ${error.cause}`)}`
        : formatErrorPretty(error.cause, theme, `${indent}  `),
    );
  }
  return lines.join("\n");
}

export function formatPretty(
  record: LogRecord,
  options: ResolvedLoggerOptions,
  theme: Theme,
): string {
  const parts: string[] = [];

  if (options.timestamp) parts.push(theme.time(formatClockTime(record.time)));

  const tone =
    record.variant === "success" ? "success" : LEVEL_TONE[record.level];
  parts.push(theme.badge(tone));
  parts.push(theme.context(record.context));
  parts.push(
    record.request
      ? formatRequestPretty(record.request, theme)
      : record.message,
  );

  if (record.metadata && Object.keys(record.metadata).length > 0) {
    parts.push(theme.meta(formatMetadata(record.metadata)));
  }

  let line = parts.join("  ");
  if (record.error) line += `\n${formatErrorPretty(record.error, theme)}`;
  return line;
}

export function formatPlain(
  record: LogRecord,
  options: ResolvedLoggerOptions,
): string {
  const parts: string[] = [];

  if (options.timestamp) parts.push(formatIsoTime(record.time));

  if (record.variant === "note") {
    parts.push(`[${record.context}]`);
  } else {
    const tone =
      record.variant === "success" ? "success" : LEVEL_TONE[record.level];
    parts.push(BADGE_LABEL[tone].trimEnd());
    parts.push(`[${record.context}]`);
  }

  parts.push(
    record.request ? formatRequestPlain(record.request) : record.message,
  );

  if (record.metadata && Object.keys(record.metadata).length > 0) {
    parts.push(formatMetadata(record.metadata));
  }

  let line = parts.join(" ");
  if (record.error) line += `\n${formatErrorPlain(record.error)}`;
  return line;
}

export function formatJson(record: LogRecord): string {
  const level =
    record.level === "log"
      ? "info"
      : record.level === "verbose"
        ? "trace"
        : record.level;

  const payload: Record<string, unknown> = {
    time: formatIsoTime(record.time),
    level,
    severity: SYSLOG_SEVERITY[record.level],
    context: record.context,
    pid: process.pid,
    message: stripAnsi(record.message),
  };

  if (record.variant) payload.variant = record.variant;
  if (record.metadata && Object.keys(record.metadata).length > 0) {
    payload.meta = stripAnsiDeep(record.metadata);
  }
  if (record.request) {
    payload.request = stripAnsiDeep(record.request);
  }
  if (record.error) payload.err = stripAnsiDeep(record.error);

  return JSON.stringify(payload);
}

export function formatNotePretty(
  context: string,
  message: string,
  theme: Theme,
): string {
  return `  ${theme.context(context)}  ${theme.note(message)}`;
}
