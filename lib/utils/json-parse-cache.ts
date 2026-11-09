/**
 * Bounded parse cache for small JSON documents that live inside cached rows
 * (route schemas, custom headers, conditional rule lists, ...).
 *
 * These strings are stable for as long as the row is cached, but they were
 * re-parsed with `JSON.parse` on every mock request. Parsing is pure, so a
 * bounded LRU keyed by the raw string turns repeated parses into a hash lookup.
 *
 * Callers must treat the returned value as read-only; values are shared across
 * requests.
 */

import { LRUCache } from "lru-cache";

const MAX_ENTRIES = 2_000;
// Bounded by total characters as well as entry count: a handful of very large
// response schemas must not be able to pin hundreds of MB of parsed JSON.
const MAX_TOTAL_CHARS = 8 * 1024 * 1024;
const MAX_CACHEABLE_CHARS = 256 * 1024;
const ENTRY_OVERHEAD_CHARS = 64;

const parseCache = new LRUCache<string, NonNullable<unknown>>({
  max: MAX_ENTRIES,
  maxSize: MAX_TOTAL_CHARS,
  sizeCalculation: (_value, key) => key.length + ENTRY_OVERHEAD_CHARS,
});

export function parseJsonCached<T>(
  raw: string | null | undefined,
  fallback: T,
): T {
  if (raw === null || raw === undefined || raw === "") {
    return fallback;
  }

  const cached = parseCache.get(raw);
  if (cached !== undefined) {
    return cached as T;
  }

  try {
    const parsed = JSON.parse(raw);
    if (raw.length <= MAX_CACHEABLE_CHARS) {
      parseCache.set(raw, parsed as NonNullable<unknown>);
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}
