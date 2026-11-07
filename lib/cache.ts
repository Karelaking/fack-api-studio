/**
 * Fack API's — In-Memory Cache Layer
 *
 * Implements a high-performance, bounded in-memory cache using LRUCache.
 * Applies Object-Oriented principles (Singleton, Strategy) to provide:
 * - Bounded memory consumption with explicit max item limits
 * - Configurable Time-To-Live (TTL) expiration per data category
 * - Granular invalidation (per project, per route) instead of global cache nuking
 * - Full backward compatibility with existing procedural function exports
 */

import { LRUCache } from "lru-cache";
import type { Project, Route, Webhook, Scenario, Endpoint } from "@/db/schema";
import { LoggerRegistry } from "@/lib/logger-registry";
import { clearMatcherCache } from "@/lib/route-matcher";

const cacheTrace = LoggerRegistry.getTrace("cache");

export interface PageCacheEntry {
  page: number;
  limit: number;
  items: unknown[];
}

export type CachedRoute = Route & {
  endpoint?: { id: string; basePath: string; name: string };
  webhooks?: Webhook[];
};

const MIB = 1024 * 1024;

/**
 * Approximate in-memory size of a cached value.
 *
 * Generated mock payloads are plain JSON, so the serialized length is a good
 * proxy. It is doubled because JavaScript strings are UTF-16 in memory. This
 * runs only on cache misses, and keeps the payload caches bounded by bytes as
 * well as entries — two thousand arrays of 100+ objects can otherwise reach
 * hundreds of MB.
 */
function payloadSize(value: unknown): number {
  try {
    const json = JSON.stringify(value);
    return json ? json.length * 2 : 1;
  } catch {
    return 1;
  }
}

/**
 * CacheManager manages separate bounded LRU caches for different entity domains.
 */
/**
 * Next.js can evaluate this module more than once per process: `"use server"`
 * actions, route handlers and RSC pages are bundled (and may even run) as
 * separate module graphs. Anchoring the singleton to `globalThis` guarantees
 * every bundle shares a single CacheManager, so an invalidation triggered from
 * a server action (e.g. after editing a route's schema) also clears the cache
 * used by the mock route handler instead of only clearing its own copy.
 */
type GlobalWithCacheManager = typeof globalThis & {
  __fackApiCacheManager?: CacheManager;
};

export class CacheManager {
  private projectListCache: LRUCache<string, Project[]>;
  private projectBySlugCache: LRUCache<string, Project>;
  private mockProjectBySlugCache: LRUCache<string, Project>;
  private projectRoutesCache: LRUCache<
    string,
    (Route & { endpoint: Endpoint })[]
  >;
  private mockRoutesCache: LRUCache<string, CachedRoute[]>;
  private scenarioCache: LRUCache<string, Scenario>;
  private negativeSlugCache: LRUCache<string, boolean>;
  private projectEndpointsCache: LRUCache<string, unknown[]>;
  private canvasStateCache: LRUCache<string, NonNullable<unknown>>;
  private routeMockDataCache: LRUCache<string, unknown[]>;
  private routeSingleMockDataCache: LRUCache<string, NonNullable<unknown>>;
  private routePageCache: LRUCache<string, PageCacheEntry[]>;
  private mockCollectionCache: LRUCache<string, unknown[]>;
  private mockItemCache: LRUCache<string, NonNullable<unknown>>;

