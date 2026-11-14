import { describe, it, expect } from "vite-plus/test";
import { tokenize } from "../../lib/template-engine/parser/tokenizer";
import { parseTemplate } from "../../lib/template-engine/parser/parser";
import { validateTemplate } from "../../lib/template-engine/validation/template-validator";

describe("Template Engine - Tokenizer & Parser", () => {
  it("tokenizes simple mustache expressions", () => {
    const input = "Hello {{request.body.name}}!";
    const tokens = tokenize(input);

    expect(tokens.length).toBe(5);
    expect(tokens[0].type).toBe("TEXT");
    expect(tokens[0].value).toBe("Hello ");
    expect(tokens[1].type).toBe("OPEN_MUSTACHE");
    expect(tokens[2].type).toBe("IDENTIFIER");
    expect(tokens[2].value).toBe("request.body.name");
    expect(tokens[3].type).toBe("CLOSE_MUSTACHE");
    expect(tokens[4].type).toBe("TEXT");
    expect(tokens[4].value).toBe("!");
  });

  it("tokenizes string, number, and boolean literals in helpers", () => {
    const input =
      '{{default request.body.status "active"}} {{add 10 20}} {{eq true false}}';
    const tokens = tokenize(input);

    const types = tokens.map((t) => t.type);
    expect(types).toContain("STRING_LITERAL");
    expect(types).toContain("NUMBER_LITERAL");
    expect(types).toContain("BOOLEAN_LITERAL");
  });

  it("parses text and single mustache into ProgramNode AST", () => {
    const input = "User: {{request.params.id}}";
    const ast = parseTemplate(input);

    expect(ast.type).toBe("Program");
    expect(ast.body.length).toBe(2);
    expect(ast.body[0].type).toBe("Text");
    expect(ast.body[1].type).toBe("Expression");
  });

  it("parses conditional blocks with if and else", () => {
    const input = "{{#if request.body.isAdmin}}Admin{{else}}User{{/if}}";
    const ast = parseTemplate(input);

    expect(ast.body.length).toBe(1);
    const ifBlock = ast.body[0];
    expect(ifBlock.type).toBe("IfBlock");
    if (ifBlock.type === "IfBlock") {
      expect(ifBlock.consequent.length).toBe(1);
      expect(ifBlock.consequent[0].type).toBe("Text");
      expect(ifBlock.alternate).toBeDefined();
      expect(ifBlock.alternate?.length).toBe(1);
    }
  });

  it("parses else-if conditional chains", () => {
    const input =
      '{{#if (eq role "admin")}}Administrator{{else if (eq role "mod")}}Moderator{{else}}Standard{{/if}}';
    const ast = parseTemplate(input);

    expect(ast.body.length).toBe(1);
    const ifBlock = ast.body[0];
    expect(ifBlock.type).toBe("IfBlock");
    if (ifBlock.type === "IfBlock") {
      expect(ifBlock.alternate).toBeDefined();
      expect(ifBlock.alternate?.[0].type).toBe("IfBlock");
    }
  });

  it("validates templates and reports structured line/col errors", () => {
    const malformed = "{{#if user}}Hello{{/mismatched}}";
    const result = validateTemplate(malformed);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].code).toBe("PARSER_ERROR");
    expect(result.errors[0].line).toBe(1);
  });

  it("reports tokenizer errors on unclosed mustache", () => {
    const malformed = "Hello {{request.body.name";
    const result = validateTemplate(malformed);

    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe("TOKENIZER_ERROR");
  });
});
