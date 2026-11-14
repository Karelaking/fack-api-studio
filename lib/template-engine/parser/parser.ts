/**
 * Fack API - Template Parser
 *
 * Parses token stream into a structured, typed AST supporting interpolation,
 * helpers, literals, and conditional blocks.
 */

import { tokenize } from "./tokenizer";
import type {
  ASTNode,
  ExpressionNode,
  IfBlockNode,
  LiteralNode,
  PathNode,
  ProgramNode,
  SourceLocation,
  SubExpressionNode,
  TextNode,
  Token,
} from "../types";

export class ParserError extends Error {
  public line: number;
  public column: number;

  constructor(message: string, loc: SourceLocation) {
    super(`${message} (at line ${loc.line}, column ${loc.column})`);
    this.name = "ParserError";
    this.line = loc.line;
    this.column = loc.column;
  }
}

export class TemplateParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private peek(): Token {
    if (this.isAtEnd()) {
      const last = this.tokens[this.tokens.length - 1];
      return last || { type: "TEXT", value: "", loc: { line: 1, column: 1 } };
    }
    return this.tokens[this.current];
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.tokens[this.current - 1];
  }

  private check(type: Token["type"]): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: Token["type"][]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: Token["type"], errorMessage: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw new ParserError(errorMessage, this.peek().loc);
  }

  public parse(): ProgramNode {
    const startLoc = this.peek().loc;
    const body: ASTNode[] = [];

    while (!this.isAtEnd()) {
      body.push(this.parseTopLevelNode());
    }

    return {
      type: "Program",
      body,
      loc: startLoc,
    };
  }

  private parseTopLevelNode(): ASTNode {
    const token = this.peek();

    if (token.type === "TEXT") {
      this.advance();
      return {
        type: "Text",
        value: token.value,
        loc: token.loc,
      } as TextNode;
    }

    if (token.type === "OPEN_BLOCK") {
      return this.parseBlock();
    }

    if (token.type === "OPEN_MUSTACHE") {
      return this.parseMustache();
    }

    throw new ParserError(`Unexpected token "${token.value}"`, token.loc);
  }

  private parseBlock(): IfBlockNode {
    const openBlockToken = this.consume(
      "OPEN_BLOCK",
      "Expected block open '{{#'",
    );
    const blockNameToken = this.consume(
      "IDENTIFIER",
      "Expected block name after '{{#'",
    );

    if (blockNameToken.value !== "if") {
      throw new ParserError(
        `Unsupported block helper '#${blockNameToken.value}'. Only '#if' is currently supported.`,
        blockNameToken.loc,
      );
    }

    // Parse condition expression
    const condition = this.parseExpressionArguments()[0];
    if (!condition) {
      throw new ParserError(
        "Expected condition expression after '#if'",
        blockNameToken.loc,
      );
    }

    this.consume(
      "CLOSE_MUSTACHE",
      "Expected '}}' after condition in '#if' block",
    );

    // Parse consequent block statements
    const consequent: ASTNode[] = [];
    let alternate: ASTNode[] | undefined = undefined;

    while (
      !this.isAtEnd() &&
      !this.check("CLOSE_BLOCK") &&
      !this.check("ELSE")
    ) {
      consequent.push(this.parseTopLevelNode());
    }

    // Check if there is an else or else-if clause
    if (this.match("ELSE")) {
      // Check if this was {{else if ...}}
      if (this.check("IDENTIFIER") && this.peek().value === "if") {
        this.advance(); // consume "if"
        const elseIfCondition = this.parseExpressionArguments()[0];
        if (!elseIfCondition) {
          throw new ParserError(
            "Expected condition expression after 'else if'",
            this.peek().loc,
          );
        }
        this.consume(
          "CLOSE_MUSTACHE",
          "Expected '}}' after 'else if' condition",
        );

        const nestedConsequent: ASTNode[] = [];
        let nestedAlternate: ASTNode[] | undefined = undefined;

        while (
          !this.isAtEnd() &&
          !this.check("CLOSE_BLOCK") &&
          !this.check("ELSE")
        ) {
          nestedConsequent.push(this.parseTopLevelNode());
        }

        if (this.check("ELSE")) {
          // Recursive else block
          const nestedBlock = this.parseRemainingElse();
          nestedAlternate = nestedBlock;
        }

        alternate = [
          {
            type: "IfBlock",
            condition: elseIfCondition,
            consequent: nestedConsequent,
            alternate: nestedAlternate,
            loc: openBlockToken.loc,
          } as IfBlockNode,
        ];
      } else {
        // Regular {{else}}
        this.match("CLOSE_MUSTACHE");
        const elseBody: ASTNode[] = [];
        while (!this.isAtEnd() && !this.check("CLOSE_BLOCK")) {
          elseBody.push(this.parseTopLevelNode());
        }
        alternate = elseBody;
      }
    }

    // Must close with {{/if}}
    this.consume("CLOSE_BLOCK", "Expected closing block '{{/if}}'");
    const closingTag = this.consume(
      "IDENTIFIER",
      "Expected tag name in closing block",
    );
    if (closingTag.value !== "if") {
      throw new ParserError(
        `Mismatched closing tag '{{/${closingTag.value}}}', expected '{{/if}}'`,
        closingTag.loc,
      );
    }
    this.consume("CLOSE_MUSTACHE", "Expected '}}' after closing tag name");

    return {
      type: "IfBlock",
      condition,
      consequent,
      alternate,
      loc: openBlockToken.loc,
    };
  }

  private parseRemainingElse(): ASTNode[] {
    this.advance(); // consume ELSE
    if (this.check("IDENTIFIER") && this.peek().value === "if") {
      this.advance();
      const cond = this.parseExpressionArguments()[0];
      this.consume("CLOSE_MUSTACHE", "Expected '}}' after 'else if'");
      const cons: ASTNode[] = [];
      while (
        !this.isAtEnd() &&
        !this.check("CLOSE_BLOCK") &&
        !this.check("ELSE")
      ) {
        cons.push(this.parseTopLevelNode());
      }
      let alt: ASTNode[] | undefined = undefined;
      if (this.check("ELSE")) {
        alt = this.parseRemainingElse();
      }
      return [
        {
          type: "IfBlock",
          condition: cond,
          consequent: cons,
          alternate: alt,
          loc: this.peek().loc,
        } as IfBlockNode,
      ];
    }

    this.match("CLOSE_MUSTACHE");
    const body: ASTNode[] = [];
    while (!this.isAtEnd() && !this.check("CLOSE_BLOCK")) {
      body.push(this.parseTopLevelNode());
    }
    return body;
  }

  private parseMustache(): ASTNode {
    const openToken = this.consume("OPEN_MUSTACHE", "Expected '{{'");
    const args = this.parseExpressionArguments();
    this.consume("CLOSE_MUSTACHE", "Expected '}}' to close expression");

    if (args.length === 0) {
      throw new ParserError("Empty mustache expression '{{}}'", openToken.loc);
    }

    // If it's a single argument and is a Path or Literal, construct ExpressionNode with rawToken
    const firstArg = args[0];
    if (args.length === 1) {
      if (firstArg.type === "Path") {
        return {
          type: "Expression",
          args: [firstArg],
          rawToken: `{{${firstArg.path}}}`,
          loc: openToken.loc,
        } as ExpressionNode;
      }
      if (firstArg.type === "Literal") {
        return firstArg;
      }
      if (firstArg.type === "SubExpression") {
        return {
          type: "Expression",
          callee: firstArg.callee,
          args: firstArg.args,
          rawToken: `{{(${firstArg.callee} ...)}}`,
          loc: openToken.loc,
        } as ExpressionNode;
      }
    }

    // Helper call: first argument is the callee
    if (firstArg.type === "Path") {
      const callee = firstArg.path;
      const helperArgs = args.slice(1);
      return {
        type: "Expression",
        callee,
        args: helperArgs,
        rawToken: `{{${callee} ...}}`,
        loc: openToken.loc,
      } as ExpressionNode;
    }

    return {
      type: "Expression",
      args,
      rawToken: "{{...}}",
      loc: openToken.loc,
    } as ExpressionNode;
  }

  private parseExpressionArguments(): ASTNode[] {
    const args: ASTNode[] = [];

    while (
      !this.isAtEnd() &&
      !this.check("CLOSE_MUSTACHE") &&
      !this.check("CLOSE_PAREN")
    ) {
      args.push(this.parseExpressionPrimary());
    }

    return args;
  }

  private parseExpressionPrimary(): ASTNode {
    const token = this.peek();

    // Subexpression: (helper arg1 arg2)
    if (token.type === "OPEN_PAREN") {
      this.advance();
      const subArgs = this.parseExpressionArguments();
      this.consume("CLOSE_PAREN", "Expected ')' to close sub-expression");

      if (subArgs.length === 0) {
        throw new ParserError("Empty sub-expression '()'", token.loc);
      }

      const first = subArgs[0];
      if (first.type !== "Path") {
        throw new ParserError(
          "First element of sub-expression must be a helper name",
          token.loc,
        );
      }

      return {
        type: "SubExpression",
        callee: first.path,
        args: subArgs.slice(1),
        loc: token.loc,
      } as SubExpressionNode;
    }

    // String Literal
    if (token.type === "STRING_LITERAL") {
      this.advance();
      return {
        type: "Literal",
        value: token.value,
        raw: `"${token.value}"`,
        loc: token.loc,
      } as LiteralNode;
    }

    // Number Literal
    if (token.type === "NUMBER_LITERAL") {
      this.advance();
      const numVal = Number(token.value);
      return {
        type: "Literal",
        value: isNaN(numVal) ? 0 : numVal,
        raw: token.value,
        loc: token.loc,
      } as LiteralNode;
    }

    // Boolean Literal
    if (token.type === "BOOLEAN_LITERAL") {
      this.advance();
      return {
        type: "Literal",
        value: token.value === "true",
        raw: token.value,
        loc: token.loc,
      } as LiteralNode;
    }

    // Null Literal
    if (token.type === "NULL_LITERAL") {
      this.advance();
      return {
        type: "Literal",
        value: null,
        raw: "null",
        loc: token.loc,
      } as LiteralNode;
    }

    // Path or Identifier
    if (token.type === "IDENTIFIER") {
      this.advance();
      return {
        type: "Path",
        path: token.value,
        loc: token.loc,
      } as PathNode;
    }

    throw new ParserError(
      `Unexpected token "${token.value}" in expression`,
      token.loc,
    );
  }
}

export function parseTemplate(input: string): ProgramNode {
  const tokens = tokenize(input);
  const parser = new TemplateParser(tokens);
  return parser.parse();
}