  private constructor() {
    // Projects list cache: 10 minute TTL, max 50 entries
    this.projectListCache = new LRUCache<string, Project[]>({
      max: 50,
      ttl: 10 * 60 * 1000,
    });

    // Project by slug cache: 10 minute TTL, max 500 entries
    this.projectBySlugCache = new LRUCache<string, Project>({
      max: 500,
      ttl: 10 * 60 * 1000,
    });

    // Mock-engine project cache: deliberately separate from projectBySlugCache.
    // The studio caches a project *with* nested endpoints/routes, while the mock
    // resolver caches the flat row for a namespace. Sharing one key meant the
    // first writer's shape won, so the studio could receive a project without
    // relations (broken canvas) or the resolver could serve a stale nested blob.
    this.mockProjectBySlugCache = new LRUCache<string, Project>({
      max: 500,
      ttl: 10 * 60 * 1000,
    });

    // Studio project routes cache (raw DB entities): 5 minute TTL, max 1,000 entries
    this.projectRoutesCache = new LRUCache<
      string,
      (Route & { endpoint: Endpoint })[]
    >({
      max: 1000,
      ttl: 5 * 60 * 1000,
    });

    // Mock engine compiled routes cache (normalized paths): 5 minute TTL, max 1,000 entries
    this.mockRoutesCache = new LRUCache<string, CachedRoute[]>({
      max: 1000,
      ttl: 5 * 60 * 1000,
    });

    // Active scenarios cache: 5 minute TTL, max 500 entries
    this.scenarioCache = new LRUCache<string, Scenario>({
      max: 500,
      ttl: 5 * 60 * 1000,
    });

    // Negative slug cache (cache penetration defense): 30 second TTL, max 1,000 entries
    this.negativeSlugCache = new LRUCache<string, boolean>({
      max: 1000,
      ttl: 30 * 1000,
    });

    // Project endpoints cache: 5 minute TTL, max 500 entries
    this.projectEndpointsCache = new LRUCache<string, unknown[]>({
      max: 500,
      ttl: 5 * 60 * 1000,
    });

    // Canvas state cache: 5 minute TTL, max 500 entries
    this.canvasStateCache = new LRUCache<string, NonNullable<unknown>>({
      max: 500,
      ttl: 5 * 60 * 1000,
    });

    // Route mock data array cache: 5 minute TTL, max 2,000 entries / 32 MiB
    this.routeMockDataCache = new LRUCache<string, unknown[]>({
      max: 2000,
      maxSize: 32 * MIB,
      sizeCalculation: payloadSize,
      ttl: 5 * 60 * 1000,
    });

    // Single route mock object cache: 5 minute TTL, max 2,000 entries / 8 MiB
    this.routeSingleMockDataCache = new LRUCache<string, NonNullable<unknown>>({
      max: 2000,
      maxSize: 8 * MIB,
      sizeCalculation: payloadSize,
      ttl: 5 * 60 * 1000,
    });

    // Paged route cache: 5 minute TTL, max 2,000 entries / 32 MiB
    this.routePageCache = new LRUCache<string, PageCacheEntry[]>({
      max: 2000,
      maxSize: 32 * MIB,
      sizeCalculation: payloadSize,
      ttl: 5 * 60 * 1000,
    });

    // Stateful mock reads: short TTL. Writes invalidate explicitly; the TTL is a
    // safety net for multi-process deployments where another instance wrote.
    this.mockCollectionCache = new LRUCache<string, unknown[]>({
      max: 500,
      maxSize: 16 * MIB,
      sizeCalculation: payloadSize,
      ttl: 30 * 1000,
    });
    this.mockItemCache = new LRUCache<string, NonNullable<unknown>>({
      max: 2_000,
      maxSize: 8 * MIB,
      sizeCalculation: payloadSize,
      ttl: 30 * 1000,
    });
  }

  /**
   * Singleton accessor for CacheManager.
   *
   * Backed by `globalThis` rather than a static field so that all Next.js
   * bundles within the same process share one instance (see note above).
   */
  public static getInstance(): CacheManager {
    const globalScope = globalThis as GlobalWithCacheManager;
    if (!globalScope.__fackApiCacheManager) {
      globalScope.__fackApiCacheManager = new CacheManager();
    }
    return globalScope.__fackApiCacheManager;
  }

  // ── Projects List ────────────────────────────────────────────────────────

  public getProjectsList(userId = "__all__"): Project[] | undefined {
    return this.projectListCache.get(`projects:${userId}`);
  }

  public setProjectsList(projects: Project[], userId = "__all__"): void {
    this.projectListCache.set(`projects:${userId}`, projects);
  }

  // ── Project by Slug ──────────────────────────────────────────────────────

  public getProjectBySlug(slug: string): Project | undefined {
    return this.projectBySlugCache.get(slug);
  }

  public setProjectBySlug(slug: string, project: Project): void {
    this.projectBySlugCache.set(slug, project);
  }

  // ── Project by Slug (Mock Engine, flat row) ──────────────────────────────

  public getMockProjectBySlug(slug: string): Project | undefined {
    return this.mockProjectBySlugCache.get(slug);
  }

  public setMockProjectBySlug(slug: string, project: Project): void {
    this.mockProjectBySlugCache.set(slug, project);
  }

