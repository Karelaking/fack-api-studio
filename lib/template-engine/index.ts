/**
 * Fack API - Dynamic Response Template Engine
 *
 * Provides high-performance, secure, AST-based template compilation and evaluation
 * with native type preservation, bounded execution, and helper registries.
 */

import { LRUCache } from "lru-cache";
import { parseTemplate } from "./parser/parser";
import { TemplateEvaluator } from "./evaluator/evaluator";
import { buildTemplateContext } from "./context/context-builder";
import { validateTemplate } from "./validation/template-validator";
import { defaultHelperRegistry, HelperRegistry } from "./helpers/registry";
import { setFakerSeed } from "./helpers/faker.helpers";
import type {
  ProgramNode,
  TemplateEvaluationOptions,
  TemplateRequestContext,
} from "./types";

// Bounded LRU cache for compiled template ASTs
const astCache = new LRUCache<string, ProgramNode>({
  max: 500,
});

/**
 * Compiles a template string into an AST, caching the result.
 */
export function compileTemplate(template: string): ProgramNode {
  const cached = astCache.get(template);
  if (cached) {
    return cached;
  }
  const ast = parseTemplate(template);
  astCache.set(template, ast);
  return ast;
}

/**
 * Clears the compiled template AST cache.
 */
export function clearTemplateCache(): void {
  astCache.clear();
}

/**
 * Evaluates a template string against a request or full evaluation context.
 * Maintains 100% backward compatibility with existing renderTemplate calls.
 */
export function renderTemplate(
  template: string,
  contextOrOptions: TemplateRequestContext | TemplateEvaluationOptions,
): unknown {
  if (!template || template.trim() === "") {
    return "";
  }

  // Determine if input is TemplateEvaluationOptions or old TemplateRequestContext
  let evalOptions: TemplateEvaluationOptions;

  if ("context" in contextOrOptions && contextOrOptions.context) {
    evalOptions = contextOrOptions as TemplateEvaluationOptions;
  } else {
    const reqContext = contextOrOptions as TemplateRequestContext;
    evalOptions = {
      context: buildTemplateContext({
        request: reqContext.request,
      }),
    };
  }

  const ast = compileTemplate(template);
  const evaluator = new TemplateEvaluator(evalOptions);
  return evaluator.evaluate(ast);
}

export {
  validateTemplate,
  buildTemplateContext,
  defaultHelperRegistry,
  HelperRegistry,
  setFakerSeed,
};

export type * from "./types";
