/**
 * EQL-S Query Engine — Pattern-matching evaluator over the EAV store.
 *
 * Evaluates queries by matching fact/link patterns against the store,
 * binding variables, applying filters, and computing aggregates.
 *
 * @module trellis/core/query
 */

import type { EAVStore, Fact, Link, Atom } from '../store/eav-store.js';
import type {
  Query,
  Pattern,
  FactPattern,
  LinkPattern,
  NotPattern,
  OrPattern,
  RuleApplication,
  Filter,
  FilterOp,
  Aggregate,
  OrderBy,
  Term,
  Bindings,
  DatalogRule,
} from './types.js';
import { isVariable, isLiteral } from './types.js';
import { loadStoreRules } from './rules.js';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface QueryResult {
  bindings: Record<string, Atom>[];
  executionTime: number;
  count: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class QueryEngine {
  private rules: Map<string, DatalogRule[]> = new Map();
  /** Rule relations computed during the current execute() (store is fixed for a query). */
  private relations: Map<string, Map<string, Atom[]>> = new Map();
  /** Rules stored as graph entities (ADR 0047 §2), loaded per execute(). */
  private storeRules: Map<string, DatalogRule[]> = new Map();
  /** Stored rules that failed to parse, by rule name: reported when a query uses them. */
  private invalidStoreRules: Map<string, string> = new Map();
  /** Relations of the rule component being solved right now (read by recursive calls). */
  private solving: Map<string, Map<string, Atom[]>> | null = null;
  /** Semi-naive: the one rule occurrence that reads last round's new tuples. */
  private deltaSite: { pattern: RuleApplication, delta: Map<string, Atom[]> } | null = null;
  /** Join indexes per relation, by bound-position signature, valid while the size is unchanged. */
  private joinIndexes = new WeakMap<Map<string, Atom[]>, Map<string, { size: number, index: Map<string, Atom[][]> }>>();

  constructor(private store: EAVStore) {}

  /** Register a Datalog rule. Multiple rules with the same name = union. */
  addRule(rule: DatalogRule): void {
    const existing = this.rules.get(rule.name) ?? [];
    existing.push(rule);
    this.rules.set(rule.name, existing);
  }

  removeRule(name: string): void {
    this.rules.delete(name);
  }

  /** Execute a query against the store. */
  execute(query: Query): QueryResult {
    const start = performance.now();
    this.relations = new Map();
    const stored = loadStoreRules(this.store);
    this.storeRules = new Map();
    for (const { rule } of stored.rules) {
      const list = this.storeRules.get(rule.name) ?? [];
      list.push(rule);
      this.storeRules.set(rule.name, list);
    }
    this.invalidStoreRules = stored.invalid;

    // Evaluate patterns
    let results = this._evaluatePatterns(query.where, [new Map()]);

    // Apply filters
    for (const filter of query.filters) {
      results = results.filter((b) => this._evalFilter(filter, b));
    }

    // Apply aggregates
    if (query.aggregates.length > 0) {
      results = this._aggregate(results, query.aggregates, query.select);
    }

    // Apply ordering
    if (query.orderBy.length > 0) {
      results = this._order(results, query.orderBy);
    }

    // Apply offset/limit
    if (query.offset > 0) results = results.slice(query.offset);
    if (query.limit > 0) results = results.slice(0, query.limit);

    // Project selected variables (plus any aggregate output columns)
    const projectVars =
      query.select.length > 0
        ? [...query.select, ...query.aggregates.map((a) => a.as)]
        : [];
    const projected = this._project(results, projectVars);

    return {
      bindings: projected,
      executionTime: performance.now() - start,
      count: projected.length,
    };
  }

  // -------------------------------------------------------------------------
  // Pattern evaluation
  // -------------------------------------------------------------------------

  private _evaluatePatterns(
    patterns: Pattern[],
    bindings: Bindings[],
  ): Bindings[] {
    let current = bindings;
    for (const pattern of patterns) {
      if (current.length === 0) break;
      current = this._evaluatePattern(pattern, current);
    }
    return current;
  }

  private _evaluatePattern(pattern: Pattern, bindings: Bindings[]): Bindings[] {
    switch (pattern.kind) {
      case 'fact':
        return this._evalFactPattern(pattern, bindings);
      case 'link':
        return this._evalLinkPattern(pattern, bindings);
      case 'not':
        return this._evalNotPattern(pattern, bindings);
      case 'or':
        return this._evalOrPattern(pattern, bindings);
      case 'rule':
        return this._evalRuleApplication(pattern, bindings);
    }
  }

  private _evalFactPattern(p: FactPattern, bindings: Bindings[]): Bindings[] {
    const results: Bindings[] = [];
    for (const b of bindings) {
      const eResolved = this._resolve(p.entity, b);
      const aResolved = this._resolve(p.attribute, b);
      const vResolved = this._resolve(p.value, b);

      let facts: Fact[];
      if (eResolved !== undefined && aResolved !== undefined) {
        facts = this.store
          .getFactsByEntity(String(eResolved))
          .filter((f) => f.a === aResolved);
      } else if (eResolved !== undefined) {
        facts = this.store.getFactsByEntity(String(eResolved));
      } else if (aResolved !== undefined && vResolved !== undefined) {
        facts = this.store.getFactsByValue(String(aResolved), vResolved);
      } else if (aResolved !== undefined) {
        facts = this.store.getFactsByAttribute(String(aResolved));
      } else {
        facts = this.store.getAllFacts();
      }

      if (vResolved !== undefined) {
        facts = facts.filter((f) => f.v === vResolved);
      }

      for (const fact of facts) {
        const nb = new Map(b);
        if (
          this._bind(p.entity, fact.e, nb) &&
          this._bind(p.attribute, fact.a, nb) &&
          this._bind(p.value, fact.v, nb)
        ) {
          results.push(nb);
        }
      }
    }
    return results;
  }

  private _evalLinkPattern(p: LinkPattern, bindings: Bindings[]): Bindings[] {
    const results: Bindings[] = [];
    for (const b of bindings) {
      const srcResolved = this._resolve(p.source, b);
      const attrResolved = this._resolve(p.attribute, b);
      const tgtResolved = this._resolve(p.target, b);

      let links: Link[];
      if (srcResolved !== undefined && attrResolved !== undefined) {
        links = this.store.getLinksByEntityAndAttribute(
          String(srcResolved),
          String(attrResolved),
        );
      } else if (srcResolved !== undefined) {
        links = this.store.getLinksByEntity(String(srcResolved));
      } else if (attrResolved !== undefined) {
        links = this.store.getLinksByAttribute(String(attrResolved));
      } else {
        links = this.store.getAllLinks();
      }

      if (tgtResolved !== undefined) {
        links = links.filter((l) => l.e2 === tgtResolved);
      }

      for (const link of links) {
        const nb = new Map(b);
        if (
          this._bind(p.source, link.e1, nb) &&
          this._bind(p.attribute, link.a, nb) &&
          this._bind(p.target, link.e2, nb)
        ) {
          results.push(nb);
        }
      }
    }
    return results;
  }

  private _evalNotPattern(p: NotPattern, bindings: Bindings[]): Bindings[] {
    return bindings.filter((b) => {
      const matches = this._evaluatePattern(p.pattern, [b]);
      return matches.length === 0;
    });
  }

  private _evalOrPattern(p: OrPattern, bindings: Bindings[]): Bindings[] {
    const results: Bindings[] = [];
    for (const branch of p.branches) {
      const branchResults = this._evaluatePatterns(branch, bindings);
      results.push(...branchResults);
    }
    return this._dedup(results);
  }

  /**
   * A rule application joins the caller's bindings with the rule's relation.
   *
   * Relations are computed bottom-up to a fixpoint (see _relation). The old
   * top-down evaluator evaluated rule bodies with a copy of the caller's
   * bindings, so a recursive call saw its own body variables pre-bound
   * (variable capture): transitive closure stopped after two hops, silently.
   */
  private _evalRuleApplication(p: RuleApplication, bindings: Bindings[]): Bindings[] {
    const relation = this.deltaSite?.pattern === p ? this.deltaSite.delta : this._relation(p.name);
    const results: Bindings[] = [];
    // Index the relation by the argument positions each binding has bound,
    // so a join is a lookup rather than a full scan. Indexes are reused while
    // the relation hasn't grown.
    let indexes = this.joinIndexes.get(relation);
    if (!indexes) this.joinIndexes.set(relation, (indexes = new Map()));
    for (const b of bindings) {
      const resolved = p.args.map((arg) => this._resolve(arg, b));
      const bound = resolved.map((v, i) => (v !== undefined ? i : -1)).filter((i) => i >= 0);
      const sig = bound.join(',');
      let entry = indexes.get(sig)
      if (!entry || entry.size !== relation.size) {
        const index = new Map<string, Atom[][]>();
        for (const tuple of relation.values()) {
          const k = JSON.stringify(bound.map((i) => tuple[i]));
          const list = index.get(k);
          if (list) list.push(tuple);
          else index.set(k, [tuple]);
        }
        entry = { size: relation.size, index };
        indexes.set(sig, entry);
      }
      const index = entry.index;
      for (const tuple of index.get(JSON.stringify(bound.map((i) => resolved[i]))) ?? []) {
        let ok = true;
        const nb = new Map(b);
        for (let i = 0; i < p.args.length && ok; i++) {
          if (resolved[i] !== undefined || !isVariable(p.args[i])) continue;
          const name = (p.args[i] as { name: string }).name;
          const seen = nb.get(name);
          if (seen === undefined) nb.set(name, tuple[i]);
          else ok = seen === tuple[i]; // same variable twice: reach(?x, ?x)
        }
        if (ok) results.push(nb);
      }
    }
    return this._dedup(results);
  }

  /** Rule names a pattern list applies, split by whether they appear under `not`. */
  private _ruleDeps(patterns: Pattern[], negated = false, out = { pos: new Set<string>(), neg: new Set<string>() }) {
    for (const pat of patterns) {
      if (pat.kind === 'rule') (negated ? out.neg : out.pos).add(pat.name);
      else if (pat.kind === 'not') this._ruleDeps([pat.pattern], true, out);
      else if (pat.kind === 'or') for (const br of pat.branches) this._ruleDeps(br, negated, out);
    }
    return out;
  }

  /** Clauses of a rule: registered in code plus stored as `Rule` entities. */
  private _rulesFor(name: string): DatalogRule[] {
    return [...(this.rules.get(name) ?? []), ...(this.storeRules.get(name) ?? [])];
  }

  /** Positive rule-application patterns in a body (including inside `or`). */
  private _positiveSites(patterns: Pattern[], out: RuleApplication[] = []): RuleApplication[] {
    for (const pat of patterns) {
      if (pat.kind === 'rule') out.push(pat);
      else if (pat.kind === 'or') for (const br of pat.branches) this._positiveSites(br, out);
    }
    return out;
  }

  /** Rules reachable from `name` through positive (non-negated) applications. */
  private _positiveClosure(name: string): Set<string> {
    const seen = new Set<string>();
    const stack = [name];
    while (stack.length) {
      const n = stack.pop()!;
      if (seen.has(n)) continue;
      seen.add(n);
      for (const r of this._rulesFor(n)) for (const d of this._ruleDeps(r.body).pos) stack.push(d);
    }
    return seen;
  }

  /**
   * The full relation of a rule, as tuples of its params, computed bottom-up:
   * evaluate every body of the rule's component (the rules it reaches through
   * positive applications) with fresh bindings, add new tuples, and repeat
   * until nothing changes. Terminates (finite store, no function symbols),
   * handles cycles, left and mutual recursion. Rules negated from the
   * component are solved first (stratification); negating a rule that depends
   * back on the component is rejected rather than answered wrongly.
   */
  private _relation(name: string): Map<string, Atom[]> {
    if (this.solving?.has(name)) return this.solving.get(name)!;
    const cached = this.relations.get(name);
    if (cached) return cached;
    const invalid = this.invalidStoreRules.get(name);
    if (invalid) throw new Error(`rule "${name}" is stored but invalid — ${invalid}`);
    if (!this._rulesFor(name).length) return new Map();

    const component = this._positiveClosure(name);
    for (const rule of component) {
      for (const def of this._rulesFor(rule)) {
        for (const neg of this._ruleDeps(def.body).neg) {
          if (component.has(neg) || [...this._positiveClosure(neg)].some((r) => component.has(r))) {
            throw new Error(`rule "${rule}" negates "${neg}", which depends on "${rule}" — unstratified negation is not supported`);
          }
          this._relation(neg); // solve the lower stratum first
        }
      }
    }

    const outer = this.solving;
    const outerDelta = this.deltaSite;
    const current = new Map<string, Map<string, Atom[]>>();
    for (const rule of component) current.set(rule, this.relations.get(rule) ?? new Map());
    this.solving = current;

    /** Evaluate one body; collect tuples not yet in the rule's relation. */
    const derive = (rule: string, def: DatalogRule, into: Map<string, Map<string, Atom[]>>) => {
      let rows = this._evaluatePatterns(def.body, [new Map()]);
      for (const f of def.filters) rows = rows.filter((rb) => this._evalFilter(f, rb));
      for (const rb of rows) {
        const tuple = def.params.map((param) => rb.get(param));
        if (tuple.some((v) => v === undefined)) {
          const missing = def.params.filter((param) => rb.get(param) === undefined);
          throw new Error(`rule "${rule}": param ${missing.map((m) => `?${m}`).join(', ')} is not bound by its body`);
        }
        const key = JSON.stringify(tuple);
        if (!current.get(rule)!.has(key)) into.get(rule)!.set(key, tuple as Atom[]);
      }
    };
    const fresh = () => new Map([...component].map((r) => [r, new Map<string, Atom[]>()]));
    const merge = (delta: Map<string, Map<string, Atom[]>>) => {
      let any = false;
      for (const [rule, rel] of delta) {
        for (const [k, t] of rel) current.get(rule)!.set(k, t);
        if (rel.size) any = true;
      }
      return any;
    };

    try {
      // Round 0: every body against the (empty or cached) relations.
      let delta = fresh();
      for (const rule of component) for (const def of this._rulesFor(rule)) derive(rule, def, delta);
      merge(delta);
      // Semi-naive rounds: each recursive occurrence reads only last round's
      // new tuples; any new derivation must use at least one of them.
      const sites = [...component].flatMap((rule) => this._rulesFor(rule).flatMap((def) =>
        this._positiveSites(def.body).filter((site) => component.has(site.name)).map((site) => ({ rule, def, site }))))
      while ([...delta.values()].some((rel) => rel.size)) {
        const next = fresh();
        for (const { rule, def, site } of sites) {
          const d = delta.get(site.name)!;
          if (!d.size) continue;
          this.deltaSite = { pattern: site, delta: d };
          try { derive(rule, def, next) } finally { this.deltaSite = null }
        }
        merge(next);
        delta = next;
      }
    } finally {
      this.solving = outer;
      this.deltaSite = outerDelta;
    }
    for (const [rule, rel] of current) this.relations.set(rule, rel);
    return current.get(name)!;
  }

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  private _evalFilter(filter: Filter, b: Bindings): boolean {
    const left = this._resolve(filter.left, b);
    const right = this._resolve(filter.right, b);
    if (left === undefined || right === undefined) return false;

    switch (filter.op) {
      case '=':
        return left === right;
      case '!=':
        return left !== right;
      case '<':
        return (left as any) < (right as any);
      case '<=':
        return (left as any) <= (right as any);
      case '>':
        return (left as any) > (right as any);
      case '>=':
        return (left as any) >= (right as any);
      case 'contains':
        return String(left).includes(String(right));
      case 'startsWith':
        return String(left).startsWith(String(right));
      case 'endsWith':
        return String(left).endsWith(String(right));
      case 'matches':
        return new RegExp(String(right)).test(String(left));
      default:
        return false;
    }
  }

  // -------------------------------------------------------------------------
  // Aggregation
  // -------------------------------------------------------------------------

  private _aggregate(
    bindings: Bindings[],
    aggregates: Aggregate[],
    groupBy: string[],
  ): Bindings[] {
    // Group by non-aggregated select variables
    const aggVarNames = new Set(aggregates.map((a) => a.as));
    const groupVars = groupBy.filter((v) => !aggVarNames.has(v));

    const groups = new Map<string, Bindings[]>();
    for (const b of bindings) {
      const key = groupVars.map((v) => String(b.get(v) ?? '')).join('\0');
      const group = groups.get(key) ?? [];
      group.push(b);
      groups.set(key, group);
    }

    const results: Bindings[] = [];
    for (const [, group] of groups) {
      const nb = new Map(group[0]);
      for (const agg of aggregates) {
        const vals = group
          .map((b) => b.get(agg.variable))
          .filter((v) => v !== undefined);
        nb.set(agg.as, this._computeAggregate(agg.op, vals as Atom[]));
      }
      results.push(nb);
    }
    return results;
  }

  private _computeAggregate(op: string, vals: Atom[]): Atom {
    switch (op) {
      case 'count':
        return vals.length;
      case 'sum':
        return vals.reduce(
          (s, v) => (s as number) + (Number(v) || 0),
          0 as any,
        ) as number;
      case 'avg':
        return vals.length
          ? (vals.reduce(
              (s, v) => (s as number) + (Number(v) || 0),
              0 as any,
            ) as number) / vals.length
          : 0;
      case 'min':
        return vals.reduce(
          (m, v) => ((v as any) < (m as any) ? v : m),
          vals[0],
        );
      case 'max':
        return vals.reduce(
          (m, v) => ((v as any) > (m as any) ? v : m),
          vals[0],
        );
      case 'collect':
        return JSON.stringify(vals);
      default:
        return vals.length;
    }
  }

  // -------------------------------------------------------------------------
  // Ordering
  // -------------------------------------------------------------------------

  /**
   * Semantic rank for known enum values. EQL-S stores these as raw strings, so
   * a plain `<`/`>` comparison would be lexicographic (medium > critical).
   * Mapping values to ranks lets `ORDER BY ?priority` / `ORDER BY ?status`
   * honor the workflow order. Keyed by value (not attribute) since the tokens
   * are unambiguous across the two enums.
   */
  private static readonly ENUM_RANKS: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    backlog: 0,
    queue: 1,
    in_progress: 2,
    paused: 3,
    closed: 4,
  };

  private _order(bindings: Bindings[], orderBy: OrderBy[]): Bindings[] {
    return [...bindings].sort((a, b) => {
      for (const o of orderBy) {
        const va = a.get(o.variable);
        const vb = b.get(o.variable);
        if (va === vb) continue;
        if (va === undefined) return 1;
        if (vb === undefined) return -1;

        const sa = String(va);
        const sb = String(vb);
        const ra = QueryEngine.ENUM_RANKS[sa];
        const rb = QueryEngine.ENUM_RANKS[sb];
        const cmp =
          ra !== undefined && rb !== undefined
            ? ra < rb
              ? -1
              : 1
            : sa < sb
              ? -1
              : 1;
        return o.direction === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }

  // -------------------------------------------------------------------------
  // Projection
  // -------------------------------------------------------------------------

  private _project(
    bindings: Bindings[],
    select: string[],
  ): Record<string, Atom>[] {
    return bindings.map((b) => {
      const row: Record<string, Atom> = {};
      if (select.length === 0) {
        for (const [k, v] of b) row[k] = v;
      } else {
        for (const s of select) {
          const v = b.get(s);
          if (v !== undefined) row[s] = v;
        }
      }
      return row;
    });
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private _resolve(term: Term, bindings: Bindings): Atom | undefined {
    if (isLiteral(term)) return term.value;
    return bindings.get(term.name);
  }

  private _bind(term: Term, value: Atom, bindings: Bindings): boolean {
    if (isLiteral(term)) return term.value === value;
    const existing = bindings.get(term.name);
    if (existing !== undefined) return existing === value;
    bindings.set(term.name, value);
    return true;
  }

  private _dedup(bindings: Bindings[]): Bindings[] {
    const seen = new Set<string>();
    return bindings.filter((b) => {
      const key = [...b.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\0');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
