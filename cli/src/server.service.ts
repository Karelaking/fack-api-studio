/**
 * Fack CLI - Server Service
 *
 * Ultra-fast local mock HTTP server that uses the official TypeScript mock engine
 * (generatePayload, renderTemplate, processQueryParameters), in-memory stateful store,
 * authentication checks, chaos/latency simulation, and live terminal logging.
 */

import http from "node:http";
import type {
  FackRuntimeBundle,
  FackRuntimeRoute,
} from "../../lib/bundle/types";
import { RouteMatcher } from "./matcher.service";
import { MockStore } from "./mock-store.service";
import { generatePayload, processQueryParameters } from "../../lib/mock-engine";
import { renderTemplate } from "../../lib/template-engine";

interface ServerOptions {
  port: number;
  host: string;
  bundle: FackRuntimeBundle;
  silent?: boolean;
}

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function formatMethod(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return `${COLORS.green}${COLORS.bold}GET   ${COLORS.reset}`;
    case "POST":
      return `${COLORS.blue}${COLORS.bold}POST  ${COLORS.reset}`;
    case "PUT":
      return `${COLORS.yellow}${COLORS.bold}PUT   ${COLORS.reset}`;
    case "PATCH":
      return `${COLORS.yellow}${COLORS.bold}PATCH ${COLORS.reset}`;
    case "DELETE":
      return `${COLORS.red}${COLORS.bold}DELETE${COLORS.reset}`;
    default:
      return `${COLORS.cyan}${COLORS.bold}${method.padEnd(6)}${COLORS.reset}`;
  }
}

function formatStatus(status: number): string {
  if (status >= 200 && status < 300) {
    return `${COLORS.green}${status}${COLORS.reset}`;
  }
  if (status >= 300 && status < 400) {
    return `${COLORS.cyan}${status}${COLORS.reset}`;
  }
  if (status >= 400 && status < 500) {
    return `${COLORS.yellow}${status}${COLORS.reset}`;
  }
  return `${COLORS.red}${status}${COLORS.reset}`;
}

async function readRequestBody(
  req: http.IncomingMessage,
): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      if (!body || body.trim().length === 0) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          resolve(parsed as Record<string, unknown>);
        } else if (Array.isArray(parsed)) {
          resolve({ items: parsed });
        } else {
          resolve({ value: parsed });
        }
      } catch {
        resolve({ rawBody: body });
      }
    });

    req.on("error", () => {
      resolve({});
    });
  });
}

export class MockServer {
  private server: http.Server | undefined;
  private matcher: RouteMatcher;
  private store: MockStore;
  private options: ServerOptions;

  constructor(options: ServerOptions) {
    this.options = options;
    this.matcher = new RouteMatcher(options.bundle.routes);
    this.store = new MockStore(options.bundle.mockStates);
  }

