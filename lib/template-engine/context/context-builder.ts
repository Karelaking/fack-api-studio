/**
 * Fack API - Template Context Builder
 *
 * Normalizes incoming request objects, sanitizes sensitive headers, manages
 * runtime variables, and applies environment key allowlists.
 */

import crypto from "node:crypto";
import type {
  TemplateContext,
  TemplateRequestData,
  TemplateRuntimeContext,
  TemplateStateContext,
} from "../types";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "proxy-authorization",
  "cf-connecting-ip",
  "true-client-ip",
]);

export interface BuildContextInput {
  request?: {
    method?: string;
    path?: string;
    body?: unknown;
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
  };
  state?: TemplateStateContext;
  env?: Record<string, string>;
  allowlistEnvKeys?: string[];
  scenario?: string;
}

export function buildTemplateContext(
  input: BuildContextInput,
): TemplateContext {
  // 1. Sanitize request headers
  const rawHeaders = input.request?.headers || {};
  const sanitizedHeaders: Record<string, string> = {};

  for (const [k, v] of Object.entries(rawHeaders)) {
    const lowerKey = k.toLowerCase().trim();
    if (!SENSITIVE_HEADERS.has(lowerKey)) {
      sanitizedHeaders[lowerKey] = String(v);
    }
  }

  const requestContext: TemplateRequestData = {
    method: (input.request?.method || "GET").toUpperCase(),
    path: input.request?.path || "/",
    body: input.request?.body !== undefined ? input.request.body : {},
    query: input.request?.query || {},
    params: input.request?.params || {},
    headers: sanitizedHeaders,
  };

  // 2. Build runtime variables
  const now = new Date();
  const runtimeContext: TemplateRuntimeContext = {
    timestamp: now.getTime(),
    isoDate: now.toISOString(),
    uuid: crypto.randomUUID(),
    scenario: input.scenario,
    counter: 1,
  };

  // 3. Environment variables with strict allowlist
  const envContext: Record<string, string> = {};
  if (input.env) {
    for (const [k, v] of Object.entries(input.env)) {
      envContext[k] = String(v);
    }
  }
  if (input.allowlistEnvKeys && typeof process !== "undefined" && process.env) {
    for (const key of input.allowlistEnvKeys) {
      if (process.env[key] !== undefined) {
        envContext[key] = process.env[key] as string;
      }
    }
  }

  return {
    request: requestContext,
    state: input.state,
    env: envContext,
    runtime: runtimeContext,
  };
}
