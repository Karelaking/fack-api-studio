import { describe, expect, it } from "vite-plus/test";
import { NextRequest, NextResponse } from "next/server";
import {
  isTrustedHost,
  getTrustedOrigins,
  isCsrfExcludedPath,
  evaluateCsrf,
} from "@/lib/security/csrf.service";

describe("csrf.service", () => {
  it("should recognize trusted system domains and reject untrusted hosts", () => {
    expect(isTrustedHost("localhost:3000")).toBe(true);
    expect(isTrustedHost("127.0.0.1:3000")).toBe(true);
    expect(isTrustedHost("test-project.localhost:3000")).toBe(true);
    expect(isTrustedHost("lotusapi-studio.vercel.app")).toBe(true);
    expect(isTrustedHost("fack-api-preview-abc.vercel.app")).toBe(true);

    expect(isTrustedHost("evil.com")).toBe(false);
    expect(isTrustedHost("attacker.site:8080")).toBe(false);
    expect(isTrustedHost("localhost.attacker.com")).toBe(false);
  });

  it("should assemble trusted origins including host when valid", () => {
    const origins = getTrustedOrigins("localhost:3000");
    expect(origins).toContain("http://localhost:3000");
    expect(origins).toContain("https://lotusapi-studio.vercel.app");

    const untrustedOrigins = getTrustedOrigins("evil-hacker.com");
    expect(untrustedOrigins).not.toContain("http://evil-hacker.com");
    expect(untrustedOrigins).not.toContain("https://evil-hacker.com");
  });

  it("should identify excluded paths for mock APIs and CLI authentication", () => {
    expect(isCsrfExcludedPath("/api/mock")).toBe(true);
    expect(isCsrfExcludedPath("/api/mock/v1/users")).toBe(true);
    expect(isCsrfExcludedPath("/api/cli/auth/device")).toBe(true);
    expect(isCsrfExcludedPath("/api/cli/auth/token")).toBe(true);
    expect(isCsrfExcludedPath("/api/cli/projects")).toBe(true);

    expect(isCsrfExcludedPath("/api/settings/storage")).toBe(false);
    expect(isCsrfExcludedPath("/api/file-manager")).toBe(false);
    expect(isCsrfExcludedPath("/api/ai/apply")).toBe(false);
  });

  it("should allow safe read-only methods (GET) without origin headers", async () => {
    const req = new NextRequest("http://localhost:3000/api/settings/storage", {
      method: "GET",
    });
    const result = await evaluateCsrf(req, NextResponse.next());
    expect(result.success).toBe(true);
  });

  it("should allow mutating POST requests from legitimate trusted origins", async () => {
    const req = new NextRequest("http://localhost:3000/api/settings/storage", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
      },
    });
    const result = await evaluateCsrf(req, NextResponse.next());
    expect(result.success).toBe(true);
  });

  it("should block mutating POST requests from foreign or untrusted origins", async () => {
    const req = new NextRequest("http://localhost:3000/api/settings/storage", {
      method: "POST",
      headers: {
        origin: "https://evil-cross-site.com",
        host: "localhost:3000",
      },
    });
    const result = await evaluateCsrf(req, NextResponse.next());
    expect(result.success).toBe(false);
    expect(result.reason).toContain("not allowed");
  });

  it("should allow CLI device flow POST requests without browser origin headers", async () => {
    const req = new NextRequest("http://localhost:3000/api/cli/auth/device", {
      method: "POST",
    });
    const result = await evaluateCsrf(req, NextResponse.next());
    expect(result.success).toBe(true);
  });
});