  // ── Project Routes (Raw DB entities for Studio & Canvas) ──────────────────

  public getProjectRoutes(
    projectId: string,
  ): (Route & { endpoint: Endpoint })[] | undefined {
    return this.projectRoutesCache.get(projectId);
  }

  public setProjectRoutes(
    projectId: string,
    routes: (Route & { endpoint: Endpoint })[],
  ): void {
    this.projectRoutesCache.set(projectId, routes);
  }

  // ── Mock Routes (Compiled & Normalized for Mock Engine) ───────────────────

  public getRoutes(projectId: string): CachedRoute[] | undefined {
    return this.mockRoutesCache.get(projectId);
  }

  public setRoutes(projectId: string, routes: CachedRoute[]): void {
    this.mockRoutesCache.set(projectId, routes);
  }

  // ── Scenarios ────────────────────────────────────────────────────────────

  public getScenario(scenarioId: string): Scenario | undefined {
    return this.scenarioCache.get(scenarioId);
  }

  public setScenario(scenarioId: string, scenario: Scenario): void {
    this.scenarioCache.set(scenarioId, scenario);
  }

  public invalidateScenario(scenarioId: string): void {
    this.scenarioCache.delete(scenarioId);
  }

  // ── Negative Slug Cache (Cache Penetration Defense) ──────────────────────

  public isNegativeSlug(slug: string): boolean {
    return this.negativeSlugCache.get(slug) === true;
  }

  public setNegativeSlug(slug: string): void {
    this.negativeSlugCache.set(slug, true);
  }

  // ── Project Endpoints ─────────────────────────────────────────────────────

  public getEndpoints(projectId: string): unknown[] | undefined {
    return this.projectEndpointsCache.get(projectId);
  }

  public setEndpoints(projectId: string, endpoints: unknown[]): void {
    this.projectEndpointsCache.set(projectId, endpoints);
  }

  // ── Canvas State ──────────────────────────────────────────────────────────

  public getCanvasState(projectId: string): unknown {
    return this.canvasStateCache.get(projectId);
  }

  public setCanvasState(projectId: string, state: unknown): void {
    if (state !== undefined && state !== null) {
      this.canvasStateCache.set(projectId, state as NonNullable<unknown>);
    }
  }

  // ── Route Mock Data ──────────────────────────────────────────────────────

  public getMockData(routeId: string): unknown[] | undefined {
    return this.routeMockDataCache.get(routeId);
  }

  public setMockData(routeId: string, data: unknown[]): void {
    this.routeMockDataCache.set(routeId, data);
  }

  public getSingleMockData(routeId: string): unknown {
    return this.routeSingleMockDataCache.get(routeId);
  }

  public setSingleMockData(routeId: string, data: unknown): void {
    if (data !== undefined && data !== null) {
      this.routeSingleMockDataCache.set(routeId, data as NonNullable<unknown>);
    }
  }

  // ── Page Data ────────────────────────────────────────────────────────────

  public getPageData(
    routeId: string,
    page: number,
    limit: number,
  ): unknown[] | undefined {
    const entries = this.routePageCache.get(routeId);
    if (!entries) return undefined;
    const entry = entries.find((e) => e.page === page && e.limit === limit);
    return entry?.items;
  }

  public setPageData(
    routeId: string,
    page: number,
    limit: number,
    items: unknown[],
  ): void {
    const entries = this.routePageCache.get(routeId) ?? [];
    const filtered = entries.filter(
      (e) => !(e.page === page && e.limit === limit),
    );
    filtered.push({ page, limit, items });
    this.routePageCache.set(routeId, filtered);
  }

  public prunePageData(
    routeId: string,
    currentPage: number,
    limit: number,
  ): void {
    const entries = this.routePageCache.get(routeId) ?? [];
    const pruned = entries.filter(
      (e) =>
        e.limit !== limit ||
        e.page === currentPage - 1 ||
        e.page === currentPage ||
        e.page === currentPage + 1,
    );
    this.routePageCache.set(routeId, pruned);
  }

  // ── Stateful Mock Collections ─────────────────────────────────────────────

  private collectionKey(projectId: string, collection: string): string {
    return `${projectId}:${collection}`;
  }

  public getMockCollection(
    projectId: string,
    collection: string,
  ): unknown[] | undefined {
    return this.mockCollectionCache.get(
      this.collectionKey(projectId, collection),
    );
  }

