import { parse, evaluate } from '../index.js';
import type { EvalContextV1 } from '../context.js';

export function evaluateKernel(expr: string, ctx: EvalContextV1): unknown {
  const ast = parse(expr, 'kernel-fn');
  return evaluate(ast, ctx);
}
