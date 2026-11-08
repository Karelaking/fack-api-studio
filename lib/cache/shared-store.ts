/**
 * Fack API — Shared Redis Store
 *
 * Optional distributed layer for caches and rate limits. Two backends are
 * supported, selected from the environment:
 *
 * - Upstash REST (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) for
 *   serverless/Vercel deployments.
 * - A self-hosted Redis (`REDIS_URL`, e.g. the docker-compose service) for
 *   single-VPS/Docker deployments.
 *
 * With neither configured the app stays single-instance: every caller falls
 * back to the in-process LRU caches in `lib/cache.ts` and the in-memory rate
 * limiter. The store is intentionally fail-open — a Redis outage degrades to
 * local state after a short circuit-breaker window instead of failing requests.
 */

import { deserialize, serialize } from "node:v8";
import { LoggerRegistry } from "@/lib/logger-registry";

const sharedStoreLogger = LoggerRegistry.get("shared-store");

const KEY_PREFIX = "fack:";

/** Skip values that would make a single Redis round-trip expensive. */
const MAX_SHARED_VALUE_BYTES = 256 * 1024;

/** Stop calling Redis for this long after a failure. */
const FAILURE_BACKOFF_MS = 30_000;

const INCREMENT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return { count, redis.call("TTL", KEYS[1]) }
`;

export interface SharedCounter {
  count: number;
  ttlSeconds: number;
}

interface SharedRedis {
  get(key: string): Promise<string | null>;
  mget(keys: string[]): Promise<Array<string | null>>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
  scanKeys(match: string): Promise<string[]>;
  incrementWithTtl(key: string, ttlSeconds: number): Promise<SharedCounter>;
}

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim().replace(/^"|"$/g, "");
}

function sharedKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

function toCount(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Redis replies are strings; reject anything object-shaped instead of
 * stringifying it into "[object Object]". */
function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
      return String(value);
    default:
      return null;
  }
}

// ── Upstash REST ─────────────────────────────────────────────────────────────

class UpstashRestRedis implements SharedRedis {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async command(args: Array<string | number>): Promise<unknown> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(2_000),
    });

    if (!response.ok) {
      throw new Error(`Upstash request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      result?: unknown;
      error?: string;
    };
    if (payload.error) {
      throw new Error(payload.error);
    }
    return payload.result;
  }

  public async get(key: string): Promise<string | null> {
    const result = await this.command(["GET", key]);
    return toNullableString(result);
  }

  public async mget(keys: string[]): Promise<Array<string | null>> {
    if (keys.length === 0) {
      return [];
    }
    const result = (await this.command(["MGET", ...keys])) as unknown[];
    return result.map(toNullableString);
  }

  public async set(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.command(["SET", key, value, "EX", ttlSeconds]);
  }

  public async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.command(["DEL", ...keys]);
    }
  }

  public async scanKeys(match: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";

    do {
      const result = (await this.command([
        "SCAN",
        cursor,
        "MATCH",
        match,
        "COUNT",
        200,
      ])) as [string, string[]];
      cursor = String(result[0]);
      keys.push(...result[1].map(String));
    } while (cursor !== "0");

    return keys;
  }

  public async incrementWithTtl(
    key: string,
    ttlSeconds: number,
  ): Promise<SharedCounter> {
    const result = (await this.command([
      "EVAL",
      INCREMENT_SCRIPT,
      1,
      key,
      ttlSeconds,
    ])) as [number, number];

    return {
      count: toCount(result[0]),
      ttlSeconds: Math.max(toCount(result[1], ttlSeconds), 1),
    };
  }
}

// ── Self-hosted Redis (ioredis) ──────────────────────────────────────────────

type IoredisClient = import("ioredis").Redis;

class IoredisRedis implements SharedRedis {
  private clientPromise?: Promise<IoredisClient>;

  constructor(private readonly url: string) {}

  private getClient(): Promise<IoredisClient> {
    if (!this.clientPromise) {
      this.clientPromise = this.connectClient().catch((error: unknown) => {
        // Allow a later attempt (after the circuit breaker) to try again.
        this.clientPromise = undefined;
        throw error;
      });
    }
    return this.clientPromise;
  }