  public setMockCollection(
    projectId: string,
    collection: string,
    items: unknown[],
  ): void {
    const key = this.collectionKey(projectId, collection);
    this.mockCollectionCache.set(key, items);
    for (const item of items) {
      if (item && typeof item === "object" && "id" in item) {
        const id = String((item as { id: unknown }).id);
        this.mockItemCache.set(`${key}:${id}`, item);
      }
    }
  }

  public getMockItem(
    projectId: string,
    collection: string,
    itemKey: string,
  ): unknown {
    return this.mockItemCache.get(
      `${this.collectionKey(projectId, collection)}:${itemKey}`,
    );
  }

  public setMockItem(
    projectId: string,
    collection: string,
    itemKey: string,
    item: unknown,
  ): void {
    this.mockItemCache.set(
      `${this.collectionKey(projectId, collection)}:${itemKey}`,
      item as NonNullable<unknown>,
    );
  }

  public invalidateMockCollection(projectId: string, collection: string): void {
    this.mockCollectionCache.delete(this.collectionKey(projectId, collection));
  }

  public invalidateMockItem(
    projectId: string,
    collection: string,
    itemKey: string,
  ): void {
    this.mockItemCache.delete(
      `${this.collectionKey(projectId, collection)}:${itemKey}`,
    );
  }

  public invalidateMockState(projectId: string): void {
    // Bounded caches (≤500 collections, ≤2,000 items); clearing on project-level
    // mutations is cheaper than prefix-walking keys.
    this.mockCollectionCache.clear();
    this.mockItemCache.clear();
    void projectId;
  }

  // ── Invalidation ─────────────────────────────────────────────────────────

  /**
   * Granularly invalidates cached data for a specific project.
   */
  public invalidateProject(projectId?: string, projectSlug?: string): void {
    if (projectId) {
      this.projectRoutesCache.delete(projectId);
      this.mockRoutesCache.delete(projectId);
      this.projectEndpointsCache.delete(projectId);
      this.canvasStateCache.delete(projectId);
      this.invalidateMockState(projectId);
    }
    clearMatcherCache();
    // The list cache is keyed per user; a project change can affect any user's
    // view (ownership transfers, shared workspace), so drop it wholesale. It is
    // bounded at 50 entries and repopulates on the next dashboard load.
    this.projectListCache.clear();
    if (projectSlug) {
      this.projectBySlugCache.delete(projectSlug);
      this.mockProjectBySlugCache.delete(projectSlug);
      this.negativeSlugCache.delete(projectSlug);
    }
  }

  /**
   * Granularly invalidates cached mock payloads for a specific route.
   */
  public invalidateRoute(routeId: string): void {
    this.routeMockDataCache.delete(routeId);
    this.routeSingleMockDataCache.delete(routeId);
    this.routePageCache.delete(routeId);
    clearMatcherCache();
  }

  /**
   * Clears all caches across all domains.
   */
  public clearAll(): void {
    this.projectListCache.clear();
    this.projectBySlugCache.clear();
    this.mockProjectBySlugCache.clear();
    this.projectRoutesCache.clear();
    this.mockRoutesCache.clear();
    this.scenarioCache.clear();
    this.negativeSlugCache.clear();
    this.projectEndpointsCache.clear();
    this.canvasStateCache.clear();
    this.routeMockDataCache.clear();
    this.routeSingleMockDataCache.clear();
    this.routePageCache.clear();
    this.mockCollectionCache.clear();
    this.mockItemCache.clear();
    clearMatcherCache();
  }
}

// ── Backward-Compatible Functional Facade ────────────────────────────────────

const cacheManager = CacheManager.getInstance();

export function getCachedProjectsList(userId?: string): Project[] | undefined {
  cacheTrace.traceCall("getCachedProjectsList");
  const res = cacheManager.getProjectsList(userId);
  cacheTrace.traceSuccess(
    "getCachedProjectsList",
    res ? `${res.length} projects` : "undefined",
  );
  return res;
}

export function setCachedProjectsList(
  projects: Project[],
  userId?: string,
): void {
  cacheTrace.traceCall("setCachedProjectsList", `${projects.length} projects`);
  cacheManager.setProjectsList(projects, userId);
  cacheTrace.traceSuccess("setCachedProjectsList", "void");
}

