import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

import { dbLogger } from "@/lib/logger";
import { resolveStorageConnection } from "@/lib/storage/mode";

// Resolve where project data lives: a private local file when no database
// API keys are configured, or a remote libSQL/Turso database when they are.
const connection = resolveStorageConnection();

if (connection.warning) {
  dbLogger.warn(connection.warning);
}

const modeDescriptions = {
  local: `Storage mode: LOCAL (Tier 1) — File-based on this machine (${connection.display})`,
  selfhosted: `Storage mode: SELF-HOSTED (Tier 2) — User database connected (${connection.display})`,
  saas: `Storage mode: SAAS (Tier 3) — Managed cloud database (${connection.display})`,
};

dbLogger.info(modeDescriptions[connection.mode]);

const DATABASE_URL = connection.url;
const DATABASE_AUTH_TOKEN = connection.authToken;

/**
 * Applies SQLite performance and concurrency PRAGMAs for local file-based databases.
 * - WAL mode: Enables concurrent readers and writers without blocking.
 * - synchronous = NORMAL: Balances maximum throughput with ACID crash safety in WAL.
 * - foreign_keys = ON: Enforces referential integrity and ON DELETE CASCADE.
 * - busy_timeout = 5000: Prevents SQLITE_BUSY under high mock request concurrency.
 * - cache_size = -64000: Allocates 64MB memory page cache to keep schemas hot in RAM.
 * - temp_store = MEMORY: Reduces disk I/O for temporary sort tables.
 */
async function configureSqlitePragmas(
  client: ReturnType<typeof createClient>,
): Promise<void> {
  try {
    await client.execute("PRAGMA journal_mode = WAL;");
    await client.execute("PRAGMA synchronous = NORMAL;");
    await client.execute("PRAGMA foreign_keys = ON;");
    await client.execute("PRAGMA busy_timeout = 5000;");
    await client.execute("PRAGMA cache_size = -64000;");
    await client.execute("PRAGMA temp_store = MEMORY;");
    dbLogger.info(
      "Applied SQLite performance PRAGMAs (WAL mode, foreign keys, 64MB cache).",
    );
  } catch (err) {
    dbLogger.warn("Failed to apply SQLite performance PRAGMAs:", err);
  }
}

