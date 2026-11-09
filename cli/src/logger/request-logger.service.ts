import type { Logger } from "./logger.service";
import type { RequestLogEntry } from "./logger.types";

/**
 * Binds request logging to one HTTP server and keeps the `http` context.
 *
 * ```ts
 * const requests = new RequestLogger(logger.child("http"));
 * requests.log({ method: "GET", path: "/users", status: 200, durationMs: 8 });
 * ```
 */
export class RequestLogger {
  constructor(private readonly logger: Logger) {}

  log(entry: RequestLogEntry): void {
    this.logger.request(entry);
  }

  child(context: string): RequestLogger {
    return new RequestLogger(this.logger.child(context));
  }
}
