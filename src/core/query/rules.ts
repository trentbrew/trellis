/**
 * Rules as graph data (ADR 0047 §2).
 *
 * A rule is an entity of type `Rule` whose `source` is EQL-S rule text, e.g.
 *
 *   reach(?x, ?y) :- (?x "next" ?z), reach(?z, ?y)
 *
 * Several `Rule` entities may define clauses of the same rule name (a union,
 * like `addRule`). `enabled: false` switches a rule off without deleting it.
 * Writes are validated by the rule middleware; the engine loads enabled rules
 * at query time.
 *
 * @module trellis/core/query
 */

import type { EAVStore } from '../store/eav-store.js';
import type { DatalogRule, Pattern } from './types.js';
import { parseRule } from './parser.js';

export const RULE_TYPE = 'Rule';

export interface StoredRule {
  entityId: string;
  rule: DatalogRule;
}

/** Last value of an attribute on an entity (facts are append-ordered). */
function lastValue(store: EAVStore, entityId: string, attribute: string): unknown {
  const facts = store.getFactsByEntity(entityId).filter((f) => f.a === attribute);
  return facts.length ? facts[facts.length - 1]!.v : undefined;
}

/**
 * Enabled rules stored in the graph. Rules that fail to parse are returned
 * separately so the engine can report them when a query uses them, instead of
 * failing every query.
 */
export function loadStoreRules(store: EAVStore): { rules: StoredRule[]; invalid: Map<string, string> } {
  const rules: StoredRule[] = [];
  const invalid = new Map<string, string>();
  for (const fact of store.getFactsByValue('type', RULE_TYPE)) {
    const entityId = fact.e;
    if (lastValue(store, entityId, 'enabled') === false) continue;
    const source = lastValue(store, entityId, 'source');
    if (typeof source !== 'string' || !source.trim()) continue;
    try {
      rules.push({ entityId, rule: parseRule(source) });
    } catch (err) {
      const named = /^\s*([A-Za-z_][\w]*)\s*\(/.exec(source)?.[1] ?? entityId;
      invalid.set(named, `${entityId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { rules, invalid };
}

// ---------------------------------------------------------------------------
// Static checks (write time): range restriction and stratification
// ---------------------------------------------------------------------------

function varsIn(p: Pattern, out: Set<string>): void {
  const add = (t: { kind: string; name?: string }) => {
    if (t.kind === 'variable' && t.name) out.add(t.name);
  };
  if (p.kind === 'fact') { add(p.entity); add(p.attribute); add(p.value); }
  else if (p.kind === 'link') { add(p.source); add(p.attribute); add(p.target); }
  else if (p.kind === 'rule') for (const a of p.args) add(a);
}

/** Variables bound by positive patterns (a variable bound in every `or` branch counts). */
function positiveVars(body: Pattern[]): Set<string> {
  const out = new Set<string>();
  for (const p of body) {
    if (p.kind === 'not') continue;
    if (p.kind === 'or') {
      const branches = p.branches.map((b) => positiveVars(b));
      if (!branches.length) continue;
      for (const v of branches[0]!) if (branches.every((b) => b.has(v))) out.add(v);
      continue;
    }
    varsIn(p, out);
  }
  return out;
}

/** Params a rule's body never binds positively (range restriction). */
export function unboundParams(rule: DatalogRule): string[] {
  const bound = positiveVars(rule.body);
  return rule.params.filter((p) => !bound.has(p));
}

function deps(patterns: Pattern[], negated: boolean, out: Array<{ to: string; negated: boolean }>): void {
  for (const p of patterns) {
    if (p.kind === 'rule') out.push({ to: p.name, negated });
    else if (p.kind === 'not') deps([p.pattern], true, out);
    else if (p.kind === 'or') for (const b of p.branches) deps(b, negated, out);
  }
}

/**
 * Negation that goes through recursion (a negative dependency inside a
 * strongly connected component of the rule graph) — the program has no
 * stratification. Returns one offending pair per SCC, or [].
 */
export function unstratified(rules: DatalogRule[]): Array<{ rule: string; negates: string }> {
  const edges = new Map<string, Array<{ to: string; negated: boolean }>>();
  for (const r of rules) {
    const list = edges.get(r.name) ?? [];
    deps(r.body, false, list);
    edges.set(r.name, list);
  }
  // Tarjan's SCC
  let index = 0;
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccOf = new Map<string, number>();
  let scc = 0;
  const visit = (v: string) => {
    idx.set(v, index); low.set(v, index); index++;
    stack.push(v); onStack.add(v);
    for (const { to } of edges.get(v) ?? []) {
      if (!idx.has(to)) { visit(to); low.set(v, Math.min(low.get(v)!, low.get(to)!)); }
      else if (onStack.has(to)) low.set(v, Math.min(low.get(v)!, idx.get(to)!));
    }
    if (low.get(v) === idx.get(v)) {
      let w: string;
      do { w = stack.pop()!; onStack.delete(w); sccOf.set(w, scc); } while (w !== v);
      scc++;
    }
  };
  for (const v of edges.keys()) if (!idx.has(v)) visit(v);

  const bad: Array<{ rule: string; negates: string }> = [];
  for (const [from, list] of edges) {
    for (const e of list) {
      if (e.negated && sccOf.has(e.to) && sccOf.get(e.to) === sccOf.get(from)) bad.push({ rule: from, negates: e.to });
    }
  }
  return bad;
}

/**
 * Validate a program: every rule range-restricted, negation stratified.
 * @returns human-readable errors (empty when valid)
 */
export function validateRules(rules: DatalogRule[]): string[] {
  const errors: string[] = [];
  for (const r of rules) {
    const missing = unboundParams(r);
    if (missing.length) errors.push(`rule "${r.name}": param ${missing.map((m) => `?${m}`).join(', ')} is not bound by its body`);
  }
  for (const { rule, negates } of unstratified(rules)) {
    errors.push(`rule "${rule}" negates "${negates}", which depends on "${rule}" — unstratified negation is not supported`);
  }
  return errors;
}
