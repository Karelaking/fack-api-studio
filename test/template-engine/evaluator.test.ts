import { describe, it, expect } from "vite-plus/test";
import { renderTemplate } from "../../lib/template-engine";

describe("Template Engine - Evaluator & Type Preservation", () => {
  it("preserves native number, boolean, and object types in JSON", () => {
    const template = JSON.stringify({
      id: "{{request.body.id}}",
      active: "{{request.body.active}}",
      count: "{{request.body.count}}",
      profile: "{{request.body.profile}}",
      tags: "{{request.body.tags}}",
    });

    const result = renderTemplate(template, {
      request: {
        body: {
          id: 101,
          active: true,
          count: 42,
          profile: { role: "admin", level: 5 },
          tags: ["typescript", "fack-api"],
        },
      },
    }) as Record<string, unknown>;

    expect(typeof result.id).toBe("number");
    expect(result.id).toBe(101);
    expect(typeof result.active).toBe("boolean");
    expect(result.active).toBe(true);
    expect(typeof result.count).toBe("number");
    expect(result.count).toBe(42);
    expect(result.profile).toEqual({ role: "admin", level: 5 });
    expect(result.tags).toEqual(["typescript", "fack-api"]);
  });

  it("performs string interpolation when expression is embedded in text", () => {
    const template = JSON.stringify({
      message:
        "User ID is {{request.body.id}} with count {{request.body.count}}",
    });

    const result = renderTemplate(template, {
      request: {
        body: {
          id: 99,
          count: 5,
        },
      },
    }) as { message: string };

    expect(result.message).toBe("User ID is 99 with count 5");
  });

  it("evaluates string transformation helpers", () => {
    const template = JSON.stringify({
      upper: "{{uppercase request.body.name}}",
      lower: "{{lowercase request.body.role}}",
      full: '{{concat request.body.first " " request.body.last}}',
      def: '{{default request.body.status "pending"}}',
    });

    const result = renderTemplate(template, {
      request: {
        body: {
          name: "alice",
          role: "DEVELOPER",
          first: "John",
          last: "Doe",
          status: null,
        },
      },
    }) as Record<string, string>;

    expect(result.upper).toBe("ALICE");
    expect(result.lower).toBe("developer");
    expect(result.full).toBe("John Doe");
    expect(result.def).toBe("pending");
  });

  it("evaluates arithmetic helpers", () => {
    const template = JSON.stringify({
      sum: "{{add 10 20 30}}",
      diff: "{{subtract 100 25}}",
      prod: "{{multiply 6 7}}",
      quot: "{{divide 50 2}}",
      rounded: "{{round 3.14159 2}}",
    });

    const result = renderTemplate(template, {
      request: {},
    }) as Record<string, number>;

    expect(result.sum).toBe(60);
    expect(result.diff).toBe(75);
    expect(result.prod).toBe(42);
    expect(result.quot).toBe(25);
    expect(result.rounded).toBe(3.14);
  });

  it("evaluates conditionals and comparison operators", () => {
    const template = JSON.stringify({
      adminGreeting:
        '{{#if (eq request.body.role "admin")}}Welcome Admin{{else}}Welcome User{{/if}}',
      accessStatus:
        "{{#if (and request.body.isVerified (gt request.body.age 18))}}ALLOWED{{else}}DENIED{{/if}}",
    });

    const result = renderTemplate(template, {
      request: {
        body: {
          role: "admin",
          isVerified: true,
          age: 25,
        },
      },
    }) as Record<string, string>;

    expect(result.adminGreeting).toBe("Welcome Admin");
    expect(result.accessStatus).toBe("ALLOWED");
  });

  it("evaluates else branch when condition is false", () => {
    const template = "{{#if request.body.isVip}}VIP{{else}}REGULAR{{/if}}";

    const result = renderTemplate(template, {
      request: {
        body: {
          isVip: false,
        },
      },
    });

    expect(result).toBe("REGULAR");
  });
});