  /** Dynamically updates the runtime bundle and recompiles routes without dropping connections. */
  public updateBundle(bundle: FackRuntimeBundle): void {
    this.options.bundle = bundle;
    this.matcher = new RouteMatcher(bundle.routes);
    this.store = new MockStore(bundle.mockStates);
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        const startTime = Date.now();
        const method = req.method || "GET";
        const parsedUrl = new URL(
          req.url || "/",
          `http://${this.options.host}:${this.options.port}`,
        );
        const pathname = parsedUrl.pathname;

        try {
          // Handle CORS preflight
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          );
          res.setHeader("Access-Control-Allow-Headers", "*");
          res.setHeader("Access-Control-Max-Age", "86400");

          if (method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
          }

          // Internal endpoints
          if (pathname === "/__fack/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                status: "ok",
                project: this.options.bundle.projectName,
                slug: this.options.bundle.projectSlug,
                version: this.options.bundle.version,
                routesCount: this.options.bundle.routes.length,
              }),
            );
            return;
          }

          if (pathname === "/__fack/routes") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(this.options.bundle.routes));
            return;
          }

          if (pathname === "/__fack/reset" && method === "POST") {
            this.store.reset();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "reset_successful" }));
            return;
          }

          // Match user route
          const matchResult = this.matcher.match(method, pathname);

          if (!matchResult) {
            const elapsed = Date.now() - startTime;
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Route not found",
                method,
                path: pathname,
                message:
                  "No matching mock endpoint found. Visit /__fack/routes to inspect available endpoints.",
              }),
            );

            if (!this.options.silent) {
              console.log(
                `[fack] ${formatMethod(method)} ${pathname} -> ${formatStatus(404)} ${COLORS.dim}(${elapsed}ms)${COLORS.reset}`,
              );
            }
            return;
          }

          const { route, params } = matchResult;

          // Authentication verification
          if (route.isAuthRequired) {
            const authHeader = req.headers["authorization"];
            if (!authHeader || authHeader.trim().length === 0) {
              const elapsed = Date.now() - startTime;
              res.writeHead(401, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "Unauthorized",
                  message:
                    "Authorization header (Bearer token) is required for this mock endpoint.",
                  route: route.fullPath,
                }),
              );

              if (!this.options.silent) {
                console.log(
                  `[fack] ${formatMethod(method)} ${pathname} -> ${formatStatus(401)} ${COLORS.dim}(${elapsed}ms, auth required)${COLORS.reset}`,
                );
              }
              return;
            }
          }

          // Latency simulation
          const latency = this.calculateLatency(route);
          if (latency > 0) {
            await new Promise((r) => setTimeout(r, latency));
          }

          // Chaos Error simulation
          if (this.shouldTriggerChaosError(route)) {
            const elapsed = Date.now() - startTime;
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Internal Server Error (Simulated Chaos)",
                route: route.fullPath,
                simulatedErrorRate: route.errorRate,
              }),
            );

            if (!this.options.silent) {
              console.log(
                `[fack] ${formatMethod(method)} ${pathname} -> ${formatStatus(500)} ${COLORS.dim}(${elapsed}ms, simulated chaos)${COLORS.reset}`,
              );
            }
            return;
          }

          // Read request payload for mutations
          const body = method !== "GET" ? await readRequestBody(req) : {};

          // Process response with TypeScript mock engine or stateful store
          const { status, payload, headers } = await this.processRouteResponse(
            route,
            params,
            body,
            parsedUrl.searchParams,
          );

          for (const [k, v] of Object.entries(headers)) {
            res.setHeader(k, v);
          }

          const isJson = !headers["content-type"] && !headers["Content-Type"];
          if (isJson) {
            res.setHeader("Content-Type", "application/json");
          }

          res.writeHead(status);
          const responseBody =
            typeof payload === "string" ? payload : JSON.stringify(payload);
          res.end(responseBody);

          const elapsed = Date.now() - startTime;
          if (!this.options.silent) {
            console.log(
              `[fack] ${formatMethod(method)} ${pathname} -> ${formatStatus(status)} ${COLORS.dim}(${elapsed}ms)${COLORS.reset}`,
            );
          }
        } catch (requestError) {
          const elapsed = Date.now() - startTime;
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Internal Server Error",
              message:
                requestError instanceof Error
                  ? requestError.message
                  : String(requestError),
            }),
          );

          if (!this.options.silent) {
            console.error(
              `[fack] ${formatMethod(method)} ${pathname} -> ${formatStatus(500)} ${COLORS.dim}(${elapsed}ms, uncaught error)${COLORS.reset}`,
              requestError,
            );
          }
        }
      });

      this.server.on("error", (err) => {
        reject(err);
      });

      this.server.listen(this.options.port, this.options.host, () => {
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      try {
        (
          this.server as unknown as { closeIdleConnections?: () => void }
        ).closeIdleConnections?.();
      } catch {
        // Ignore environments where closeIdleConnections is unavailable
      }
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private calculateLatency(route: FackRuntimeRoute): number {
    const rawMin = route.latencyMin || 0;
    const rawMax = route.latencyMax || 0;
    const min = Math.max(0, Math.min(rawMin, rawMax || rawMin));
    const max = Math.max(0, Math.max(rawMin, rawMax || rawMin));

    let baseLatency = min;
    if (max > min) {
      baseLatency = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    if (this.options.bundle.activeScenarioId) {
      const scenario = this.options.bundle.scenarios.find(
        (s) => s.id === this.options.bundle.activeScenarioId,
      );
      if (scenario) {
        baseLatency = Math.floor(
          baseLatency * Math.max(0, scenario.latencyMultiplier),
        );
      }
    }

    return baseLatency;
  }

  private shouldTriggerChaosError(route: FackRuntimeRoute): boolean {
    let rate = route.errorRate || 0;

    if (this.options.bundle.activeScenarioId) {
      const scenario = this.options.bundle.scenarios.find(
        (s) => s.id === this.options.bundle.activeScenarioId,
      );
      if (scenario && scenario.forcedErrorRate > rate) {
        rate = scenario.forcedErrorRate;
      }
    }

    if (rate <= 0) {
      return false;
    }

    if (rate >= 100) {
      return true;
    }

    // Error rate can be 0.0 to 1.0 (float) or 0 to 100 (percentage)
    const normalizedRate = rate <= 1.0 ? rate * 100 : rate;
    return Math.random() * 100 < normalizedRate;
  }

  private async processRouteResponse(
    route: FackRuntimeRoute,
    params: Record<string, string>,
    body: Record<string, unknown>,
    searchParams: URLSearchParams,
  ): Promise<{
    status: number;
    payload: unknown;
    headers: Record<string, string>;
  }> {
    const collection = route.collectionName;
    const method = route.method.toUpperCase();
    const customHeaders = { ...route.customHeaders };

    // 1. Stateful Mock Store CRUD
    if (collection) {
      const idParam =
        params.id ||
        params.userId ||
        params.itemId ||
        (Object.keys(params).length > 0 ? Object.values(params)[0] : undefined);

      if (method === "GET") {
        if (idParam) {
          // If collection is empty, attempt auto-seeding before looking up
          if (
            this.store.list(collection).length === 0 &&
            !route.responseTemplate
          ) {
            const seedPayload = await generatePayload(route.responseSchema);
            if (Array.isArray(seedPayload) && seedPayload.length > 0) {
              for (const item of seedPayload) {
                if (item && typeof item === "object") {
                  this.store.create(
                    collection,
                    item as Record<string, unknown>,
                  );
                }
              }
            }
          }

          const item = this.store.get(collection, idParam);
          if (item) {
            return { status: 200, payload: item, headers: customHeaders };
          }

          // If the collection is initialized and item is not found, return 404
          if (this.store.list(collection).length > 0) {
            return {
              status: 404,
              payload: {
                error: "Not Found",
                message: `Item with id "${idParam}" not found in collection "${collection}".`,
                id: idParam,
              },
              headers: customHeaders,
            };
          }
        } else {
          let list = this.store.list(collection);

          // Auto-seed collection if empty and schema is an array
          if (list.length === 0 && !route.responseTemplate) {
            const seedPayload = await generatePayload(route.responseSchema);
            if (Array.isArray(seedPayload) && seedPayload.length > 0) {
              for (const item of seedPayload) {
                if (item && typeof item === "object") {
                  this.store.create(
                    collection,
                    item as Record<string, unknown>,
                  );
                }
              }
              list = this.store.list(collection);
            }
          }

          if (list.length > 0) {
            const processed = processQueryParameters(list, searchParams);
            return { status: 200, payload: processed, headers: customHeaders };
          }
        }
      } else if (method === "POST") {
        const created = this.store.create(collection, body);
        return { status: 201, payload: created, headers: customHeaders };
      } else if ((method === "PUT" || method === "PATCH") && idParam) {
        const updated = this.store.update(collection, idParam, body);
        if (updated) {
          return { status: 200, payload: updated, headers: customHeaders };
        }
        // If not found in store, create/upsert it
        const upserted = this.store.create(collection, {
          ...body,
          id: idParam,
        });
        return { status: 200, payload: upserted, headers: customHeaders };
      } else if (method === "DELETE" && idParam) {
        const existed = this.store.delete(collection, idParam);
        if (!existed) {
          return {
            status: 404,
            payload: { error: "Item not found", id: idParam },
            headers: customHeaders,
          };
        }
        return {
          status: 200,
          payload: { success: true, deletedId: idParam },
          headers: customHeaders,
        };
      }
    }

    // 2. TypeScript-based fake data generation
    let payload: unknown;

    if (route.responseTemplate && route.responseTemplate.trim() !== "") {
      const templateContext = {
        request: {
          body,
          query: Object.fromEntries(searchParams.entries()),
          params,
        },
      };
      payload = renderTemplate(route.responseTemplate, templateContext);
    } else {
      payload = await generatePayload(route.responseSchema);

      if (
        params.id &&
        typeof payload === "object" &&
        payload !== null &&
        !Array.isArray(payload)
      ) {
        (payload as Record<string, unknown>).id = params.id;
      }

      if (Array.isArray(payload)) {
        payload = processQueryParameters(payload, searchParams);
      }
    }

    return {
      status: route.statusCode || 200,
      payload,
      headers: customHeaders,
    };
  }
}
