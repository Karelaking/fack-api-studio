import {
  parseLogThreshold,
  shouldLog,
  type LogLevel,
  type LogThreshold,
} from "./log-level";
import {
  formatJson,
  formatNotePretty,
  formatPlain,
  formatPretty,
} from "./logger.formatter";
import { createTheme, type Theme } from "./logger.theme";
import type {
  LoggerOptions,
  LoggerService,
  LogFormat,
  LogMetadata,
  LogRecord,
  LogStream,
  RequestLogEntry,
  ResolvedLoggerOptions,
} from "./logger.types";
import {
  formatDuration,
  redactText,
  redactValue,
  serializeError,
  stripAnsi,
} from "./logger.utils";

function detectFormat(): LogFormat {
  const value = process.env.FACK_LOG_FORMAT?.trim().toLowerCase();
  if (value === "json" || value === "plain" || value === "pretty") {
    return value;
  }
  return process.stdout.isTTY ? "pretty" : "plain";
}

function detectColors(): boolean {
  if (process.env.NO_COLOR) return false;

  const force = process.env.FORCE_COLOR;
  if (force !== undefined && force !== "0" && force !== "false") return true;

  if (process.env.TERM === "dumb") return false;
  return Boolean(process.stdout.isTTY);
}

function resolveOptions(options: LoggerOptions = {}): ResolvedLoggerOptions {
  const envLevel = parseLogThreshold(
    process.env.FACK_LOG_LEVEL ?? process.env.LOG_LEVEL,
  );

  return {
    level: options.level ?? envLevel ?? "log",
    format: options.format ?? detectFormat(),
    colors: options.colors ?? detectColors(),
    timestamp: options.timestamp ?? true,
    redact: options.redact ?? true,
    sink: options.sink,
  };
}

/**
 * NestJS-style logger with a context, level threshold, and structured output.
 *
 * ```ts
 * const logger = new Logger("DevCommand");
 * logger.log("Serving mock endpoints");
 * logger.request({ method: "GET", path: "/users", status: 200, durationMs: 8 });
 * ```
 */
export class Logger implements LoggerService {
  readonly context: string;
  private options: ResolvedLoggerOptions;
  private themeTokens: Theme;

  constructor(context = "fack", options: LoggerOptions = {}) {
    this.context = context;
    this.options = resolveOptions(options);
    this.themeTokens = createTheme(this.options.colors);
  }

  get format(): LogFormat {
    return this.options.format;
  }

  get level(): LogThreshold {
    return this.options.level;
  }

  get theme(): Theme {
    return this.themeTokens;
  }

  configure(options: LoggerOptions): this {
    this.options = resolveOptions({ ...this.options, ...options });
    this.themeTokens = createTheme(this.options.colors);
    return this;
  }

  setLevel(level: LogThreshold): this {
    this.options = { ...this.options, level };
    return this;
  }

  child(context: string, options: LoggerOptions = {}): Logger {
    return new Logger(context, { ...this.options, ...options });
  }

  isLevelEnabled(level: LogLevel): boolean {
    return shouldLog(level, this.options.level);
  }

  log(message: string, metadata?: LogMetadata): void {
    this.write("log", message, metadata);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.write("log", message, metadata);
  }

  success(message: string, metadata?: LogMetadata): void {
    this.write("log", message, metadata, "success");
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.write("warn", message, metadata);
  }

  error(message: string | Error, metadata?: LogMetadata): void {
    this.write("error", message, metadata);
  }

  fatal(message: string | Error, metadata?: LogMetadata): void {
    this.write("fatal", message, metadata);
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.write("debug", message, metadata);
  }

  verbose(message: string, metadata?: LogMetadata): void {
    this.write("verbose", message, metadata);
  }

  request(entry: RequestLogEntry): void {
    const level: LogLevel =
      entry.status >= 500 ? "error" : entry.status >= 400 ? "warn" : "log";
    if (!this.isLevelEnabled(level)) return;

    const note = entry.note ? `, ${entry.note}` : "";
    const message = `${entry.method.toUpperCase()} ${entry.path} -> ${
      entry.status
    } (${formatDuration(entry.durationMs)}${note})`;

    this.emit({
      time: Date.now(),
      level,
      context: this.context,
      message,
      request: entry,
    });
  }

