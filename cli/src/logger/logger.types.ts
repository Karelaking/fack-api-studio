import type { LogLevel, LogThreshold } from "./log-level";

export type LogFormat = "pretty" | "plain" | "json";

export type LogStream = "stdout" | "stderr";

export interface RequestLogEntry {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  note?: string;
}

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  cause?: SerializedError | string;
}

export interface LogMetadata {
  [key: string]: unknown;
}

export interface LogRecord {
  time: number;
  level: LogLevel;
  context: string;
  message: string;
  /** Display-only tone for records that share a severity, such as success. */
  variant?: "success" | "note";
  metadata?: LogMetadata;
  error?: SerializedError;
  request?: RequestLogEntry;
}

export type LogSink = (
  record: LogRecord,
  line: string,
  stream: LogStream,
) => void;

export interface LoggerOptions {
  /** Minimum severity to emit. Defaults to FACK_LOG_LEVEL, LOG_LEVEL, or `log`. */
  level?: LogThreshold;
  /** Output format. Defaults to FACK_LOG_FORMAT, or pretty on a TTY. */
  format?: LogFormat;
  /** Force ANSI colors on or off. Defaults to NO_COLOR / FORCE_COLOR / TTY. */
  colors?: boolean;
  /** Prefix records with a timestamp. Defaults to true. */
  timestamp?: boolean;
  /** Redact secrets from messages and metadata. Defaults to true. */
  redact?: boolean;
  /** Capture output instead of writing to stdout/stderr. */
  sink?: LogSink;
}

export interface ResolvedLoggerOptions extends Required<
  Omit<LoggerOptions, "sink">
> {
  sink?: LogSink;
}

/**
 * The NestJS `LoggerService` shape, plus `success` for command feedback.
 * `log` is the NestJS name for informational output; `info` is an alias.
 */
export interface LoggerService {
  log(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  success(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string | Error, metadata?: LogMetadata): void;
  debug(message: string, metadata?: LogMetadata): void;
  verbose(message: string, metadata?: LogMetadata): void;
  fatal(message: string | Error, metadata?: LogMetadata): void;
}
