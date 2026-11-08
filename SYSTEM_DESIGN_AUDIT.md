# Fack API — System Design & Performance Audit

**Scope:** backend request path, caching, stateful mock storage, dashboard/log read
paths, canvas layout, and build configuration.

**Method:** static review of the hot path plus targeted, low-risk changes. Every
change is justified by either an algorithmic complexity reduction, a removed
per-request allocation/parse, a reduced query payload, or a data-integrity fix.
No behaviour-changing micro-optimizations were applied.

**Verification**

| Check                    | Result                                              |
| ------------------------ | --------------------------------------------------- |
| `pnpm exec tsc --noEmit` | clean                                               |
| `pnpm exec vp test run`  | 39 files / 271 tests passing                        |
| `pnpm exec vp lint`      | only the pre-existing `ProjectSettings.tsx` warning |
| Baseline before changes  | 38 files / 269 tests passing                        |

The suite adds `test/stateful-mock.test.ts` to cover the new atomic upsert and
cache invalidation behaviour.

---

## 1. Hot path, before and after

```
incoming mock request
  → rate limit (in-memory sliding window)
  → resolve project slug
       before: 1 DB query per miss, but candidate list was unbounded
       after:  batched lookup + negative cache + bounded candidate list
  → load project routes
       before: re-filtered `isEnabled` on every request (new array each time)
       after:  WeakMap-cached enabled subset (stable array identity)
  → match route
       before: rebuilt an O(routes) string cache key + JSON-free hash per request
       after:  WeakMap<routesArray, Map<method, compiled router>>; radix O(path)
  → parse schema/headers/rules
       before: JSON.parse on every request
       after:  bounded LRU parse cache
  → generate payload
       cached per route/page (existing) + compact JSON for large bodies
  → stateful merge (GET/POST/PUT/PATCH/DELETE)
       before: DB read per list request, select-then-insert race on write
       after:  30s read cache, atomic `ON CONFLICT DO UPDATE`
  → query filtering/sorting/pagination
  → response formatting
       before: pretty-print every JSON body (~2x bytes + stringify CPU)
       after:  pretty-print only bodies ≤ 8 KiB
  → request log (after response)
       before: unbounded string payloads; 200 full bodies on dashboard read
       after:  5 KiB write cap, 2 KiB SQL-side read cap
```

On the common cache-hit path the mock data path performs no database reads; the
only exceptions are an uncached active scenario lookup and stateful writes.
Request logging is queued and flushed from `after()` (and only when project
logging is enabled).

---

## 2. Fixes applied

### 2.1 Route matching — O(routes) → O(path segments)

- `lib/route-matcher.ts` now keys compiled radix routers by the **identity** of
  the route array (`WeakMap`) instead of rebuilding a string containing every
  route id/path/method/updatedAt on every request.
- Each array is compiled once per HTTP method, with a negative cache for methods
  that have no routes.
- `lib/services/mock-route.service.ts` derives the `isEnabled` subset once per
  route snapshot. Previously `.filter()` ran per request and produced a new
  array, which silently defeated any array-identity matcher cache.

**Impact:** removes an O(routes) string build, a large temporary string, and a
per-request array allocation from the hottest path. Matching is now a radix
lookup proportional to path length.

### 2.2 JSON parse memoization

New `lib/utils/json-parse-cache.ts`: a bounded `LRUCache` used by
`parseRouteSchema`, `parseRouteHeaders`, `evaluateRules` (rule list and matched
rule body). It is bounded by both entry count (2,000), total characters (8 MiB),
and skips caching individual documents over 256 KiB.

**Impact:** route schemas, custom headers and conditional rules are parsed once
per snapshot instead of once per request. The size bound prevents a few large
schemas from pinning hundreds of MB.

### 2.3 Dynamic imports removed from request path

`jose` (`jwtVerify`) and `lib/template-engine` (`renderTemplate`) are imported
statically in `lib/mock-handler-core.ts`; `SignJWT` is static in the mock route.
Dynamic `import()` inside a request adds module-resolution work and prevents
some bundler optimizations. `jose` is already part of the auth surface, so this
does not add a new dependency edge.