export function getCachedMockProject(slug: string): Project | undefined {
  return cacheManager.getMockProjectBySlug(slug);
}

export function setCachedMockProject(slug: string, project: Project): void {
  cacheManager.setMockProjectBySlug(slug, project);
}

export function getCachedProjectBySlug(slug: string): Project | undefined {
  cacheTrace.traceCall("getCachedProjectBySlug", slug);
  const res = cacheManager.getProjectBySlug(slug);
  cacheTrace.traceSuccess(
    "getCachedProjectBySlug",
    res ? res.name : "undefined",
  );
  return res;
}

export function setCachedProjectBySlug(slug: string, project: Project): void {
  cacheTrace.traceCall("setCachedProjectBySlug", slug, project.name);
  cacheManager.setProjectBySlug(slug, project);
  cacheTrace.traceSuccess("setCachedProjectBySlug", "void");
}

export function getCachedProjectRoutes(
  projectId: string,
): (Route & { endpoint: Endpoint })[] | undefined {
  cacheTrace.traceCall("getCachedProjectRoutes", projectId);
  const res = cacheManager.getProjectRoutes(projectId);
  cacheTrace.traceSuccess(
    "getCachedProjectRoutes",
    res ? `${res.length} routes` : "undefined",
  );
  return res;
}

export function setCachedProjectRoutes(
  projectId: string,
  routes: (Route & { endpoint: Endpoint })[],
): void {
  cacheTrace.traceCall(
    "setCachedProjectRoutes",
    projectId,
    `${routes.length} routes`,
  );
  cacheManager.setProjectRoutes(projectId, routes);
  cacheTrace.traceSuccess("setCachedProjectRoutes", "void");
}

export function getCachedRoutes(projectId: string): CachedRoute[] | undefined {
  cacheTrace.traceCall("getCachedRoutes", projectId);
  const res = cacheManager.getRoutes(projectId);
  cacheTrace.traceSuccess(
    "getCachedRoutes",
    res ? `${res.length} routes` : "undefined",
  );
  return res;
}

export function setCachedRoutes(
  projectId: string,
  routes: CachedRoute[],
): void {
  cacheTrace.traceCall("setCachedRoutes", projectId, `${routes.length} routes`);
  cacheManager.setRoutes(projectId, routes);
  cacheTrace.traceSuccess("setCachedRoutes", "void");
}

export function getCachedScenario(scenarioId: string): Scenario | undefined {
  return cacheManager.getScenario(scenarioId);
}

export function setCachedScenario(
  scenarioId: string,
  scenario: Scenario,
): void {
  cacheManager.setScenario(scenarioId, scenario);
}

export function invalidateCachedScenario(scenarioId: string): void {
  cacheManager.invalidateScenario(scenarioId);
}

export function isNegativeSlug(slug: string): boolean {
  return cacheManager.isNegativeSlug(slug);
}

export function setNegativeSlug(slug: string): void {
  cacheManager.setNegativeSlug(slug);
}

export function getCachedEndpoints(projectId: string): unknown[] | undefined {
  cacheTrace.traceCall("getCachedEndpoints", projectId);
  const res = cacheManager.getEndpoints(projectId);
  cacheTrace.traceSuccess(
    "getCachedEndpoints",
    res ? `${res.length} endpoints` : "undefined",
  );
  return res;
}

export function setCachedEndpoints(
  projectId: string,
  endpoints: unknown[],
): void {
  cacheTrace.traceCall(
    "setCachedEndpoints",
    projectId,
    `${endpoints.length} endpoints`,
  );
  cacheManager.setEndpoints(projectId, endpoints);
  cacheTrace.traceSuccess("setCachedEndpoints", "void");
}

export function getCachedCanvasState(projectId: string): unknown {
  cacheTrace.traceCall("getCachedCanvasState", projectId);
  const res = cacheManager.getCanvasState(projectId);
  cacheTrace.traceSuccess(
    "getCachedCanvasState",
    res ? "cached state" : "undefined",
  );
  return res;
}

export function setCachedCanvasState(projectId: string, state: unknown): void {
  cacheTrace.traceCall("setCachedCanvasState", projectId);
  cacheManager.setCanvasState(projectId, state);
  cacheTrace.traceSuccess("setCachedCanvasState", "void");
}

