import { describe, it, expect } from "vite-plus/test";
import { renderTemplate } from "../../lib/template-engine";

describe("Template Engine - Comprehensive Helper Suite", () => {
  it("evaluates string helpers (trim, replace, substring, length)", () => {
    const template = JSON.stringify({
      trimmed: "{{trim request.body.padded}}",
      replaced: '{{replace request.body.msg "world" "fack"}}',
      sub: "{{substring request.body.longStr 0 4}}",
      lenStr: "{{length request.body.longStr}}",
      lenArr: "{{length request.body.list}}",
    });

    const result = renderTemplate(template, {
      request: {
        body: {
          padded: "  spaces  ",
          msg: "hello world",
          longStr: "abcdefgh",
          list: [1, 2, 3, 4, 5],
        },
      },
    }) as Record<string, unknown>;

    expect(result.trimmed).toBe("spaces");
    expect(result.replaced).toBe("hello fack");
    expect(result.sub).toBe("abcd");
    expect(result.lenStr).toBe(8);
    expect(result.lenArr).toBe(5);
  });

  it("evaluates number helpers (floor, ceil, abs)", () => {
    const template = JSON.stringify({
      fl: "{{floor 4.9}}",
      cl: "{{ceil 4.1}}",
      ab: "{{abs -42}}",
    });

    const result = renderTemplate(template, {
      request: {},
    }) as Record<string, number>;

    expect(result.fl).toBe(4);
    expect(result.cl).toBe(5);
    expect(result.ab).toBe(42);
  });

  it("evaluates date helpers (formatDate, addDays)", () => {
    const template = JSON.stringify({
      dateOnly: '{{formatDate "2026-05-15T12:00:00Z" "date"}}',
      nextWeek: '{{formatDate (addDays "2026-05-15T12:00:00Z" 7) "date"}}',
    });

    const result = renderTemplate(template, {
      request: {},
    }) as Record<string, string>;

    expect(result.dateOnly).toBe("2026-05-15");
    expect(result.nextWeek).toBe("2026-05-22");
  });

  it("evaluates utility and logic helpers (coalesce, neq, gte, lte, or, not)", () => {
    const template = JSON.stringify({
      coal: '{{coalesce request.body.empty request.body.alsoEmpty "winner"}}',
      isNeq: "{{neq 10 20}}",
      isGte: "{{gte 20 20}}",
      isLte: "{{lte 15 20}}",
      isOr: "{{or false false true}}",
      isNot: "{{not false}}",
    });

    const result = renderTemplate(template, {
      request: {
        body: {
          empty: null,
          alsoEmpty: "",
        },
      },
    }) as Record<string, unknown>;

    expect(result.coal).toBe("winner");
    expect(result.isNeq).toBe(true);
    expect(result.isGte).toBe(true);
    expect(result.isLte).toBe(true);
    expect(result.isOr).toBe(true);
    expect(result.isNot).toBe(true);
  });
});