### 2.4 Request body is read directly

Both template rendering and stateful writes used `request.clone().json()`. In
each path the body is consumed exactly once, so `request.json()` is equivalent
and avoids buffering the body twice.

### 2.5 Cache-shape collision fixed

`getProjectBySlug` (studio, project **with** endpoint/route relations) and the
mock resolver (flat project row) shared one slug-keyed cache. Whichever wrote
first determined the shape for everyone — a cold canvas could receive a project
without relations, or the mock resolver could serve a stale nested blob.

`lib/cache.ts` now has two caches:

- `projectBySlugCache` — studio/session project rows
- `mockProjectBySlugCache` — flat rows used by `resolveProjectFromSlug`

Both are invalidated on create/update/delete.

### 2.6 Dashboard project list — cross-user leak fixed

`getProjects()` previously cached the whole list under a single global
`all_projects` key while the database query was scoped to the current user.
User B could therefore receive user A's cached project list (names, ids, slugs).

Keys are now `projects:${userId}`. Project mutations clear the (bounded, 50
entry) list cache wholesale because a mutation can affect more than one viewer.

### 2.7 Dashboard query no longer ships route blobs

`getProjects()` only needs project counts and a per-method breakdown. It now
projects `endpoint.id` and `route.method` instead of every route column,
including `response_schema` (often several KiB per route).

`ProjectGrid`'s relation type was narrowed to match the projection.

### 2.8 Project page no longer joins the full route graph

`getProjectBySlug()` loaded every endpoint and every route (with schemas) even
though its callers only use `id`, `name`, `slug`, `userId` and version metadata.
The join was removed; endpoints/canvas data are fetched by their own actions.

### 2.9 Stateful mock reads cached; writes atomic

`lib/stateful-mock.ts`:

- collection and item reads are cached for 30s;
- writes invalidate the affected collection and seed the item cache;
- deletes invalidate both;
- `saveMockItem` is a single `INSERT … ON CONFLICT DO UPDATE` on
  `(project_id, collection, item_key)` instead of select-then-update/insert.

**Impact:** list/item reads on stateful endpoints no longer pay a full-table
scan plus `JSON.parse` per row, and concurrent writes can no longer create
duplicate rows.

**Migration:** `drizzle/0015_mock_states_unique.sql` deduplicates existing rows
(keeping the newest `rowid` per key) and creates the unique index. It is
journaled, so `db/migrate.ts` applies it automatically.

### 2.10 Canvas reconciliation — O(n²) → O(n)

`computeCanvasLayout` used `existingNodes.find(...)` inside loops over endpoints
and routes. It now builds one `Map<id, node>` and performs O(1) lookups. This
matters for generated projects with many routes, where every canvas save
previously scanned the whole node list per node.

### 2.11 Log storage and log reads bounded

- `recordRequestLog` caps serialized payloads at 5,000 chars for **both** object
  and string payloads (strings were previously unbounded).
- `getRequestLogs` trims to 2,000 chars **in SQL** (`substr` / `LEFT`) so large
  bodies never leave the database.
- The 200-row limit and log queue cap are unchanged.

### 2.12 Large responses ship compact JSON

`buildResponse` only pretty-prints bodies at or below 8 KiB. Larger payloads use
compact JSON, avoiding ~2x byte inflation on the wire and a second
`JSON.stringify` pass on big list responses. Small developer-facing bodies stay
readable.

### 2.13 Deep mock URLs bounded

Project slugs are validated at ≤ 100 characters, so at most ~50 one-character
segments can form one. `resolveProjectFromSlug` now caps candidate prefixes to
51 segments / 100 characters. A pathological mock URL can no longer allocate
thousands of candidate strings, do thousands of cache lookups, or send a huge
`IN (...)` to the database.

### 2.14 Build / bundle

`lucide-react` was added to `optimizePackageImports` alongside
`@remixicon/react`, so only imported icons are bundled.

