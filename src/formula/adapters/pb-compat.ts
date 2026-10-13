import { parse, evaluate } from '../index.js';
import { assertPbCompatSurface } from '../parse.js';
import type { EvalContextV1 } from '../context.js';

export function assertPbSurface(expr: string): void {
  assertPbCompatSurface(expr);
}

export function evaluatePb(expr: string, ctx: EvalContextV1): unknown {
  const ast = parse(expr, 'pb-compat');
  return evaluate(ast, ctx);
}

export type PbCompatClass = 'cms-numeric' | 'shablon-rich' | 'invalid';

const CMS_NUMERIC_RE = /^[\d\s.+*/()-]+$/;
const FN_CALL_RE = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
const REF_RE = /@([A-Za-z0-9_]+)/g;

function stripRefs(expr: string): string {
  return expr.replace(REF_RE, ' ');
}

/** Aligned with shablon `classifyFormula` (lab/oss/shablon src/formula/dialect.js). */
export function classifyPbCompat(expr: string | null | undefined): PbCompatClass {
  if (expr == null || !String(expr).trim()) {
    return 'invalid';
  }
  const src = String(expr);
  if (/["']/.test(src)) {
    return 'shablon-rich';
  }
  if (/\$[A-Za-z_]/.test(src)) {
    return 'shablon-rich';
  }
  let fnMatch: RegExpExecArray | null;
  FN_CALL_RE.lastIndex = 0;
  while ((fnMatch = FN_CALL_RE.exec(src))) {
    const name = fnMatch[1];
    if (name !== 'round' && name !== 'concat') {
      return 'shablon-rich';
    }
    if (name === 'concat' || name === 'round') {
      return 'shablon-rich';
    }
  }
  const remainder = stripRefs(src);
  if (!CMS_NUMERIC_RE.test(remainder)) {
    return 'shablon-rich';
  }
  return 'cms-numeric';
}
