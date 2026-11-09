import { describe, it, expect } from "vite-plus/test";
import { renderTemplate } from "../lib/template-engine";

describe("Template Engine", () => {
  it("interpolates faker generators dynamically", () => {
    const template = JSON.stringify({
      name: "{{faker.person.firstName}}",
      email: "{{faker.internet.email}}",
    });

    const result = renderTemplate(template, {
      request: {},
    }) as { name: string; email: string };

    expect(result.name).toBeTruthy();
    expect(result.name).not.toBe("{{faker.person.firstName}}");
    expect(result.email).toContain("@");
  });

  it("interpolates request body, query, and params context", () => {
    const template = JSON.stringify({
      userId: "{{request.params.id}}",
      page: "{{request.query.page}}",
      username: "{{request.body.user.username}}",
    });

    const result = renderTemplate(template, {
      request: {
        params: { id: "user_42" },
        query: { page: "3" },
        body: {
          user: {
            username: "alex_dev",
          },
        },
      },
    }) as { userId: string; page: string; username: string };

    expect(result.userId).toBe("user_42");
    expect(result.page).toBe("3");
    expect(result.username).toBe("alex_dev");
  });

  it("safely blocks prototype pollution attempts via __proto__, prototype, and constructor", () => {
    const maliciousTemplate = JSON.stringify({
      polluteProto: "{{request.body.__proto__.isAdmin}}",
      polluteConstructor: "{{request.body.constructor.prototype.isAdmin}}",
      polluteFaker: "{{faker.__proto__.isAdmin}}",
    });

    const result = renderTemplate(maliciousTemplate, {
      request: {
        body: {
          name: "attacker",
        },
      },
    }) as {
      polluteProto: string;
      polluteConstructor: string;
      polluteFaker: string;
    };

    // Assert that the prototype was not polluted
    const cleanObj: Record<string, unknown> = {};
    expect((cleanObj as { isAdmin?: unknown }).isAdmin).toBeUndefined();

    // Verify tokens were not resolved through forbidden prototype paths
    expect(result.polluteProto).toBe("{{request.body.__proto__.isAdmin}}");
    expect(result.polluteConstructor).toBe(
      "{{request.body.constructor.prototype.isAdmin}}",
    );
    expect(result.polluteFaker).toBe("{{faker.__proto__.isAdmin}}");
  });

  it("handles non-existent paths gracefully by preserving raw tokens", () => {
    const template = "Hello {{request.body.missing.nested}}!";
    const result = renderTemplate(template, {
      request: {
        body: {},
      },
    });

    expect(result).toBe("Hello {{request.body.missing.nested}}!");
  });

  it("handles non-existent or invalid faker paths without throwing", () => {
    const template = "{{faker.nonExistentModule.someMethod}}";
    const result = renderTemplate(template, {
      request: {},
    });

    expect(result).toBe("{{faker.nonExistentModule.someMethod}}");
  });

  it("parses valid JSON templates into structured objects or arrays", () => {
    const objectTemplate = '{"success": true, "code": "{{request.params.id}}"}';
    const objectResult = renderTemplate(objectTemplate, {
      request: { params: { id: "200" } },
    });
    expect(objectResult).toEqual({ success: true, code: "200" });

    const arrayTemplate = '["item1", "{{request.query.tag}}"]';
    const arrayResult = renderTemplate(arrayTemplate, {
      request: { query: { tag: "featured" } },
    });
    expect(arrayResult).toEqual(["item1", "featured"]);
  });

  it("returns raw string fallback for invalid JSON strings", () => {
    const rawTemplate = "Plain text response: {{request.params.id}}";
    const result = renderTemplate(rawTemplate, {
      request: { params: { id: "123" } },
    });

    expect(result).toBe("Plain text response: 123");
  });
});
