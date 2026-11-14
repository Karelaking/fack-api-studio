/**
 * Fack API - Template Engine Entry Point
 *
 * Re-exports the full dynamic response templating system for backward compatibility.
 */

export {
  renderTemplate,
  compileTemplate,
  clearTemplateCache,
  validateTemplate,
  buildTemplateContext,
  defaultHelperRegistry,
  HelperRegistry,
  setFakerSeed,
} from "./template-engine/index";

export type {
  TemplateRequestContext,
  TemplateContext,
  TemplateEvaluationOptions,
  TemplateEvaluationResult,
  TemplateValidationResult,
  TemplateError,
} from "./template-engine/types";