  private async connectClient(): Promise<IoredisClient> {
    const { default: Redis } = await import("ioredis");
    const client = new Redis(this.url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      commandTimeout: 2_000,
      retryStrategy: (attempt) => Math.min(attempt * 200, 2_000),
    });
    client.on("error", (error: unknown) => {
      sharedStoreLogger.warn("Redis client error", error);
    });

    try {
      await client.connect();
    } catch (error) {
      // Without this the client keeps retrying in the background even though
      // the circuit breaker has already switched callers to local state.
      client.disconnect();
      throw error;
    }

    return client;
  }

  public async get(key: string): Promise<string | null> {
    return (await this.getClient()).get(key);
  }

  public async mget(keys: string[]): Promise<Array<string | null>> {
    if (keys.length === 0) {
      return [];
    }
    return (await this.getClient()).mget(...keys);
  }

  public async set(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    await (await this.getClient()).set(key, value, "EX", ttlSeconds);
  }

  public async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await (await this.getClient()).del(...keys);
    }
  }

  public async scanKeys(match: string): Promise<string[]> {
    const client = await this.getClient();
    const keys: string[] = [];
    let cursor = "0";

    do {
      const [nextCursor, batch] = await client.scan(
        cursor,
        "MATCH",
        match,
        "COUNT",
        200,
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== "0");

    return keys;
  }

  public async incrementWithTtl(
    key: string,
    ttlSeconds: number,
  ): Promise<SharedCounter> {
    const result = (await (
      await this.getClient()
    ).eval(INCREMENT_SCRIPT, 1, key, ttlSeconds)) as [number, number];

    return {
      count: toCount(result[0]),
      ttlSeconds: Math.max(toCount(result[1], ttlSeconds), 1),
    };
  }
}

// ── Singleton + fail-open wrapper ───────────────────────────────────────────

type GlobalWithSharedStore = typeof globalThis & {
  __fackSharedRedis?: Promise<SharedRedis | null>;
};

let unavailableUntil = 0;
let loggedBackend = false;

async function createSharedRedis(): Promise<SharedRedis | null> {
  const upstashUrl = readEnv("UPSTASH_REDIS_REST_URL");
  const upstashToken = readEnv("UPSTASH_REDIS_REST_TOKEN");

  if (upstashUrl && upstashToken) {
    if (!loggedBackend) {
      loggedBackend = true;
      sharedStoreLogger.info("Using Upstash Redis for shared cache and limits");
    }
    return new UpstashRestRedis(upstashUrl, upstashToken);
  }

  const redisUrl = readEnv("REDIS_URL");
  if (redisUrl) {
    if (!loggedBackend) {
      loggedBackend = true;
      sharedStoreLogger.info("Using Redis for shared cache and limits");
    }
    return new IoredisRedis(redisUrl);
  }

  if (!loggedBackend) {
    loggedBackend = true;
    sharedStoreLogger.info(
      "No Redis configured; shared cache and rate limits are process-local",
    );
  }
  return null;
}

export function getSharedRedis(): Promise<SharedRedis | null> {
  const globalScope = globalThis as GlobalWithSharedStore;
  if (!globalScope.__fackSharedRedis) {
    globalScope.__fackSharedRedis = createSharedRedis();
  }
  return globalScope.__fackSharedRedis;
}

async function withShared<T>(
  operation: (redis: SharedRedis) => Promise<T>,
): Promise<T | undefined> {
  const redis = await getSharedRedis();
  if (!redis || Date.now() < unavailableUntil) {
    return undefined;
  }

  try {
    return await operation(redis);
  } catch (error) {
    unavailableUntil = Date.now() + FAILURE_BACKOFF_MS;
    sharedStoreLogger.warn(
      "Shared Redis unavailable; falling back to process-local state",
      error,
    );
    return undefined;
  }
}

// ── Serialization ───────────────────────────────────────────────────────────

/**
 * `v8.serialize` keeps `Date` and other built-in values intact, unlike JSON.
 * Cached rows (projects, routes) contain `Date` columns, so a plain JSON
 * round-trip would turn them into strings and break callers.
 */
