export interface EvalContextV1 {
  record: Record<string, unknown>;
  request?: Record<string, unknown>;
}

/** JSON-LD single-element arrays unwrap one level; missing → null. */
export function normalizeValue(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }
  if (Array.isArray(value) && value.length === 1) {
    return normalizeValue(value[0]);
  }
  return value;
}

export function resolveField(ctx: EvalContextV1, path: string[], scope: 'record' | 'request'): unknown {
  let cur: unknown = scope === 'request' ? ctx.request : ctx.record;
  if (scope === 'request' && (cur === undefined || cur === null)) {
    return null;
  }
  for (const key of path) {
    if (cur === null || cur === undefined || typeof cur !== 'object') {
      return null;
    }
    cur = (cur as Record<string, unknown>)[key];
  }
  return normalizeValue(cur);
}
