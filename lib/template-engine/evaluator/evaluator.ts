/**
 * Fack API - Template Evaluator
 *
 * Traverses the template AST to produce evaluated values or strings, enforcing
 * execution limits and preserving native data types in JSON structures.
 */

import crypto from "node:crypto";
import { getPathValue } from "./resolver";
import { defaultHelperRegistry } from "../helpers/registry";
import {
  evaluateFakerExpression,
  setFakerSeed,
} from "../helpers/faker.helpers";
import { isTruthy } from "../helpers/utility.helpers";
import { toStr } from "../../utils/coerce";
import type {
  ASTNode,
  ExpressionNode,
  IfBlockNode,
  ProgramNode,
  TemplateContext,
  TemplateEvaluationOptions,
} from "../types";

export class EvaluationLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationLimitError";
  }
}

export class TemplateEvaluator {
  private context: TemplateContext;
  private maxOperations: number;
  private maxDepth: number;
  private operationsCount = 0;
  private sentinelMap: Map<string, unknown> = new Map();
  private sentinelCounter = 0;

  constructor(options: TemplateEvaluationOptions) {
    this.context = options.context;
    this.maxOperations = options.maxOperations || 5000;
    this.maxDepth = options.maxDepth || 20;

    if (options.seed !== undefined) {
      setFakerSeed(options.seed);
    }
  }

  private checkLimits(depth: number): void {
    this.operationsCount++;
    if (this.operationsCount > this.maxOperations) {
      throw new EvaluationLimitError(
        `Maximum template execution operations (${this.maxOperations}) exceeded`,
      );
    }
    if (depth > this.maxDepth) {
      throw new EvaluationLimitError(
        `Maximum template expression nesting depth (${this.maxDepth}) exceeded`,
      );
    }
  }