export function encodeSharedValue(value: unknown): string | null {
  try {
    const buffer = serialize(value);
    if (buffer.byteLength > MAX_SHARED_VALUE_BYTES) {
      return null;
    }
    return buffer.toString("base64");
  } catch (error) {
    sharedStoreLogger.warn("Could not serialize shared cache value", error);
    return null;
  }
}

export function decodeSharedValue<T>(raw: string): T | undefined {
  try {
    return deserialize(Buffer.from(raw, "base64")) as T;
  } catch (error) {
    sharedStoreLogger.warn("Could not deserialize shared cache value", error);
    return undefined;
  }
}

// ── Public cache API ────────────────────────────────────────────────────────

export const sharedKeys = {
  projectList: (userId: string): string => `projects:${userId}`,
  projectBySlug: (slug: string): string => `project:${slug}`,
  mockProjectBySlug: (slug: string): string => `mock-project:${slug}`,
  mockRoutes: (projectId: string): string => `mock-routes:${projectId}`,
  mockCollection: (projectId: string, collection: string): string =>
    `state:${projectId}:${collection}`,
  mockItem: (projectId: string, collection: string, itemKey: string): string =>
    `state:${projectId}:${collection}:${itemKey}`,
  negativeSlug: (slug: string): string => `negative:${slug}`,
  rateLimit: (key: string): string => `ratelimit:${key}`,
} as const;

export async function getSharedValue<T>(key: string): Promise<T | undefined> {
  const raw = await withShared((redis) => redis.get(sharedKey(key)));
  if (raw === null || raw === undefined) {
    return undefined;
  }
  return decodeSharedValue<T>(raw);
}

export async function getSharedValues<T>(
  keys: string[],
): Promise<Array<T | undefined>> {
  if (keys.length === 0) {
    return [];
  }

  const values = await withShared((redis) =>
    redis.mget(keys.map((key) => sharedKey(key))),
  );

  if (!values) {
    return keys.map(() => undefined);
  }

  return values.map((raw) =>
    raw === null ? undefined : decodeSharedValue<T>(raw),
  );
}

export async function setSharedValue<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  const encoded = encodeSharedValue(value);
  if (!encoded) {
    return;
  }
  await withShared((redis) => redis.set(sharedKey(key), encoded, ttlSeconds));
}

export async function deleteSharedKeys(...keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }
  await withShared((redis) => redis.del(...keys.map((key) => sharedKey(key))));
}

export async function deleteSharedPrefix(prefix: string): Promise<void> {
  await withShared(async (redis) => {
    const keys = await redis.scanKeys(`${sharedKey(prefix)}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });
}

export async function incrementSharedCounter(
  key: string,
  ttlSeconds: number,
): Promise<SharedCounter | undefined> {
  return withShared((redis) =>
    redis.incrementWithTtl(sharedKey(key), ttlSeconds),
  );
}

/**
 * Invalidate every shared entry that can describe a project. Called from the
 * central `clearProjectCache`, so every mutation path inherits it.
 */
export async function invalidateSharedProject(
  projectId?: string,
  projectSlug?: string,
): Promise<void> {
  if (projectSlug) {
    await deleteSharedKeys(
      sharedKeys.projectBySlug(projectSlug),
      sharedKeys.mockProjectBySlug(projectSlug),
      sharedKeys.negativeSlug(projectSlug),
    );
  }

  // A project change can affect any viewer's dashboard list, so drop them all.
  await deleteSharedPrefix("projects:");

  if (projectId) {
    await deleteSharedPrefix(`mock-routes:${projectId}`);
    await deleteSharedPrefix(`state:${projectId}:`);
  }
}

export async function clearSharedCache(): Promise<void> {
  // Only cache namespaces, not rate-limit counters: clearing caches (e.g. after
  // a route edit) should not hand every client a fresh request budget.
  await Promise.all(
    [
      "projects:",
      "project:",
      "mock-project:",
      "mock-routes:",
      "state:",
      "negative:",
    ].map((prefix) => deleteSharedPrefix(prefix)),
  );
}
