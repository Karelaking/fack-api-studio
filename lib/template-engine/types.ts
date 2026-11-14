/**
 * Fack API - Dynamic Response Template Engine Types
 *
 * Defines types for the tokenizer, AST nodes, template context, helper registry,
 * evaluator options, and diagnostics.
 */

export type TokenType =
  | "TEXT"
  | "OPEN_MUSTACHE" // {{
  | "CLOSE_MUSTACHE" // }}
  | "OPEN_BLOCK" // {{#
  | "CLOSE_BLOCK" // {{/
  | "ELSE" // {{else}} or {{else if ...}}
  | "IDENTIFIER" // e.g. request.body.name, uppercase
  | "STRING_LITERAL" // "..." or '...'
  | "NUMBER_LITERAL" // 42, 3.14, -10
  | "BOOLEAN_LITERAL" // true, false
  | "NULL_LITERAL" // null
  | "OPEN_PAREN" // (
  | "CLOSE_PAREN"; // )

export interface SourceLocation {
  line: number;
  column: number;
}

export interface Token {
  type: TokenType;
  value: string;
  loc: SourceLocation;
}

export type ASTNode =
  | ProgramNode
  | TextNode
  | PathNode
  | LiteralNode
  | ExpressionNode
  | SubExpressionNode
  | IfBlockNode;

export interface ProgramNode {
  type: "Program";
  body: ASTNode[];
  loc: SourceLocation;
}

export interface TextNode {
  type: "Text";
  value: string;
  loc: SourceLocation;
}

export interface PathNode {
  type: "Path";
  path: string;
  loc: SourceLocation;
}

export interface LiteralNode {
  type: "Literal";
  value: string | number | boolean | null;
  raw: string;
  loc: SourceLocation;
}

export interface ExpressionNode {
  type: "Expression";
  callee?: string;
  args: ASTNode[];
  rawToken: string;
  loc: SourceLocation;
}

export interface SubExpressionNode {
  type: "SubExpression";
  callee: string;
  args: ASTNode[];
  loc: SourceLocation;
}

export interface IfBlockNode {
  type: "IfBlock";
  condition: ASTNode;
  consequent: ASTNode[];
  alternate?: ASTNode[];
  loc: SourceLocation;
}

export interface TemplateError {
  message: string;
  code: string;
  line?: number;
  column?: number;
  snippet?: string;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: TemplateError[];
}

export interface TemplateRequestData {
  method?: string;
  path?: string;
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface TemplateRequestContext {
  request: TemplateRequestData;
}

export interface TemplateStateContext {
  current?: Record<string, unknown>;
  collections?: Record<string, Record<string, unknown>[]>;
  lookup?: (
    collection: string,
    id: string,
  ) => Record<string, unknown> | undefined;
  count?: (collection: string) => number;
  [key: string]: unknown;
}

export interface TemplateRuntimeContext {
  timestamp: number;
  isoDate: string;
  uuid: string;
  scenario?: string;
  counter: number;
}

export interface TemplateContext {
  request: TemplateRequestData;
  state?: TemplateStateContext;
  env?: Record<string, string>;
  runtime?: TemplateRuntimeContext;
}

export interface TemplateEvaluationOptions {
  context: TemplateContext;
  seed?: number;
  maxOperations?: number;
  maxDepth?: number;
  allowlistEnvKeys?: string[];
}

export interface TemplateEvaluationResult {
  success: boolean;
  value?: unknown;
  errors?: TemplateError[];
}

export type HelperFunction = (
  args: unknown[],
  context: TemplateContext,
) => unknown;
