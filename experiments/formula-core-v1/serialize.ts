import type { ExprNode } from './ir.js';

function fieldSurface(node: ExprNode & { kind: 'field' }, dialect: 'cms-brace' | 'pb-compat' | 'kernel-fn'): string {
  if (dialect === 'kernel-fn') {
    return `$${node.path[0]}`;
  }
  if (node.scope === 'request') {
    return `@request.${node.path.join('.')}`;
  }
  if (dialect === 'cms-brace') {
    return `{${node.path[0]}}`;
  }
  return `@${node.path.join('.')}`;
}

export function serialize(node: ExprNode, dialect: 'kernel-fn' | 'cms-brace' | 'pb-compat' = 'kernel-fn'): string {
  switch (node.kind) {
    case 'number':
      return String(node.value);
    case 'null':
      return 'null';
    case 'string':
      return `"${node.value}"`;
    case 'bool':
      return node.value ? 'true' : 'false';
    case 'field':
      return fieldSurface(node, dialect);
    case 'unary':
      return `(-${serialize(node.arg, dialect)})`;
    case 'binop': {
      const l = serialize(node.left, dialect);
      const r = serialize(node.right, dialect);
      return `(${l} ${node.op} ${r})`;
    }
    case 'call':
      return `${node.name}(${node.args.map((a) => serialize(a, dialect)).join(', ')})`;
    default:
      throw new Error('invalid node');
  }
}