function configureDatabaseClient(): ReturnType<typeof createClient> {
  const isLocalFile = DATABASE_URL.startsWith("file:");

  // Ensure the local data directory exists if using a local file URL
  if (isLocalFile) {
    const dbPath = path.resolve(DATABASE_URL.replace("file:", ""));
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  const client = createClient({
    url: DATABASE_URL,
    authToken: DATABASE_AUTH_TOKEN,
  });

  // Apply SQLite runtime optimizations for local file databases
  if (isLocalFile) {
    void configureSqlitePragmas(client);
  }

  return client;
}

// Singleton pattern — reuse across hot reloads in development
const globalForDb = globalThis as unknown as {
  __fackApiDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
  __fackApiClient: ReturnType<typeof createClient> | undefined;
};

export const rawDbClient =
  globalForDb.__fackApiClient ?? configureDatabaseClient();

export const db = globalForDb.__fackApiDb ?? drizzle(rawDbClient, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__fackApiClient = rawDbClient;
  globalForDb.__fackApiDb = db;
}

let requestLogsPromise: Promise<void> | undefined;

/**
 * Bootstraps request_logs table and indexes in SQLite/Turso if they do not exist.
 */
export async function ensureRequestLogsTable(): Promise<void> {
  if (requestLogsPromise) {
    return requestLogsPromise;
  }

  requestLogsPromise = (async (): Promise<void> => {
    try {
      await rawDbClient.execute(`
                CREATE TABLE IF NOT EXISTS request_logs (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    method TEXT NOT NULL,
                    path TEXT NOT NULL,
                    query_params TEXT DEFAULT '{}',
                    headers TEXT DEFAULT '{}',
                    status_code INTEGER NOT NULL,
                    latency INTEGER NOT NULL,
                    is_error INTEGER NOT NULL,
                    response_payload TEXT DEFAULT ''
                );
            `);
      await rawDbClient.execute(`
                CREATE INDEX IF NOT EXISTS idx_request_logs_project_timestamp 
                ON request_logs(project_id, timestamp DESC);
            `);
      await rawDbClient.execute(`
                CREATE INDEX IF NOT EXISTS idx_request_logs_project_error 
                ON request_logs(project_id, is_error);
            `);
    } catch (err) {
      requestLogsPromise = undefined;
      dbLogger.error(
        "Failed to bootstrap SQLite request_logs table/index:",
        err,
      );
      throw err;
    }
  })();

  return requestLogsPromise;
}

let cliTablesPromise: Promise<void> | undefined;

/**
 * Bootstraps CLI authentication and quota tables in SQLite/Turso if they do not exist.
 * Self-healing in serverless environments where file migrations may not have run.
 */
export async function ensureCliTables(): Promise<void> {
  if (cliTablesPromise) {
    return cliTablesPromise;
  }

  cliTablesPromise = (async (): Promise<void> => {
    try {
      await rawDbClient.execute(`
                CREATE TABLE IF NOT EXISTS cli_auth_requests (
                    id TEXT PRIMARY KEY NOT NULL,
                    device_code_hash TEXT NOT NULL,
                    user_code TEXT NOT NULL,
                    device_name TEXT DEFAULT 'Terminal' NOT NULL,
                    platform TEXT DEFAULT 'unknown' NOT NULL,
                    status TEXT DEFAULT 'pending' NOT NULL,
                    user_id TEXT,
                    expires_at INTEGER NOT NULL,
                    created_at INTEGER NOT NULL,
                    approved_at INTEGER,
                    consumed_at INTEGER
                );
            `);
      await rawDbClient.execute(`
                CREATE UNIQUE INDEX IF NOT EXISTS cli_auth_requests_device_code_hash_unique 
                ON cli_auth_requests (device_code_hash);
            `);
      await rawDbClient.execute(`
                CREATE UNIQUE INDEX IF NOT EXISTS cli_auth_requests_user_code_unique 
                ON cli_auth_requests (user_code);
            `);
      await rawDbClient.execute(`
                CREATE INDEX IF NOT EXISTS cli_auth_requests_status_idx 
                ON cli_auth_requests (status);
            `);
      await rawDbClient.execute(`
                CREATE INDEX IF NOT EXISTS cli_auth_requests_expires_at_idx 
                ON cli_auth_requests (expires_at);
            `);
      await rawDbClient.execute(`
                CREATE TABLE IF NOT EXISTS cli_devices (
                    id TEXT PRIMARY KEY NOT NULL,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    platform TEXT DEFAULT 'unknown' NOT NULL,
                    token_hash TEXT NOT NULL,
                    token_prefix TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    last_used_at INTEGER,
                    expires_at INTEGER,
                    revoked_at INTEGER
                );
            `);
      await rawDbClient.execute(`
                CREATE UNIQUE INDEX IF NOT EXISTS cli_devices_token_hash_unique 
                ON cli_devices (token_hash);
            `);
      await rawDbClient.execute(`
                CREATE INDEX IF NOT EXISTS cli_devices_user_id_idx 
                ON cli_devices (user_id);
            `);
      await rawDbClient.execute(`
                CREATE TABLE IF NOT EXISTS workspace_meta (
                    id TEXT PRIMARY KEY NOT NULL,
                    user_id TEXT NOT NULL,
                    tier TEXT DEFAULT 'free' NOT NULL,
                    project_limit INTEGER DEFAULT 3 NOT NULL,
                    route_limit INTEGER DEFAULT 50 NOT NULL,
                    request_log_retention_days INTEGER DEFAULT 7 NOT NULL,
                    stripe_customer_id TEXT,
                    stripe_subscription_id TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );
            `);
      await rawDbClient.execute(`
                CREATE UNIQUE INDEX IF NOT EXISTS workspace_meta_user_id_unique 
                ON workspace_meta (user_id);
            `);
    } catch (err) {
      cliTablesPromise = undefined;
      dbLogger.error("Failed to bootstrap SQLite CLI tables/indexes:", err);
      throw err;
    }
  })();

  return cliTablesPromise;
}

// Background bootstrap for fast server warm-up
void ensureRequestLogsTable().catch(() => undefined);
void ensureCliTables().catch(() => undefined);

/** Active storage connection (mode, masked target) for status/settings UI. */
export const storageConnection = connection;