The unused `unstorage` instance in `lib/cache.ts` was removed. It was created at
module load but never mounted or used, and it implied distributed caching that
did not exist.

### 2.15 Generated-payload caches bounded by bytes

The per-route payload caches (`routeMockDataCache`, `routeSingleMockDataCache`,
`routePageCache`) and the stateful read caches gained `maxSize` +
`sizeCalculation` in addition to their entry limits. `payloadSize` measures the
serialized JSON length (doubled for UTF-16 in memory) only on a cache miss.

**Impact:** a handful of large generated arrays can no longer push RSS into the
hundreds of MB; entry counts and TTLs are unchanged.

### 2.16 Redundant indexes dropped

`projects_slug_idx` duplicated the index created by the `UNIQUE` slug
constraint, and `routes_endpoint_id_idx` was the leftmost prefix of
`routes_endpoint_method_path_idx`. Migration
`drizzle/0016_drop_redundant_indexes.sql` drops both.

---

## 3. Remaining design risks and recommendations

These are intentionally **not** changed here because they are architectural or
require deployment decisions.

**Resolved after this report:**

- **Byte-bounded payload caches** — see §2.15 (`008e382`).
- **Redundant SQLite indexes** — see §2.16 (`6c58627`, migration `0016`).
- **Migration drift** — the duplicate `0013_performance_indexes.sql` was deleted
  (its indexes are already journaled in `0013_shiny_plazm.sql`), and the
  reference-only `0014_schema_enhancements.sql` / `0015_wal_mode_pragmas.sql`
  were moved to `drizzle/reference/` so they can no longer be mistaken for
  pending migrations. The SQLite PRAGMAs they describe are applied at connection
  time in `db/index.ts`.
- **Shared caches and distributed rate limits** — `lib/cache/shared-store.ts`
  adds an opt-in Redis layer (Upstash REST or `REDIS_URL`/ioredis) used by the
  project, route, stateful-mock, negative-slug, and rate-limit paths. Without
  Redis everything stays process-local, so single-instance installs are
  unaffected. Values are `v8`-serialized so `Date` columns survive the
  round-trip, and Redis failures are fail-open behind a 30s circuit breaker.
- **Trusted-proxy client IPs** — `lib/security/client-ip.ts` ignores
  `X-Forwarded-For` unless `TRUSTED_PROXY` explicitly names the deployment
  (`vercel`, `cloudflare`, `any`, or a CIDR/address list). Docker Compose sets
  the private ranges so the bundled nginx hop is trusted.
- **Cache-stampede coalescing** — `lib/utils/single-flight.ts` shares one
  in-flight promise per key across concurrent dashboard, resolver, route, and
  stateful-mock reads.
- **Hot-path metrics** — `lib/metrics.ts` records cache hit/miss counters and
  request latency (average, max, p95) and logs a snapshot every 100 mock
  requests.

| Priority | Finding                                                                | Status   | Resolution                                                                                                                                                         |
| -------- | ---------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0       | All caches are per-process (`LRUCache` on `globalThis`)                | Resolved | Optional shared Redis store with explicit invalidation (`invalidateSharedProject`, state keys). TTLs remain the fallback correctness window when Redis is unset.   |
| P0       | Rate limiter is per-process and `getClientIp` trusts `X-Forwarded-For` | Resolved | `getClientIp` denies forwarding headers by default and only trusts `TRUSTED_PROXY`; the limiter uses a shared `INCR`+`EXPIRE` Lua script when Redis is configured. |
| P1       | `request_logs` writes are SQLite writes                                | Open     | Keep logging disabled for SQLite unless needed, or make the Postgres log DB the default for high traffic. Batch size is already bounded.                           |
| P2       | Slug rename/delete staleness across instances                          | Resolved | Shared slug keys and negative cache are dropped by `invalidateSharedProject` on rename/delete; TTLs shortened by the shared layer.                                 |
| P2       | Dashboard cache stampede                                               | Resolved | `singleFlight` coalesces concurrent list/slug/route/state reads; the shared cache adds a second layer in front of the database.                                    |
| P2       | `getProjectBySlug` return type erases relations                        | Resolved | Now aligned with the narrowed query; keep relation-bearing reads in dedicated actions.                                                                             |
| P2       | No distributed negative-cache                                          | Resolved | Negative slug entries are written to Redis for 30s and read in one `MGET` with the candidate prefixes.                                                             |

