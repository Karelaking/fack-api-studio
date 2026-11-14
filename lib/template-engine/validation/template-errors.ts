/**
 * Fack API - Template Error Utilities
 *
 * Defines structured error generation for syntax, resolution, and evaluation errors.
 */

import type { TemplateError } from "../types";

export function createTemplateError(
  message: string,
  code: string,
  line?: number,
  column?: number,
  snippet?: string,
): TemplateError {
  return {
    message,
    code,
    line,
    column,
    snippet,
  };
}
