import { describe, it, expect } from "vite-plus/test";
import { RouteMatcher } from "@/cli/src/matcher.service";
import type { FackRuntimeRoute } from "@/lib/bundle/bundle.type";

function makeRoute(
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  fullPath: string,
): FackRuntimeRoute {
  return {
    id: `r_${fullPath}`,
    endpointId: "ep_1",
    method,
    path: fullPath,
    fullPath,
    statusCode: 200,
    responseSchema: {},
    responseTemplate: undefined,
    latencyMin: 0,
    latencyMax: 0,
    errorRate: 0,
    customHeaders: {},
    isAuthRequired: false,
    isEnabled: true,
    collectionName: undefined,
  };
}

describe("cli/src/matcher.service", () => {
  it("should match exact static route", () => {
    const matcher = new RouteMatcher([makeRoute("GET", "/api/v1/health")]);

    const match = matcher.match("GET", "/api/v1/health");
    expect(match).toBeDefined();
    expect(match?.route.fullPath).toBe("/api/v1/health");
    expect(match?.params).toEqual({});
  });

  it("should match parameter routes with :param, {param}, and [param]", () => {
    const matcher = new RouteMatcher([
      makeRoute("GET", "/api/users/:id"),
      makeRoute("GET", "/api/posts/{postId}"),
      makeRoute("GET", "/api/comments/[commentId]"),
    ]);

    const match1 = matcher.match("GET", "/api/users/user_123");
    expect(match1).toBeDefined();
    expect(match1?.params.id).toBe("user_123");

    const match2 = matcher.match("GET", "/api/posts/post_456");
    expect(match2).toBeDefined();
    expect(match2?.params.postId).toBe("post_456");

    const match3 = matcher.match("GET", "/api/comments/comm_789");
    expect(match3).toBeDefined();
    expect(match3?.params.commentId).toBe("comm_789");
  });

  it("should prioritize static routes over parameterized routes regardless of declaration order", () => {
    // Param route registered BEFORE static route
    const matcher = new RouteMatcher([
      makeRoute("GET", "/api/users/:id"),
      makeRoute("GET", "/api/users/profile"),
    ]);

    const matchProfile = matcher.match("GET", "/api/users/profile");
    expect(matchProfile).toBeDefined();
    expect(matchProfile?.route.fullPath).toBe("/api/users/profile");
    expect(matchProfile?.params).toEqual({});

    const matchParam = matcher.match("GET", "/api/users/other");
    expect(matchParam).toBeDefined();
    expect(matchParam?.route.fullPath).toBe("/api/users/:id");
    expect(matchParam?.params.id).toBe("other");
  });

  it("should match wildcard routes with lowest priority", () => {
    const matcher = new RouteMatcher([
      makeRoute("GET", "/api/files/*"),
      makeRoute("GET", "/api/files/download"),
    ]);

    const matchStatic = matcher.match("GET", "/api/files/download");
    expect(matchStatic?.route.fullPath).toBe("/api/files/download");

    const matchWildcard = matcher.match(
      "GET",
      "/api/files/documents/2026/report.pdf",
    );
    expect(matchWildcard?.route.fullPath).toBe("/api/files/*");
    expect(matchWildcard?.params.wildcard).toBe("documents/2026/report.pdf");
  });

  it("should normalize trailing slashes", () => {
    const matcher = new RouteMatcher([makeRoute("GET", "/api/users")]);

    const match = matcher.match("GET", "/api/users/");
    expect(match).toBeDefined();
    expect(match?.route.fullPath).toBe("/api/users");
  });

  it("should return undefined for unmatched methods or paths", () => {
    const matcher = new RouteMatcher([makeRoute("GET", "/api/users")]);

    expect(matcher.match("POST", "/api/users")).toBeUndefined();
    expect(matcher.match("GET", "/api/nonexistent")).toBeUndefined();
  });
});