---

## 4. Suggested next steps (highest leverage)

Completed:

1. **Deployment model decided and implemented.** `lib/cache/shared-store.ts`
   supports Upstash REST (Vercel) and self-hosted Redis (Docker Compose). Set
   `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or `REDIS_URL`.
2. **Client identity hardened.** `TRUSTED_PROXY` is required before forwarding
   headers are read; rate limits are keyed on the resolved client IP and shared
   across instances.
3. **Hot path instrumented.** `lib/metrics.ts` tracks cache hit ratio and
   request latency and logs a snapshot every 100 mock requests.

Remaining:

4. **Request-log storage.** Keep `request_logs` on SQLite only for low-traffic
   installs, or point `LOGS_POSTGRES_URL` at Postgres before enabling logging
   at scale.
5. **Metrics export.** The in-process snapshot is diagnostic only; add a
   protected `/api/metrics` route or an OpenTelemetry exporter if you need
   dashboards and alerting.

---

## 5. Changed files

```
app/api/cli/auth/device/route.ts           await shared rate limit
app/api/cli/auth/token/route.ts            await shared rate limit
app/api/mock/[...slug]/route.ts            static SignJWT, direct body read, latency metrics
app/cli/authorize/actions.ts               await shared rate limit
components/dashboard/ProjectGrid.tsx       narrowed relation type
db/schema.ts                               unique state index, redundant index drop
docker-compose.yml                         redis:7-alpine service, REDIS_URL, TRUSTED_PROXY
.env.example                               shared Redis + trusted-proxy documentation
drizzle/0015_mock_states_unique.sql        dedupe + unique index (journaled)
drizzle/0016_drop_redundant_indexes.sql    drop duplicate slug/FK indexes (journaled)
drizzle/meta/0015_snapshot.json            drizzle snapshot
drizzle/meta/0016_snapshot.json            drizzle snapshot
drizzle/meta/_journal.json                 journal entries
drizzle/reference/*.sql                    reference-only SQL moved out of migrations
lib/actions/logs.ts                        SQL-side payload trim
lib/actions/projects.ts                    per-user cache, narrow queries, shared read-through
lib/cache.ts                               split project caches, byte-bounded payload caches, metrics, shared invalidation
lib/cache/shared-store.ts                  new Upstash/ioredis shared store, v8 serialization, fail-open
lib/metrics.ts                             new cache hit/miss + request latency counters
lib/mock-engine.ts                         compact large JSON, parse cache
lib/mock-handler-core.ts                   static imports, bounded logs
lib/route-matcher.ts                       WeakMap compiled matchers
lib/security/client-ip.ts                  new trusted-proxy IP resolution
lib/security/rate-limiter.service.ts       async shared/local sliding window
lib/services/canvas.service.ts             Map-based node reconciliation
lib/services/mock-request-input.service.ts parse cache
lib/services/mock-route.service.ts         cached enabled route subset, shared read-through
lib/services/project-resolver.service.ts   bounded candidates, shared positive/negative cache
lib/stateful-mock.ts                       read cache + atomic upsert, shared read-through
lib/utils/json-parse-cache.ts              new bounded parse cache
lib/utils/single-flight.ts                 new stampede coalescing
next.config.ts                             lucide-react tree shaking
test/client-ip.test.ts                     new trusted-proxy coverage
test/project-resolver.test.ts              use mock project cache
test/rate-limiter.test.ts                  async shared/local limiter
test/setup.ts                              clear Redis/proxy env for isolation
test/single-flight.test.ts                 new coalescing coverage
test/stateful-mock.test.ts                 new upsert/invalidation coverage
```

**Follow-up commits:** `008e382` (byte-bounded payload caches), `6c58627`
(drop redundant indexes), and the migration reconciliation above.
