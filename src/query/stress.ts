/**
 * Query path stress battery — regression guard for EQL-S + context pack parity.
 *
 * @module trellis/query/stress
 * @see docs/specs/query-path-stress-v0.md
 */

import type { TrellisVcsEngine } from '../engine.js';
import { assembleContextPack } from '../context/pack.js';
import { QueryEngine, parseQuery, parseSimple } from '../core/query/index.js';

export interface QueryStressCheck {
  name: string;
  ok: boolean;
  detail: string;
  ms?: number;
}

export interface QueryStressOptions {
  /** Context pack token budget (default 4000) */
  budgetTokens?: number;
  /** Require at least one childOf link (fixture repos) */
  requireChildOf?: boolean;
  /** Require Decision entities in store */
  requireDecisions?: boolean;
}

export interface QueryStressReport {
  checks: QueryStressCheck[];
  ok: boolean;
}

function timed<T>(fn: () => T): { value: T; ms: number } {
  const start = performance.now();
  const value = fn();
  return { value, ms: performance.now() - start };
}

function runQuery(
  engine: TrellisVcsEngine,
  queryStr: string,
): { count: number; ms: number } {
  const store = engine.getEavStore();
  const queryEngine = new QueryEngine(store);
  let q;
  try {
    q = parseSimple(queryStr);
  } catch {
    q = parseQuery(queryStr);
  }
  const { value: result, ms } = timed(() => queryEngine.execute(q));
  return { count: result.count, ms };
}

/**
 * Run the query-path regression battery against an open engine.
 */
export function runQueryStress(
  engine: TrellisVcsEngine,
  rootPath: string,
  opts: QueryStressOptions = {},
): QueryStressReport {
  const checks: QueryStressCheck[] = [];
  const budget = opts.budgetTokens ?? 4000;

  // Issue surface
  {
    const { count, ms } = runQuery(engine, 'find ?e where type = "Issue"');
    checks.push({
      name: 'issue.type',
      ok: count >= 0,
      detail: `${count} Issue entities`,
      ms,
    });
  }

  {
    const { count, ms } = runQuery(
      engine,
      'find ?e where type = "Issue" and status = "in_progress"',
    );
    checks.push({
      name: 'issue.status_filter',
      ok: true,
      detail: `${count} in_progress`,
      ms,
    });
  }

  // Hierarchy — childOf is canonical; parentOf is a common agent mistake
  {
    const { count, ms } = runQuery(
      engine,
      'SELECT ?child ?parent WHERE { (?child "childOf" ?parent) } LIMIT 50',
    );
    const ok = opts.requireChildOf ? count > 0 : true;
    checks.push({
      name: 'link.childOf',
      ok,
      detail:
        count > 0
          ? `${count} childOf link(s) — use childOf not parentOf`
          : 'no childOf links (ok for empty repos)',
      ms,
    });
  }

  {
    const { count, ms } = runQuery(
      engine,
      'SELECT ?child ?parent WHERE { (?child "parentOf" ?parent) } LIMIT 5',
    );
    checks.push({
      name: 'link.parentOf_absent',
      ok: count === 0,
      detail:
        count === 0
          ? 'parentOf empty (expected — graph uses childOf)'
          : `${count} parentOf link(s) — unexpected`,
      ms,
    });
  }

  // Priority semantic ordering
  {
    const { count, ms } = runQuery(
      engine,
      `SELECT ?e ?priority WHERE {
        [?e "type" "Issue"]
        [?e "priority" ?priority]
      } ORDER BY ?priority ASC LIMIT 5`,
    );
    checks.push({
      name: 'issue.priority_order',
      ok: count >= 0,
      detail: count > 0 ? `ordered sample (${count} rows)` : 'no prioritized issues',
      ms,
    });
  }

  // Decision projection (empty ok unless requireDecisions)
  {
    const { count, ms } = runQuery(engine, 'find ?e where type = "Decision"');
    const ok = opts.requireDecisions ? count > 0 : true;
    checks.push({
      name: 'decision.projection',
      ok,
      detail:
        count > 0
          ? `${count} Decision entities (vcs:decisionRecord ops materialized)`
          : 'no Decision entities — record via MCP or engine.recordDecision()',
      ms,
    });
  }

  // Context pack budget
  {
    const { value: pack, ms } = timed(() =>
      assembleContextPack(engine, {
        rootPath,
        vantage: 'boot',
        budgetTokens: budget,
      }),
    );
    const under = pack.estimatedTokens <= pack.budgetTokens;
    checks.push({
      name: 'context_pack.boot_budget',
      ok: under,
      detail: `${pack.estimatedTokens}/${pack.budgetTokens} tokens`,
      ms,
    });
  }

  const ok = checks.every((c) => c.ok);
  return { checks, ok };
}
