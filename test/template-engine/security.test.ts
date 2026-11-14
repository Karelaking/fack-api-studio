import { describe, it, expect } from "vite-plus/test";
import {
  renderTemplate,
  buildTemplateContext,
} from "../../lib/template-engine";

describe("Template Engine - Security & Sandboxing", () => {
  it("blocks prototype pollution through deeply nested __proto__ paths", () => {
    const template = JSON.stringify({
      p1: "{{request.body.__proto__.isAdmin}}",
      p2: "{{request.body.constructor.prototype.isAdmin}}",
      p3: "{{faker.__proto__.isAdmin}}",
    });

    const result = renderTemplate(template, {
      request: {
        body: {
          user: "test",
        },
      },
    }) as Record<string, string>;

    expect(result.p1).toBe("{{request.body.__proto__.isAdmin}}");
    expect(result.p2).toBe("{{request.body.constructor.prototype.isAdmin}}");
    expect(result.p3).toBe("{{faker.__proto__.isAdmin}}");

    // Verify that Object.prototype was NOT polluted
    const cleanObj: Record<string, unknown> = {};
    expect(cleanObj.isAdmin).toBeUndefined();
  });

  it("blocks unapproved Faker modules not in the allowlist", () => {
    const template = JSON.stringify({
      unapproved: "{{faker.process.env.SECRET}}",
      unapprovedMethod: "{{faker.constructor.name}}",
    });

    const result = renderTemplate(template, {
      request: {},
    }) as Record<string, string>;

    expect(result.unapproved).toBe("{{faker.process.env.SECRET}}");
    expect(result.unapprovedMethod).toBe("{{faker.constructor.name}}");
  });

  it("enforces operation limits to prevent resource exhaustion", () => {
    // Construct a deeply nested or large template with low maxOperations
    const repeated = Array.from(
      { length: 50 },
      (_, i) => `{{add ${i} ${i}}}`,
    ).join(" ");
    const template = `Result: ${repeated}`;

    expect(() => {
      renderTemplate(template, {
        context: buildTemplateContext({ request: {} }),
        maxOperations: 10,
      });
    }).toThrow(/Maximum template execution operations/);
  });

  it("enforces nesting depth limits", () => {
    const template =
      "{{#if true}}{{#if true}}{{#if true}}{{#if true}}{{#if true}}DEEP{{/if}}{{/if}}{{/if}}{{/if}}{{/if}}";

    expect(() => {
      renderTemplate(template, {
        context: buildTemplateContext({ request: {} }),
        maxDepth: 3,
      });
    }).toThrow(/Maximum template expression nesting depth/);
  });
});
