/**
 * Fack API's — Centralized Logging Registry
 *
 * Provides a decoupled Service Locator / Registry pattern for loggers across the application.
 * Follows SOLID principles:
 * - Interface Segregation Principle: `Logger` interface requires only standard log levels.
 * - Single Responsibility Principle: `LoggingTrace` focuses solely on execution tracing.
 * - Dependency Inversion: Callers depend on `Logger`, not concrete logging libraries.
 */

/**
 * Interface Segregation Principle (ISP)
 * Defines the contract for all application loggers without external library coupling.
 */
export interface Logger {
  info(message: string, ...args: unknown[]): void;
  success(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

/**
 * Single Responsibility Principle (SRP)
 * Helper trace manager focusing strictly on method invocation tracing.
 */
export class LoggingTrace {
  constructor(private logger: Logger) {}

  public traceCall(fnName: string, ...args: unknown[]): void {
    this.logger.debug(`[${fnName}] called with args:`, ...args);
  }

  public traceSuccess(fnName: string, result: unknown): void {
    this.logger.debug(`[${fnName}] returned:`, result);
  }

  public traceError(fnName: string, error: unknown): void {
    this.logger.error(`[${fnName}] failed:`, error);
  }
}

/**
 * Default standard console logger when a custom provider is not yet attached.
 * Safe for both client and server runtimes without bundling external dependencies.
 */
class DefaultConsoleLogger implements Logger {
  constructor(private tag: string) {}

  public info(message: string, ...args: unknown[]): void {
    console.info(`[${this.tag}]`, message, ...args);
  }

  public success(message: string, ...args: unknown[]): void {
    console.log(`[${this.tag}]`, message, ...args);
  }

  public warn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.tag}]`, message, ...args);
  }

  public error(message: string, ...args: unknown[]): void {
    console.error(`[${this.tag}]`, message, ...args);
  }

  public debug(message: string, ...args: unknown[]): void {
    console.debug(`[${this.tag}]`, message, ...args);
  }
}

export type LoggerProvider = (tag: string) => Logger;

/**
 * Service Locator / Registry Pattern
 * Decouples call sites from concrete loggers and caches logger and trace instances.
 */
export class LoggerRegistry {
  private static loggers = new Map<string, Logger>();
  private static traces = new Map<string, LoggingTrace>();
  private static provider: LoggerProvider = (tag: string) =>
    new DefaultConsoleLogger(tag);

  /**
   * Sets the factory provider for creating tagged loggers and clears existing caches.
   */
  public static setProvider(provider: LoggerProvider): void {
    this.provider = provider;
    this.loggers.clear();
  }

  /**
   * Registers a pre-configured logger instance under a given key.
   */
  public static register(key: string, logger: Logger): void {
    this.loggers.set(key, logger);
  }

  /**
   * Retrieves or creates a logger instance for a given tag.
   */
  public static get(key: string): Logger {
    let loggerInstance = this.loggers.get(key);
    if (!loggerInstance) {
      loggerInstance = this.provider(key);
      this.loggers.set(key, loggerInstance);
    }
    return loggerInstance;
  }

  /**
   * Retrieves or creates a cached LoggingTrace instance for a given tag.
   */
  public static getTrace(key: string): LoggingTrace {
    let traceInstance = this.traces.get(key);
    if (!traceInstance) {
      traceInstance = new LoggingTrace(this.get(key));
      this.traces.set(key, traceInstance);
    }
    return traceInstance;
  }
}
