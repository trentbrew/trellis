import { callBuiltin } from './registry.js';
import { resolveField } from './context.js';
import type { EvalContextV1 } from './context.js';
import type { ExprNode } from './ir.js';

export function evaluateNode(node: ExprNode, ctx: EvalContextV1): unknown {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'null':
      return null;
    case 'string':
      return node.value;
    case 'bool':
      return node.value;
    case 'field':
      return resolveField(ctx, node.path, node.scope);
    case 'unary':
      return -Number(evaluateNode(node.arg, ctx));
    case 'binop': {
      const l = Number(evaluateNode(node.left, ctx));
      const r = Number(evaluateNode(node.right, ctx));
      switch (node.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          return l / r;
      }
    }
    case 'call':
      return callBuiltin(node.name, node.args, ctx, (n) => evaluateNode(n, ctx));
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
}