  /** A dim continuation line for command output, not a diagnostic record. */
  note(message: string): void {
    if (!this.isLevelEnabled("log")) return;

    if (this.options.format === "json") {
      this.emit({
        time: Date.now(),
        level: "log",
        context: this.context,
        message,
        variant: "note",
      });
      return;
    }

    if (this.options.format === "plain") {
      this.writeLine(`[${this.context}] ${message}`, "stdout");
      return;
    }

    this.writeLine(
      formatNotePretty(this.context, message, this.theme),
      "stdout",
    );
  }

  blank(): void {
    if (!this.isLevelEnabled("log") || this.options.format === "json") return;
    this.writeLine("", "stdout");
  }

  /** A branded command banner. JSON mode emits it as a structured record. */
  banner(title: string, subtitle?: string): void {
    if (!this.isLevelEnabled("log")) return;

    if (this.options.format === "json") {
      this.emit({
        time: Date.now(),
        level: "log",
        context: this.context,
        message: title,
        metadata: subtitle ? { subtitle } : undefined,
      });
      return;
    }

    if (this.options.format === "plain") {
      this.writeLine(`\n${title}${subtitle ? `\n${subtitle}` : ""}`, "stdout");
      return;
    }

    const brand = `${this.theme.paint.cyan(
      this.theme.paint.bold("⚡"),
    )} ${this.theme.paint.bold(title)}`;
    this.writeLine(
      `\n${brand}${subtitle ? `\n${this.theme.note(subtitle)}` : ""}`,
      "stdout",
    );
  }

  /** Presentation output (tables, rules, field rows) that still respects JSON mode. */
  raw(line: string): void {
    if (!this.isLevelEnabled("log")) return;

    if (this.options.format === "json") {
      this.emit({
        time: Date.now(),
        level: "log",
        context: this.context,
        message: line,
      });
      return;
    }

    this.writeLine(line, "stdout");
  }

  private write(
    level: LogLevel,
    message: string | Error,
    metadata?: LogMetadata,
    variant?: LogRecord["variant"],
  ): void {
    if (!this.isLevelEnabled(level)) return;

    const isError = message instanceof Error;
    const rawMessage = isError ? message.message : message;

    this.emit({
      time: Date.now(),
      level,
      context: this.context,
      message: this.options.redact ? redactText(rawMessage) : rawMessage,
      variant,
      metadata:
        metadata && this.options.redact
          ? (redactValue(metadata) as LogMetadata)
          : metadata,
      error: isError ? serializeError(message) : undefined,
    });
  }

  private emit(record: LogRecord): void {
    const formatted =
      this.options.format === "json"
        ? formatJson(record)
        : this.options.format === "plain"
          ? formatPlain(record, this.options)
          : formatPretty(record, this.options, this.theme);

    const line = this.sanitize(formatted);

    const stream: LogStream =
      record.level === "error" || record.level === "fatal"
        ? "stderr"
        : "stdout";

    if (this.options.sink) {
      this.options.sink(record, line, stream);
      return;
    }

    this.writeLine(line, stream);
  }

  /** Drops caller-supplied ANSI escapes whenever colors are disabled. */
  private sanitize(line: string): string {
    return this.options.colors ? line : stripAnsi(line);
  }

  private writeLine(line: string, stream: LogStream): void {
    const target = stream === "stderr" ? process.stderr : process.stdout;
    try {
      target.write(`${this.sanitize(line)}\n`);
    } catch {
      // A closed pipe (EPIPE) should not crash a CLI that is being piped.
    }
  }
}

export function createLogger(
  context = "fack",
  options: LoggerOptions = {},
): Logger {
  return new Logger(context, options);
}

/** The process-wide logger used by command output and the shared `log` helper. */
export const logger = createLogger("fack");

export function configureLogger(options: LoggerOptions): void {
  logger.configure(options);
}
