/**
 * Fack API — Lightweight in-process metrics
 *
 * Counters are deliberately cheap: the hot path only increments numbers. The
 * snapshot is meant for diagnostics (logs or a future protected endpoint), not
 * for a full APM replacement. For multi-instance deployments each instance
 * reports its own view.
 */

import { LoggerRegistry } from "@/lib/logger-registry";

const metricsLogger = LoggerRegistry.get("metrics");

const MAX_LATENCY_SAMPLES = 1_024;
const LOG_EVERY_N_REQUESTS = 100;

interface CacheCounters {
  hits: number;
  misses: number;
}

interface MetricsState {
  caches: Map<string, CacheCounters>;
  requestCount: number;
  totalLatencyMs: number;
  maxLatencyMs: number;
  latencySamples: number[];
  nextSampleIndex: number;
}

type GlobalWithMetrics = typeof globalThis & {
  __fackMetrics?: MetricsState;
};

function getState(): MetricsState {
  const globalScope = globalThis as GlobalWithMetrics;
  if (!globalScope.__fackMetrics) {
    globalScope.__fackMetrics = {
      caches: new Map(),
      requestCount: 0,
      totalLatencyMs: 0,
      maxLatencyMs: 0,
      latencySamples: [],
      nextSampleIndex: 0,
    };
  }
  return globalScope.__fackMetrics;
}

function getCacheCounters(name: string): CacheCounters {
  const state = getState();
  let counters = state.caches.get(name);
  if (!counters) {
    counters = { hits: 0, misses: 0 };
    state.caches.set(name, counters);
  }
  return counters;
}

export function recordCacheHit(name: string): void {
  getCacheCounters(name).hits += 1;
}

export function recordCacheMiss(name: string): void {
  getCacheCounters(name).misses += 1;
}

export function recordRequestDuration(durationMs: number): void {
  const state = getState();
  const duration = Number.isFinite(durationMs) ? Math.max(durationMs, 0) : 0;

  state.requestCount += 1;
  state.totalLatencyMs += duration;
  state.maxLatencyMs = Math.max(state.maxLatencyMs, duration);

  if (state.latencySamples.length < MAX_LATENCY_SAMPLES) {
    state.latencySamples.push(duration);
  } else {
    state.latencySamples[state.nextSampleIndex] = duration;
    state.nextSampleIndex = (state.nextSampleIndex + 1) % MAX_LATENCY_SAMPLES;
  }
}

function percentile(samples: number[], ratio: number): number {
  if (samples.length === 0) {
    return 0;
  }
  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );
  return sorted[index];
}

export interface MetricsSnapshot {
  requests: {
    count: number;
    averageMs: number;
    maxMs: number;
    p95Ms: number;
  };
  caches: Array<{
    name: string;
    hits: number;
    misses: number;
    hitRate: number;
  }>;
}

export function getMetricsSnapshot(): MetricsSnapshot {
  const state = getState();
  const samples = state.latencySamples;

  return {
    requests: {
      count: state.requestCount,
      averageMs:
        state.requestCount === 0
          ? 0
          : Math.round((state.totalLatencyMs / state.requestCount) * 100) / 100,
      maxMs: Math.round(state.maxLatencyMs * 100) / 100,
      p95Ms: Math.round(percentile(samples, 0.95) * 100) / 100,
    },
    caches: [...state.caches.entries()].map(([name, counters]) => {
      const total = counters.hits + counters.misses;
      return {
        name,
        hits: counters.hits,
        misses: counters.misses,
        hitRate:
          total === 0 ? 0 : Math.round((counters.hits / total) * 1000) / 10,
      };
    }),
  };
}

export function maybeLogMetrics(): void {
  const state = getState();
  if (
    state.requestCount === 0 ||
    state.requestCount % LOG_EVERY_N_REQUESTS !== 0
  ) {
    return;
  }
  metricsLogger.info("Mock request metrics", getMetricsSnapshot());
}

export function resetMetrics(): void {
  const globalScope = globalThis as GlobalWithMetrics;
  globalScope.__fackMetrics = undefined;
}
