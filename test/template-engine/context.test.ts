import { describe, it, expect } from "vite-plus/test";
import {
  renderTemplate,
  buildTemplateContext,
} from "../../lib/template-engine";

describe("Template Engine - Context & Determinism", () => {
  it("evaluates runtime variables (uuid, now, timestamp, increment, random.int)", () => {
    const template = JSON.stringify({
      id: "{{uuid}}",
      createdAt: "{{now}}",
      ts: "{{timestamp}}",
      step1: "{{increment}}",
      step2: "{{increment}}",
      rand: "{{random.int}}",
    });

    const result = renderTemplate(template, {
      request: {},
    }) as Record<string, unknown>;

    expect(typeof result.id).toBe("string");
    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(typeof result.createdAt).toBe("string");
    expect(typeof result.ts).toBe("number");
    expect(result.step1).toBe(1);
    expect(result.step2).toBe(2);
    expect(typeof result.rand).toBe("number");
  });

  it("produces deterministic seeded Faker output when seed is provided", () => {
    const template = JSON.stringify({
      name: "{{faker.person.fullName}}",
      city: "{{faker.location.city}}",
      email: "{{faker.internet.email}}",
    });

    const run1 = renderTemplate(template, {
      context: buildTemplateContext({ request: {} }),
      seed: 42,
    }) as Record<string, string>;

    const run2 = renderTemplate(template, {
      context: buildTemplateContext({ request: {} }),
      seed: 42,
    }) as Record<string, string>;

    expect(run1).toEqual(run2);
  });

  it("strips sensitive headers from request.headers context", () => {
    const template = JSON.stringify({
      authHeader: "{{request.headers.authorization}}",
      customHeader: "{{request.headers.x-custom-tenant}}",
    });

    const result = renderTemplate(template, {
      context: buildTemplateContext({
        request: {
          headers: {
            authorization: "Bearer secret-token-xyz",
            cookie: "session=123",
            "X-Custom-Tenant": "tenant-corp",
          },
        },
      }),
    }) as Record<string, string>;

    // authorization should be stripped and preserve raw token
    expect(result.authHeader).toBe("{{request.headers.authorization}}");
    expect(result.customHeader).toBe("tenant-corp");
  });

  it("accesses environment variables only through explicit allowlist", () => {
    process.env.TEST_ALLOWED_VAR = "safe_public_key";
    process.env.TEST_SECRET_VAR = "super_secret_db_pass";

    const template = JSON.stringify({
      publicKey: "{{env.TEST_ALLOWED_VAR}}",
      secretKey: "{{env.TEST_SECRET_VAR}}",
    });

    const result = renderTemplate(template, {
      context: buildTemplateContext({
        request: {},
        allowlistEnvKeys: ["TEST_ALLOWED_VAR"],
      }),
    }) as Record<string, string>;

    expect(result.publicKey).toBe("safe_public_key");
    expect(result.secretKey).toBe("{{env.TEST_SECRET_VAR}}");

    delete process.env.TEST_ALLOWED_VAR;
    delete process.env.TEST_SECRET_VAR;
  });
});
