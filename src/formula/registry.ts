import type { ExprNode } from './ir.js';
import { evaluateNode } from './evaluate.js';
import type { EvalContextV1 } from './context.js';

type BuiltinFn = (args: unknown[], ctx: EvalContextV1, evalChild: (n: ExprNode) => unknown) => unknown;

const builtins: Record<string, BuiltinFn> = {
  $add: (args) => args.reduce((s: number, a) => s + Number(a), 0),
  $sub: (args) => Number(args[0]) - Number(args[1]),
  $mul: (args) => args.reduce((p: number, a) => p * Number(a), 1),
  $div: (args) => Number(args[0]) / Number(args[1]),
  $if: (args) => (args[0] ? args[1] : args[2]),
  $gt: (args) => Number(args[0]) > Number(args[1]),
  $eq: (args) => args[0] === args[1],
  $round: (args) => {
    const factor = 10 ** Number(args[1] ?? 0);
    return Math.round(Number(args[0]) * factor) / factor;
  },
  $concat: (args) => args.map((a) => String(a ?? '')).join(''),
};

export function callBuiltin(
  name: string,
  argNodes: ExprNode[],
  ctx: EvalContextV1,
  evalChild: (n: ExprNode) => unknown,
): unknown {
  const fn = builtins[name];
  if (!fn) {
    throw new Error(`Unknown function: ${name}`);
  }
  const args = argNodes.map((n) => evalChild(n));
  return fn(args, ctx, evalChild);
}

export const V1_BUILTIN_NAMES = Object.keys(builtins);
