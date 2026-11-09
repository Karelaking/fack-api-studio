import { describe, it, expect } from "vite-plus/test";
import {
  Logger,
  RequestLogger,
  formatDuration,
  parseLogThreshold,
  shouldLog,
  stripAnsi,
  type LogRecord,
  type LoggerOptions,
  type LogStream,
} from "@/cli/src/logger";

interface Captured {
  record: LogRecord;
  line: string;
  stream: LogStream;
}

function capture(options: Partial<LoggerOptions> = {}) {
  const entries: Captured[] = [];
  const logger = new Logger("test", {
    format: "plain",
    colors: false,
    timestamp: false,
    level: "log",
    sink: (record, line, stream) => {
      entries.push({ record, line, stream });
    },
    ...options,
  });

  return { logger, entries };
}

describe("cli/src/logger", () => {
  describe("levels", () => {
    it("maps aliases to NestJS thresholds", () => {
      expect(parseLogThreshold("info")).toBe("log");
      expect(parseLogThreshold("trace")).toBe("verbose");
      expect(parseLogThreshold("critical")).toBe("fatal");
      expect(parseLogThreshold("WARNING")).toBe("warn");
      expect(parseLogThreshold("off")).toBe("silent");
      expect(parseLogThreshold("nope")).toBeUndefined();
    });

    it("filters records below the threshold", () => {
      expect(shouldLog("fatal", "log")).toBe(true);
      expect(shouldLog("warn", "log")).toBe(true);
      expect(shouldLog("log", "log")).toBe(true);
      expect(shouldLog("debug", "log")).toBe(false);
      expect(shouldLog("verbose", "log")).toBe(false);
      expect(shouldLog("fatal", "silent")).toBe(false);
    });

    it("drops debug output when the threshold is log", () => {
      const { logger, entries } = capture();

      logger.debug("hidden");
      logger.log("shown");

      expect(entries).toHaveLength(1);
      expect(entries[0]?.record.message).toBe("shown");
    });

    it("emits everything at the verbose threshold", () => {
      const { logger, entries } = capture({ level: "verbose" });

      logger.fatal("f");
      logger.error("e");
      logger.warn("w");
      logger.log("l");
      logger.debug("d");
      logger.verbose("v");

      expect(entries.map((entry) => entry.record.level)).toEqual([
        "fatal",
        "error",
        "warn",
        "log",
        "debug",
        "verbose",
      ]);
    });
  });

  describe("request logging", () => {
    it("keeps the documented request line shape", () => {
      const { logger, entries } = capture();

      logger.request({
        method: "get",
        path: "/api/users",
        status: 200,
        durationMs: 8,
      });

      expect(entries[0]?.record.message).toBe("GET /api/users -> 200 (8ms)");
      expect(entries[0]?.record.level).toBe("log");
      expect(entries[0]?.stream).toBe("stdout");
    });

    it("includes an optional note", () => {
      const { logger, entries } = capture();

      logger.request({
        method: "GET",
        path: "/api/secure",
        status: 401,
        durationMs: 2,
        note: "auth required",
      });

      expect(entries[0]?.record.message).toBe(
        "GET /api/secure -> 401 (2ms, auth required)",
      );
      expect(entries[0]?.record.level).toBe("warn");
    });

    it("treats server errors as errors on stderr", () => {
      const { logger, entries } = capture();

      logger.request({
        method: "POST",
        path: "/api/users",
        status: 500,
        durationMs: 1200,
      });

      expect(entries[0]?.record.level).toBe("error");
      expect(entries[0]?.stream).toBe("stderr");
      expect(entries[0]?.record.message).toBe("POST /api/users -> 500 (1.2s)");
    });

    it("wraps a logger in a RequestLogger", () => {
      const { logger, entries } = capture();
      const requests = new RequestLogger(logger);

      requests.log({
        method: "DELETE",
        path: "/api/users/1",
        status: 204,
        durationMs: 3,
      });

      expect(entries[0]?.record.message).toBe(
        "DELETE /api/users/1 -> 204 (3ms)",
      );
    });
  });

  describe("redaction", () => {
    it("redacts bearer tokens and secret metadata keys", () => {
      const { logger, entries } = capture();

      logger.log("calling with Bearer abc.def.ghi", {
        authorization: "Bearer abc.def.ghi",
        token: "super-secret",
        project: "demo",
      });

      expect(entries[0]?.record.message).toBe("calling with Bearer [redacted]");
      expect(entries[0]?.record.metadata).toEqual({
        authorization: "[redacted]",
        token: "[redacted]",
        project: "demo",
      });
    });

    it("can be disabled", () => {
      const { logger, entries } = capture({ redact: false });

      logger.log("Bearer abc.def.ghi", { token: "super-secret" });

      expect(entries[0]?.record.message).toBe("Bearer abc.def.ghi");
      expect(entries[0]?.record.metadata).toEqual({ token: "super-secret" });
    });

    it("redacts secrets in error messages", () => {
      const { logger, entries } = capture();

      logger.error(new Error("auth failed for Bearer abc.def.ghi"));

      expect(entries[0]?.record.error?.message).toBe(
        "auth failed for Bearer [redacted]",
      );
    });
  });

  describe("formats", () => {
    it("renders plain lines with a badge and context", () => {
      const { logger, entries } = capture();

      logger.success("done");

      expect(entries[0]?.line).toBe("DONE [test] done");
    });

    it("renders pretty lines without ANSI when colors are disabled", () => {
      const { logger, entries } = capture({ format: "pretty" });

      logger.log("ready");

      expect(entries[0]?.line).toBe("INFO   [test]  ready");
      expect(entries[0]?.line).not.toContain("\x1b");
    });

    it("renders NDJSON records with severity and context", () => {
      const { logger, entries } = capture({ format: "json", level: "verbose" });

      logger.verbose("detail", { scope: "cache" });

      const payload = JSON.parse(entries[0]?.line ?? "{}");
      expect(payload).toMatchObject({
        level: "trace",
        severity: 7,
        context: "test",
        message: "detail",
        meta: { scope: "cache" },
      });
      expect(payload.time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof payload.pid).toBe("number");
    });

    it("strips ANSI escapes from NDJSON records", () => {
      const { logger, entries } = capture({ format: "json" });

      logger.log("\x1b[1mbold\x1b[0m", { label: "\x1b[32mgreen\x1b[0m" });

      const payload = JSON.parse(entries[0]?.line ?? "{}");
      expect(payload.message).toBe("bold");
      expect(payload.meta).toEqual({ label: "green" });
      expect(entries[0]?.line).not.toContain("\x1b");
    });

    it("strips caller ANSI when colors are disabled", () => {
      const { logger, entries } = capture();

      logger.log("\x1b[31mred\x1b[0m");

      expect(entries[0]?.line).toBe("INFO [test] red");
      expect(entries[0]?.line).not.toContain("\x1b");
    });

    it("writes fatal records to stderr", () => {
      const { logger, entries } = capture();

      logger.fatal("boom");

      expect(entries[0]?.stream).toBe("stderr");
    });

    it("formats durations for request logs", () => {
      expect(formatDuration(0.4)).toBe("<1ms");
      expect(formatDuration(8)).toBe("8ms");
      expect(formatDuration(1500)).toBe("1.5s");
      expect(formatDuration(12_000)).toBe("12s");
      expect(formatDuration(75_000)).toBe("1m 15s");
      expect(formatDuration(-1)).toBe("0ms");
    });
  });

  describe("scoping", () => {
    it("keeps a child context and inherits options", () => {
      const { logger, entries } = capture();

      const child = logger.child("http");
      child.log("listening");

      expect(child.context).toBe("http");
      expect(entries[0]?.record.context).toBe("http");
      expect(entries[0]?.line).toBe("INFO [http] listening");
    });

    it("applies setLevel to later records", () => {
      const { logger, entries } = capture({ level: "verbose" });

      logger.debug("first");
      logger.setLevel("log");
      logger.debug("second");

      expect(entries.map((entry) => entry.record.message)).toEqual(["first"]);
    });
  });

  describe("helpers", () => {
    it("strips ANSI escape sequences", () => {
      expect(stripAnsi("\x1b[32mok\x1b[0m")).toBe("ok");
    });
  });
});