  public evaluate(program: ProgramNode): unknown {
    // If the entire program consists of a single expression or literal, return native value directly
    if (program.body.length === 1) {
      const singleNode = program.body[0];
      if (singleNode.type === "Expression") {
        const val = this.evaluateExpression(singleNode, 0);
        // If it resolved to undefined and has a rawToken, return rawToken
        return val !== undefined ? val : singleNode.rawToken;
      }
      if (singleNode.type === "Literal") {
        return singleNode.value;
      }
    }

    // Otherwise, evaluate into a rendered string with sentinels for native types
    const rendered = this.evaluateNodeList(program.body, 0);

    // Try to parse as JSON if it looks like an object or array
    const trimmed = rendered.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(rendered) as unknown;
        return this.restoreNativeTypes(parsed);
      } catch {
        // If JSON.parse fails, replace sentinels with string representations
        return this.replaceAllSentinels(rendered);
      }
    }

    return this.replaceAllSentinels(rendered);
  }

  private evaluateNodeList(nodes: ASTNode[], depth: number): string {
    let result = "";
    for (const node of nodes) {
      result += this.evaluateNodeToString(node, depth);
    }
    return result;
  }

  private evaluateNodeToString(node: ASTNode, depth: number): string {
    this.checkLimits(depth);

    if (node.type === "Text") {
      return node.value;
    }

    if (node.type === "Literal") {
      return String(node.value ?? "");
    }

    if (node.type === "Expression") {
      const val = this.evaluateExpression(node, depth);
      if (val === undefined) {
        return node.rawToken;
      }

      // Create a sentinel to preserve native type in JSON structures
      const sentinel = `__FACK_VAL_${this.sentinelCounter++}_${crypto.randomBytes(4).toString("hex")}__`;
      this.sentinelMap.set(sentinel, val);
      return sentinel;
    }

    if (node.type === "IfBlock") {
      return this.evaluateIfBlockToString(node, depth);
    }

    return "";
  }

  private evaluateIfBlockToString(node: IfBlockNode, depth: number): string {
    this.checkLimits(depth);

    const condVal = this.evaluateNode(node.condition, depth + 1);
    if (isTruthy(condVal)) {
      return this.evaluateNodeList(node.consequent, depth + 1);
    } else if (node.alternate) {
      return this.evaluateNodeList(node.alternate, depth + 1);
    }
    return "";
  }

  private evaluateNode(node: ASTNode, depth: number): unknown {
    this.checkLimits(depth);

    if (node.type === "Text") {
      return node.value;
    }

    if (node.type === "Literal") {
      return node.value;
    }

    if (node.type === "Path") {
      return this.resolvePath(node.path);
    }

    if (node.type === "Expression") {
      return this.evaluateExpression(node, depth);
    }

    if (node.type === "SubExpression") {
      const evaluatedArgs = node.args.map((arg) =>
        this.evaluateNode(arg, depth + 1),
      );
      return defaultHelperRegistry.execute(
        node.callee,
        evaluatedArgs,
        this.context,
      );
    }

    return undefined;
  }

  private evaluateExpression(node: ExpressionNode, depth: number): unknown {
    this.checkLimits(depth);

    // If callee is present, invoke helper
    if (node.callee) {
      const evaluatedArgs = node.args.map((arg) =>
        this.evaluateNode(arg, depth + 1),
      );
      return defaultHelperRegistry.execute(
        node.callee,
        evaluatedArgs,
        this.context,
      );
    }

    // If no callee, single argument path or literal
    if (node.args.length === 1) {
      const arg = node.args[0];
      if (arg.type === "Path") {
        return this.resolvePath(arg.path);
      }
      if (arg.type === "Literal") {
        return arg.value;
      }
      if (arg.type === "SubExpression") {
        return this.evaluateNode(arg, depth + 1);
      }
    }

    return undefined;
  }

  private resolvePath(path: string): unknown {
    // Direct Faker expression
    if (path.startsWith("faker.")) {
      const fakerPath = path.slice(6);
      return evaluateFakerExpression(fakerPath);
    }

    // Request context
    if (path.startsWith("request.")) {
      const prop = path.slice(8);
      return getPathValue(this.context.request, prop);
    }

    // State context
    if (path.startsWith("state.")) {
      const prop = path.slice(6);
      return getPathValue(this.context.state, prop);
    }

    // Environment variables
    if (path.startsWith("env.")) {
      const prop = path.slice(4);
      return getPathValue(this.context.env, prop);
    }

    // Runtime variables
    if (path.startsWith("runtime.")) {
      const prop = path.slice(8);
      return getPathValue(this.context.runtime, prop);
    }

    // Runtime shorthands
    if (path === "uuid") {
      return this.context.runtime?.uuid ?? crypto.randomUUID();
    }
    if (path === "now") {
      return this.context.runtime?.isoDate ?? new Date().toISOString();
    }
    if (path === "timestamp") {
      return this.context.runtime?.timestamp ?? Date.now();
    }
    if (path === "increment") {
      if (this.context.runtime) {
        return this.context.runtime.counter++;
      }
      return 1;
    }
    if (path === "random.int" || path === "randomInt") {
      return Math.floor(Math.random() * 1000);
    }

    // Fallback: check helper with 0 arguments or root context
    if (defaultHelperRegistry.has(path)) {
      return defaultHelperRegistry.execute(path, [], this.context);
    }

    return getPathValue(this.context, path);
  }

  private restoreNativeTypes(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "string") {
      // If the string is an exact match for a single sentinel, replace with native value
      if (this.sentinelMap.has(obj)) {
        return this.sentinelMap.get(obj);
      }
      // If the string contains sentinels mixed with other text, perform string replacement
      return this.replaceAllSentinels(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.restoreNativeTypes(item));
    }

    if (typeof obj === "object") {
      const record = obj as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(record)) {
        result[key] = this.restoreNativeTypes(val);
      }
      return result;
    }

    return obj;
  }

  private replaceAllSentinels(str: string): string {
    let result = str;
    for (const [sentinel, val] of this.sentinelMap.entries()) {
      if (result.includes(sentinel)) {
        const strVal =
          val === null || val === undefined
            ? ""
            : typeof val === "object"
              ? JSON.stringify(val)
              : toStr(val);
        result = result.split(sentinel).join(strVal);
      }
    }
    return result;
  }
}