export function getCachedMockData(routeId: string): unknown[] | undefined {
  cacheTrace.traceCall("getCachedMockData", routeId);
  const res = cacheManager.getMockData(routeId);
  cacheTrace.traceSuccess(
    "getCachedMockData",
    res ? `${res.length} objects` : "undefined",
  );
  return res;
}

export function setCachedMockData(routeId: string, data: unknown[]): void {
  cacheTrace.traceCall("setCachedMockData", routeId, `${data.length} objects`);
  cacheManager.setMockData(routeId, data);
  cacheTrace.traceSuccess("setCachedMockData", "void");
}

export function getCachedSingleMockData(routeId: string): unknown {
  cacheTrace.traceCall("getCachedSingleMockData", routeId);
  const res = cacheManager.getSingleMockData(routeId);
  cacheTrace.traceSuccess(
    "getCachedSingleMockData",
    res ? "object" : "undefined",
  );
  return res;
}

export function setCachedSingleMockData(routeId: string, data: unknown): void {
  cacheTrace.traceCall("setCachedSingleMockData", routeId);
  cacheManager.setSingleMockData(routeId, data);
  cacheTrace.traceSuccess("setCachedSingleMockData", "void");
}

export function getCachedPageData(
  routeId: string,
  page: number,
  limit: number,
): unknown[] | undefined {
  cacheTrace.traceCall(
    "getCachedPageData",
    routeId,
    `page: ${page}`,
    `limit: ${limit}`,
  );
  const res = cacheManager.getPageData(routeId, page, limit);
  cacheTrace.traceSuccess(
    "getCachedPageData",
    res ? `hit (${res.length} items)` : "miss",
  );
  return res;
}

export function setCachedPageData(
  routeId: string,
  page: number,
  limit: number,
  items: unknown[],
): void {
  cacheTrace.traceCall(
    "setCachedPageData",
    routeId,
    `page: ${page}`,
    `limit: ${limit}`,
    `${items.length} items`,
  );
  cacheManager.setPageData(routeId, page, limit, items);
  cacheTrace.traceSuccess("setCachedPageData", "void");
}

export function prunePageCache(
  routeId: string,
  currentPage: number,
  limit: number,
): void {
  cacheTrace.traceCall(
    "prunePageCache",
    routeId,
    `currentPage: ${currentPage}`,
    `limit: ${limit}`,
  );
  cacheManager.prunePageData(routeId, currentPage, limit);
  cacheTrace.traceSuccess("prunePageCache", "void");
}

export function clearCache(): void {
  cacheTrace.traceCall("clearCache");
  cacheManager.clearAll();
  cacheTrace.traceSuccess("clearCache", "void");
}

export function clearProjectCache(
  projectId?: string,
  projectSlug?: string,
): void {
  cacheTrace.traceCall("clearProjectCache", projectId ?? "all");
  cacheManager.invalidateProject(projectId, projectSlug);
  cacheTrace.traceSuccess("clearProjectCache", "void");
}

export function clearRouteCache(routeId: string): void {
  cacheTrace.traceCall("clearRouteCache", routeId);
  cacheManager.invalidateRoute(routeId);
  cacheTrace.traceSuccess("clearRouteCache", "void");
}

// ── Stateful Mock Collections ───────────────────────────────────────────────

export function getCachedMockCollection(
  projectId: string,
  collection: string,
): unknown[] | undefined {
  return cacheManager.getMockCollection(projectId, collection);
}

export function setCachedMockCollection(
  projectId: string,
  collection: string,
  items: unknown[],
): void {
  cacheManager.setMockCollection(projectId, collection, items);
}

export function getCachedMockItem(
  projectId: string,
  collection: string,
  itemKey: string,
): unknown {
  return cacheManager.getMockItem(projectId, collection, itemKey);
}

export function setCachedMockItem(
  projectId: string,
  collection: string,
  itemKey: string,
  item: unknown,
): void {
  cacheManager.setMockItem(projectId, collection, itemKey, item);
}

export function invalidateMockCollection(
  projectId: string,
  collection: string,
): void {
  cacheManager.invalidateMockCollection(projectId, collection);
}

export function invalidateMockItem(
  projectId: string,
  collection: string,
  itemKey: string,
): void {
  cacheManager.invalidateMockItem(projectId, collection, itemKey);
}
