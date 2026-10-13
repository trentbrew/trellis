import type { DialectTag, ExprNode } from './ir.js';

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

export function assertPbCompatSurface(expr: string): void {
  const src = String(expr);
  if (/["']/.test(src)) {
    throw new ParseError('pb-compat: string literals not allowed');
  }
  if (/\bconcat\s*\(/i.test(src)) {
    throw new ParseError('pb-compat: concat() not allowed');
  }
  if (/\$[A-Za-z_]/.test(src)) {
    throw new ParseError('pb-compat: kernel $ refs not allowed');
  }
}

function parseKernelFn(expr: string): ExprNode {
  return parseKernelExpr(expr.trim());
}

function parseKernelExpr(trimmed: string): ExprNode {
  const fnMatch = trimmed.match(/^(\$[a-zA-Z_]\w*)\((.*)\)$/s);
  if (fnMatch) {
    const name = fnMatch[1];
    const argsStr = fnMatch[2];
    const args = splitTopLevelArgs(argsStr).map((a) => parseKernelExpr(a.trim()));
    return { kind: 'call', name, args };
  }
  if (trimmed.startsWith('$')) {
    const field = trimmed.slice(1);
    return { kind: 'field', path: [field], scope: 'record' };
  }
  if (trimmed === 'true') return { kind: 'bool', value: true };
  if (trimmed === 'false') return { kind: 'bool', value: false };
  if (trimmed === 'null') return { kind: 'null' };
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') {
    return { kind: 'number', value: num };
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return { kind: 'string', value: trimmed.slice(1, -1) };
  }
  throw new ParseError(`kernel-fn: cannot parse ${trimmed}`);
}

function splitTopLevelArgs(argsStr: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      args.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) args.push(current);
  return args;
}

type InfixTok =
  | { t: 'num'; v: number }
  | { t: 'field'; path: string[]; scope: 'record' | 'request' }
  | { t: 'op'; v: string }
  | { t: 'lp' }
  | { t: 'rp' };

function tokenizeInfix(expr: string, dialect: 'cms-brace' | 'pb-compat'): InfixTok[] {
  const src = expr.trim();
  const out: InfixTok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '(') {
      out.push({ t: 'lp' });
      i++;
      continue;
    }
    if (ch === ')') {
      out.push({ t: 'rp' });
      i++;
      continue;
    }
    if ('+-*/'.includes(ch)) {
      out.push({ t: 'op', v: ch });
      i++;
      continue;
    }
    if (dialect === 'cms-brace' && ch === '{') {
      const end = src.indexOf('}', i);
      if (end < 0) throw new ParseError('unclosed {');
      const name = src.slice(i + 1, end).trim();
      if (!name) throw new ParseError('empty field');
      out.push({ t: 'field', path: [name], scope: 'record' });
      i = end + 1;
      continue;
    }
    if (dialect === 'pb-compat' && ch === '@') {
      const m = src.slice(i).match(/^@([A-Za-z_][\w.]*)/);
      if (!m) throw new ParseError('bad @ ref');
      const raw = m[1];
      const path = raw.split('.');
      const scope = path[0] === 'request' ? 'request' : 'record';
      const fieldPath = scope === 'request' ? path.slice(1) : path;
      out.push({ t: 'field', path: fieldPath, scope });
      i += m[0].length;
      continue;
    }
    const numM = src.slice(i).match(/^(\d+(?:\.\d+)?)/);
    if (numM) {
      out.push({ t: 'num', v: Number(numM[1]) });
      i += numM[1].length;
      continue;
    }
    throw new ParseError(`unexpected char at ${i}: ${ch}`);
  }
  return out;
}

function parseInfixTokens(tokens: InfixTok[]): ExprNode {
  let pos = 0;
  function parseExpr(minPrec: number): ExprNode {
    let left = parsePrimary();
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok.t !== 'op') break;
      const prec = tok.v === '+' || tok.v === '-' ? 1 : 2;
      if (prec < minPrec) break;
      pos++;
      const op = tok.v as '+' | '-' | '*' | '/';
      const rightPrec = prec + (op === '*' || op === '/' ? 1 : 0);
      const right = parseExpr(rightPrec);
      left = { kind: 'binop', op, left, right };
    }
    return left;
  }
  function parsePrimary(): ExprNode {
    const tok = tokens[pos++];
    if (!tok) throw new ParseError('unexpected end');
    if (tok.t === 'num') return { kind: 'number', value: tok.v };
    if (tok.t === 'field') return { kind: 'field', path: tok.path, scope: tok.scope };
    if (tok.t === 'lp') {
      const inner = parseExpr(0);
      if (tokens[pos]?.t !== 'rp') throw new ParseError('expected )');
      pos++;
      return inner;
    }
    if (tok.t === 'op' && tok.v === '-') {
      return { kind: 'unary', op: '-', arg: parsePrimary() };
    }
    throw new ParseError('bad primary');
  }
  const ast = parseExpr(0);
  if (pos < tokens.length) throw new ParseError('trailing tokens');
  return ast;
}

export function parse(expr: string, dialect: DialectTag): ExprNode {
  if (dialect === 'pb-compat') {
    assertPbCompatSurface(expr);
  }
  if (dialect === 'kernel-fn') {
    return parseKernelFn(expr);
  }
  const tokens = tokenizeInfix(expr, dialect);
  return parseInfixTokens(tokens);
}

export function tokenize(expr: string, dialect: DialectTag): string[] {
  if (dialect === 'kernel-fn') {
    return expr.trim().split(/\s+/).filter(Boolean);
  }
  return tokenizeInfix(expr, dialect).map((t) => JSON.stringify(t));
}
