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

function createDatabase() {
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
    configureSqlitePragmas(client);
  }

  // Bootstrap request_logs in SQLite/Turso if it does not exist
  client
    .execute(
      `
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
  `,
    )
    .then(async () => {
      // Bootstrap indexes for query performance
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_request_logs_project_timestamp 
        ON request_logs(project_id, timestamp DESC);
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_request_logs_project_error 
        ON request_logs(project_id, is_error);
      `);
    })
    .catch((err) => {
      dbLogger.error(
        "Failed to bootstrap SQLite request_logs table/index:",
        err,
      );
    });

  return drizzle(client, { schema });
}

// Singleton pattern — reuse across hot reloads in development
const globalForDb = globalThis as unknown as {
  __fackApiDb: ReturnType<typeof createDatabase> | undefined;
};

export const db = globalForDb.__fackApiDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__fackApiDb = db;
}

/** Active storage connection (mode, masked target) for status/settings UI. */
export const storageConnection = connection;
