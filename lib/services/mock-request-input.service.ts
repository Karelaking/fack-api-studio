import type { CachedRoute } from "@/lib/cache";
import { parseJsonCached } from "@/lib/utils/json-parse-cache";

export interface PaginationInput {
  pageParam: string | null;
  limitParam: string | null;
  pageValue: number;
  limitValue?: number;
  isPagedRequest: boolean;
}

export function parseRouteSchema(route: CachedRoute): Record<string, unknown> {
  const parsed = parseJsonCached<unknown>(route.responseSchema, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

export function parseRouteHeaders(route: CachedRoute): Record<string, string> {
  const parsed = parseJsonCached<unknown>(route.customHeaders, {});
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  // Headers are copied so the response builder can spread them safely without
  // mutating the cached parse result.
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string") {
      headers[key] = value;
    }
  }
  return headers;
}

export function parsePagination(
  searchParams: URLSearchParams,
): PaginationInput {
  const pageParam = searchParams.get("page") || searchParams.get("_page");
  const limitParam =
    searchParams.get("limit") ||
    searchParams.get("_limit") ||
    searchParams.get("count");

  const parsedPage = pageParam ? Number.parseInt(pageParam, 10) : NaN;
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN;

  return {
    pageParam,
    limitParam,
    pageValue: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    limitValue:
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? parsedLimit
        : undefined,
    isPagedRequest: pageParam !== null,
  };
}
