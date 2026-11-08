import fs from "node:fs";
import path from "node:path";
import { vi } from "vite-plus/test";

const testDatabasePath = path.resolve(
  process.cwd(),
  "data",
  `test-fack-${process.pid}.db`,
);
fs.mkdirSync(path.dirname(testDatabasePath), { recursive: true });
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  fs.rmSync(`${testDatabasePath}${suffix}`, { force: true });
}
process.env.DATABASE_URL = `file:${testDatabasePath}`;
delete process.env.DATABASE_AUTH_TOKEN;

// Tests must never talk to a real Redis. Clearing these keeps the shared store
// and rate limiter on their in-process fallbacks.
delete process.env.REDIS_URL;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.TRUSTED_PROXY;

vi.mock("@clerk/nextjs/server", () => ({
  auth: Object.assign(
    vi.fn(async () => ({ userId: "user_test_owner" })),
    {
      protect: vi.fn(async () => undefined),
    },
  ),
  currentUser: vi.fn(async () => ({ id: "user_test_owner" })),
  clerkMiddleware:
    (
      handler: (
        auth: { protect: () => Promise<void> },
        request: Request,
      ) => unknown,
    ) =>
    (request: Request) =>
      handler({ protect: async () => undefined }, request),
}));

const { runMigrations } = await import("../db/migrate");
await runMigrations();
