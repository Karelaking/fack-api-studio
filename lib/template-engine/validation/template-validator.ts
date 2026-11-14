/**
 * Fack API - Template Validator
 *
 * Performs static analysis and syntax validation on response templates.
 */

import { parseTemplate } from "../parser/parser";
import { TokenizerError } from "../parser/tokenizer";
import { ParserError } from "../parser/parser";
import type { TemplateValidationResult, TemplateError } from "../types";
import { createTemplateError } from "./template-errors";

export function validateTemplate(template: string): TemplateValidationResult {
  const errors: TemplateError[] = [];

  if (!template || template.trim() === "") {
    return { isValid: true, errors: [] };
  }

  try {
    parseTemplate(template);
  } catch (err: unknown) {
    if (err instanceof TokenizerError) {
      errors.push(
        createTemplateError(
          err.message,
          "TOKENIZER_ERROR",
          err.line,
          err.column,
        ),
      );
    } else if (err instanceof ParserError) {
      errors.push(
        createTemplateError(err.message, "PARSER_ERROR", err.line, err.column),
      );
    } else if (err instanceof Error) {
      errors.push(createTemplateError(err.message, "SYNTAX_ERROR"));
    } else {
      errors.push(
        createTemplateError("Unknown template error", "UNKNOWN_ERROR"),
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
