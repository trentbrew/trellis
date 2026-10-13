/** Canonical IR for formula-core v1 (ADR 0059 slice 1). */

export type BinOp = '+' | '-' | '*' | '/';

export type ExprNode =
  | { kind: 'number'; value: number }
  | { kind: 'null' }
  | { kind: 'string'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'field'; path: string[]; scope: 'record' | 'request' }
  | { kind: 'binop'; op: BinOp; left: ExprNode; right: ExprNode }
  | { kind: 'unary'; op: '-'; arg: ExprNode }
  | { kind: 'call'; name: string; args: ExprNode[] };

export type DialectTag = 'kernel-fn' | 'cms-brace' | 'pb-compat';
