import { parse, evaluate } from '../index.js';
import type { EvalContextV1 } from '../context.js';

export function evaluateCms(expr: string, ctx: EvalContextV1): unknown {
  const ast = parse(expr, 'cms-brace');
  return evaluate(ast, ctx);
}
