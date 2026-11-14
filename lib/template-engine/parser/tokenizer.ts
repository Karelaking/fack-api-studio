/**
 * Fack API - Template Tokenizer
 *
 * Scans template source code into tokens, maintaining precise line and column
 * positions for error diagnostics.
 */

import type { SourceLocation, Token } from "../types";

export class TokenizerError extends Error {
  public line: number;
  public column: number;

  constructor(message: string, line: number, column: number) {
    super(`${message} (at line ${line}, column ${column})`);
    this.name = "TokenizerError";
    this.line = line;
    this.column = column;
  }
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let line = 1;
  let column = 1;
  const length = input.length;

  let inMustache = false;

  function getLocation(): SourceLocation {
    return { line, column };
  }

  function advance(count = 1): string {
    let result = "";
    for (let i = 0; i < count && index < length; i++) {
      const char = input[index];
      result += char;
      index++;
      if (char === "\n") {
        line++;
        column = 1;
      } else {
        column++;
      }
    }
    return result;
  }

  function peek(offset = 0): string {
    return index + offset < length ? input[index + offset] : "";
  }

  while (index < length) {
    if (!inMustache) {
      // Check for mustache delimiters
      if (input.startsWith("{{#", index)) {
        tokens.push({
          type: "OPEN_BLOCK",
          value: "{{#",
          loc: getLocation(),
        });
        advance(3);
        inMustache = true;
        continue;
      }

      if (input.startsWith("{{/", index)) {
        tokens.push({
          type: "CLOSE_BLOCK",
          value: "{{/",
          loc: getLocation(),
        });
        advance(3);
        inMustache = true;
        continue;
      }

      if (input.startsWith("{{else}}", index)) {
        tokens.push({
          type: "ELSE",
          value: "{{else}}",
          loc: getLocation(),
        });
        advance(8);
        continue;
      }

      if (input.startsWith("{{else ", index)) {
        tokens.push({
          type: "ELSE",
          value: "{{else",
          loc: getLocation(),
        });
        advance(6);
        inMustache = true;
        continue;
      }

      if (input.startsWith("{{", index)) {
        tokens.push({
          type: "OPEN_MUSTACHE",
          value: "{{",
          loc: getLocation(),
        });
        advance(2);
        inMustache = true;
        continue;
      }

      // Normal text accumulation
      const startLoc = getLocation();
      let text = "";
      while (index < length && !input.startsWith("{{", index)) {
        text += advance(1);
      }

      if (text.length > 0) {
        tokens.push({
          type: "TEXT",
          value: text,
          loc: startLoc,
        });
      }
    } else {
      // In mustache mode: skip whitespace
      while (index < length && /\s/.test(peek())) {
        advance(1);
      }

      if (index >= length) {
        throw new TokenizerError(
          "Unclosed mustache tag at end of template",
          line,
          column,
        );
      }

      // Check for closing mustache
      if (input.startsWith("}}", index)) {
        tokens.push({
          type: "CLOSE_MUSTACHE",
          value: "}}",
          loc: getLocation(),
        });
        advance(2);
        inMustache = false;
        continue;
      }

      const char = peek();
      const loc = getLocation();

      // Parentheses for sub-expressions
      if (char === "(") {
        tokens.push({ type: "OPEN_PAREN", value: "(", loc });
        advance(1);
        continue;
      }

      if (char === ")") {
        tokens.push({ type: "CLOSE_PAREN", value: ")", loc });
        advance(1);
        continue;
      }

      // Quoted string literal (supporting escaped quotes from JSON templates e.g. \")
      let quote = "";
      let isEscapedQuoteDelimiter = false;

      if (char === "\\" && (peek(1) === '"' || peek(1) === "'")) {
        advance(1); // skip backslash
        quote = advance(1); // quote character
        isEscapedQuoteDelimiter = true;
      } else if (char === '"' || char === "'") {
        quote = advance(1);
        isEscapedQuoteDelimiter = false;
      }

      if (quote) {
        let strVal = "";
        let escaped = false;

        while (index < length) {
          if (
            isEscapedQuoteDelimiter &&
            peek() === "\\" &&
            peek(1) === quote &&
            !escaped
          ) {
            advance(2); // consume closing \"
            break;
          }

          const c = advance(1);
          if (escaped) {
            if (c === "n") strVal += "\n";
            else if (c === "t") strVal += "\t";
            else if (c === "r") strVal += "\r";
            else strVal += c;
            escaped = false;
          } else if (c === "\\") {
            escaped = true;
          } else if (!isEscapedQuoteDelimiter && c === quote) {
            break;
          } else {
            strVal += c;
          }
        }

        tokens.push({
          type: "STRING_LITERAL",
          value: strVal,
          loc,
        });
        continue;
      }

      // Numbers: e.g. 42, -10, 3.14
      if (/[-0-9]/.test(char)) {
        if (char === "-" && !/[0-9]/.test(peek(1))) {
          // Not a number, maybe identifier
        } else {
          let numStr = advance(1);
          while (index < length && /[0-9.]/.test(peek())) {
            numStr += advance(1);
          }
          tokens.push({
            type: "NUMBER_LITERAL",
            value: numStr,
            loc,
          });
          continue;
        }
      }

      // Identifiers, keywords, and dotted/hyphenated paths (e.g. request.headers.x-custom-tenant)
      // Allow letters, numbers, _, $, ., and -
      if (/[a-zA-Z_$]/.test(char)) {
        let idStr = advance(1);
        while (index < length && /[a-zA-Z0-9_$.-]/.test(peek())) {
          idStr += advance(1);
        }

        if (idStr === "true" || idStr === "false") {
          tokens.push({ type: "BOOLEAN_LITERAL", value: idStr, loc });
        } else if (idStr === "null") {
          tokens.push({ type: "NULL_LITERAL", value: idStr, loc });
        } else if (idStr === "else") {
          tokens.push({ type: "ELSE", value: idStr, loc });
        } else {
          tokens.push({ type: "IDENTIFIER", value: idStr, loc });
        }
        continue;
      }

      // Unknown character
      throw new TokenizerError(
        `Unexpected character "${char}" in template expression`,
        loc.line,
        loc.column,
      );
    }
  }

  if (inMustache) {
    throw new TokenizerError(
      "Unclosed mustache expression at end of template",
      line,
      column,
    );
  }

  return tokens;
}
