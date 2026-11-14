import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  LoggerRegistry,
  LoggingTrace,
  type Logger,
} from "@/lib/logger-registry";
import { dbLogger, mockLogger } from "@/lib/logger";

describe("Logging System - LoggerRegistry and Loggers", () => {
  beforeEach(() => {
    // Reset provider before each test
    vi.restoreAllMocks();
  });

  it("should provide standard logger methods by default", () => {
    const logger = LoggerRegistry.get("test-default");
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.success).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("should support custom logger providers and clear cache on setProvider", () => {
    const customLogs: { level: string; msg: string; tag: string }[] = [];

    const customProvider = (tag: string): Logger => ({
      info: (msg) => customLogs.push({ level: "info", msg, tag }),
      success: (msg) => customLogs.push({ level: "success", msg, tag }),
      warn: (msg) => customLogs.push({ level: "warn", msg, tag }),
      error: (msg) => customLogs.push({ level: "error", msg, tag }),
      debug: (msg) => customLogs.push({ level: "debug", msg, tag }),
    });

    LoggerRegistry.setProvider(customProvider);

    const testLogger = LoggerRegistry.get("custom-tag");
    testLogger.info("custom message");
    testLogger.success("it worked");
    testLogger.warn("warning message");
    testLogger.error("error message");
    testLogger.debug("debug message");

    expect(customLogs).toHaveLength(5);
    expect(customLogs[0]).toEqual({
      level: "info",
      msg: "custom message",
      tag: "custom-tag",
    });
    expect(customLogs[1]).toEqual({
      level: "success",
      msg: "it worked",
      tag: "custom-tag",
    });
  });

  it("should delegate dbLogger and mockLogger through LoggerRegistry", () => {
    const customLogs: { tag: string; msg: string }[] = [];
    LoggerRegistry.setProvider((tag) => ({
      info: (msg) => customLogs.push({ tag, msg }),
      success: (msg) => customLogs.push({ tag, msg }),
      warn: (msg) => customLogs.push({ tag, msg }),
      error: (msg) => customLogs.push({ tag, msg }),
      debug: (msg) => customLogs.push({ tag, msg }),
    }));

    dbLogger.info("db operation");
    mockLogger.warn("mock warning");

    expect(customLogs).toContainEqual({ tag: "db", msg: "db operation" });
    expect(customLogs).toContainEqual({ tag: "mock", msg: "mock warning" });
  });

  it("should create, cache, and delegate LoggingTrace correctly", () => {
    const debugMessages: string[] = [];
    const errorMessages: string[] = [];

    const mockTraceLogger: Logger = {
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: (msg) => errorMessages.push(msg),
      debug: (msg) => debugMessages.push(msg),
    };

    LoggerRegistry.register("trace-test", mockTraceLogger);
    const trace = LoggerRegistry.getTrace("trace-test");
    const traceCached = LoggerRegistry.getTrace("trace-test");

    expect(trace).toBe(traceCached);
    expect(trace).toBeInstanceOf(LoggingTrace);

    trace.traceCall("queryUsers", { limit: 10 });
    expect(debugMessages[0]).toContain("[queryUsers] called with args:");

    trace.traceSuccess("queryUsers", 42);
    expect(debugMessages[1]).toContain("[queryUsers] returned:");

    trace.traceError("queryUsers", new Error("DB down"));
    expect(errorMessages[0]).toContain("[queryUsers] failed:");
  });
});
