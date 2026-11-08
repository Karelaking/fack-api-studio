/**
 * Fack CLI - Matcher Service
 *
 * High-performance route path matcher with route specificity sorting,
 * OpenAPI {param} and :param support, and parameter extraction.
 */

import type { FackRuntimeRoute } from "../../lib/bundle/types";
import type { ServerRouteMatch } from "./cli.type";

interface CompiledRoute {
  route: FackRuntimeRoute;
  regex: RegExp;
  paramNames: string[];
  score: number;
}

export class RouteMatcher {
  private routesByMethod: Map<string, CompiledRoute[]> = new Map();

  constructor(routes: FackRuntimeRoute[]) {
    for (const route of routes) {
      if (!route.isEnabled) {
        continue;
      }

      const method = route.method.toUpperCase();
      if (!this.routesByMethod.has(method)) {
        this.routesByMethod.set(method, []);
      }

      const compiled = this.compileRoute(route);
      this.routesByMethod.get(method)?.push(compiled);
    }

    // Sort routes in each method by specificity:
    // Higher score = more static/specific segments, matched first.
    for (const [method, compiledRoutes] of this.routesByMethod.entries()) {
      compiledRoutes.sort((a, b) => b.score - a.score);
      this.routesByMethod.set(method, compiledRoutes);
    }
  }

  private compileRoute(route: FackRuntimeRoute): CompiledRoute {
    const rawPath = route.fullPath.trim();
    const paramNames: string[] = [];
    let score = 0;

    // Normalize path: leading slash, no trailing slash (unless root)
    const cleanPath = rawPath.replace(/\/+$/, "") || "/";
    const segments = cleanPath.split("/").filter((s) => s.length > 0);

    const regexSegments = segments.map((segment) => {
      // Check for :param, {param}, or [param] (supporting alphanumeric, underscore, and hyphens)
      const paramMatch =
        /^:([a-zA-Z0-9_-]+)$/.exec(segment) ||
        /^\{([a-zA-Z0-9_-]+)\}$/.exec(segment) ||
        /^\[([a-zA-Z0-9_-]+)\]$/.exec(segment);

      if (paramMatch) {
        const paramName = paramMatch[1];
        paramNames.push(paramName);
        score += 5; // Parameter segment has medium priority
        return "([^/]+)";
      }

      if (segment === "*") {
        paramNames.push("wildcard");
        score += 1; // Wildcard has lowest priority
        return "(.*)";
      }

      // Static segment has highest priority
      score += 10;
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });

    // Boost score by total segment count so longer paths match before prefixes
    score += segments.length * 2;

    const pattern =
      regexSegments.length === 0
        ? "^\\/?$"
        : `^\\/${regexSegments.join("/")}\\/?$`;

    const regex = new RegExp(pattern, "i");

    return {
      route,
      regex,
      paramNames,
      score,
    };
  }

  public match(method: string, pathname: string): ServerRouteMatch | undefined {
    const routes = this.routesByMethod.get(method.toUpperCase());
    if (!routes || routes.length === 0) {
      return undefined;
    }

    const normalizedPath =
      pathname.trim().replace(/\/+/g, "/").replace(/\/+$/, "") || "/";

    for (const compiled of routes) {
      const match = compiled.regex.exec(normalizedPath);
      if (match) {
        const params: Record<string, string> = {};
        for (let i = 0; i < compiled.paramNames.length; i++) {
          const paramName = compiled.paramNames[i];
          const paramValue = match[i + 1];
          if (paramName && paramValue !== undefined) {
            try {
              params[paramName] = decodeURIComponent(paramValue);
            } catch {
              params[paramName] = paramValue;
            }
          }
        }

        return {
          route: compiled.route,
          params,
        };
      }
    }

    return undefined;
  }
}
