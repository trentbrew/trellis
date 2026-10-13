import type { DialectTag, ExprNode } from './ir.js';
import type { EvalContextV1 } from './context.js';
import { parse, tokenize as tokenizeExpr, ParseError } from './parse.js';
import { serialize as serializeNode } from './serialize.js';
import { evaluateNode } from './evaluate.js';

export type { DialectTag, ExprNode, EvalContextV1 };
export { ParseError } from './parse.js';
export { V1_BUILTIN_NAMES } from './registry.js';
export { parse, tokenizeExpr as tokenize, serializeNode as serialize, evaluateNode as evaluate };

export function parseAndEvaluate(
  expr: string,
  dialect: DialectTag,
  context: EvalContextV1,
): unknown {
  const ast = parse(expr, dialect);
  return evaluateNode(ast, context);
}

export function roundtripCanonical(expr: string, dialect: DialectTag): string {
  const ast = parse(expr, dialect);
  return serializeNode(ast, dialect);
}
