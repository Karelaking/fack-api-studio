/**
 * Fack API — Single-flight helper
 *
 * React's `cache()` deduplicates calls within one render/request. It does not
 * coalesce concurrent requests, so a cache miss on a busy dashboard could run
 * the same database query N times (the "cache stampede"). This helper keeps one
 * in-flight promise per key and shares it with every caller until it settles.
 */

type GlobalWithSingleFlight = typeof globalThis & {
  __fackSingleFlight?: Map<string, Promise<unknown>>;
};

function getInFlight(): Map<string, Promise<unknown>> {
  const globalScope = globalThis as GlobalWithSingleFlight;
  if (!globalScope.__fackSingleFlight) {
    globalScope.__fackSingleFlight = new Map();
  }
  return globalScope.__fackSingleFlight;
}

export function singleFlight<T>(
  key: string,
  task: () => Promise<T>,
): Promise<T> {
  const inFlight = getInFlight();
  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = task().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}
