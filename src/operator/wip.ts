/**
 * Operator surface — derived reads over engine state (ADR 0050 d3).
 *
 * These are recomputed, never stored, and exported as a package subpath
 * (`trellis/operator`) so non-CLI surfaces (turtleOS, os-sandbox, the admin
 * console) consume the identical snapshot instead of reimplementing it.
 * The CLI (`trellis wip`) is one projection.
 *
 * Module boundary rule: if another surface needs a read as *data*, it lives
 * here; if it is just an invocation of an exported engine API, it stays in the
 * CLI. See ADR 0050 (operator surface) and ADR 0052 d5 (one generator).
 */

/** Minimal structural view of the engine that the derived reads need. */
export interface OperatorEngine {
  listIssues(): any[];
  listStoreEntities(type: string): any[];
  getEavStore(): { getLinksByEntityAndAttribute(id: string, attr: string): any[] };
}

/** Flatten an EAV store record's facts into a plain attribute map. */
export function noteEntityAttrs(rec: any): Record<string, any> {
  return Object.fromEntries((rec.facts ?? []).map((f: any) => [f.a, f.v]));
}

/** Alias of {@link noteEntityAttrs} for cycle/mirror records (same shape). */
export function cycleAttrs(rec: any): Record<string, any> {
  return Object.fromEntries((rec.facts ?? []).map((f: any) => [f.a, f.v]));
}

export interface WipSnapshot {
  active: any[];
  paused: any[];
  queued: any[];
  shipped: any[];
  next: any[];
  cycles: Array<Record<string, any>>;
  notes: Array<Record<string, any>>;
}

export interface WipOptions {
  /** Recently-shipped window in days. Default 7. */
  days?: number;
  /** Max items per list section (and cycles/notes). Default 10. */
  limit?: number;
  /** Clock override for deterministic tests. Default Date.now(). */
  now?: number;
}

/**
 * Build the `wip` snapshot: active / paused / queue / shipped / next / cycles /
 * notes. Pure over the engine — rendering and cadence stay in the CLI.
 */
export function buildWip(engine: OperatorEngine, opts: WipOptions = {}): WipSnapshot {
  const days = opts.days ?? 7;
  const limit = opts.limit ?? 10;
  const now = opts.now ?? Date.now();

  const all = engine.listIssues();
  const cutoff = now - days * 86400000;
  const active = all.filter((i) => i.status === 'in_progress');
  const paused = all.filter((i) => i.status === 'paused');
  const queued = all.filter((i) => i.status === 'queue');
  const shipped = all
    .filter(
      (i) => i.status === 'closed' && i.closedAt && Date.parse(i.closedAt) >= cutoff,
    )
    .sort((a, b) => Date.parse(b.closedAt!) - Date.parse(a.closedAt!));
  const rank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const next = all
    .filter(
      (i) =>
        i.status === 'backlog' &&
        !(i as any).isBlocked &&
        (i.issueType ?? 'issue') !== 'epic',
    )
    .sort(
      (a, b) =>
        (rank[a.priority ?? 'medium'] ?? 9) - (rank[b.priority ?? 'medium'] ?? 9),
    )
    .slice(0, limit);
  const notes = engine
    .listStoreEntities('Note')
    .map((r) => ({ id: r.id, ...noteEntityAttrs(r) }) as Record<string, any>)
    .filter((n) => (n.status ?? 'captured') === 'captured');
  const cycles = engine
    .listStoreEntities('Cycle')
    .map((r) => ({ id: r.id, ...cycleAttrs(r) }) as Record<string, any>)
    .filter((c) => c.status !== 'closed')
    .map((c): Record<string, any> => {
      const target = c.targetDate ? Date.parse(String(c.targetDate)) : NaN;
      const daysLeft = Number.isFinite(target)
        ? Math.ceil((target - now) / 86400000)
        : null;
      const members = engine
        .getEavStore()
        .getLinksByEntityAndAttribute(c.id, 'includes').length;
      return { ...c, daysLeft, members };
    })
    .sort((a, b) => {
      const at = a.targetDate ? Date.parse(String(a.targetDate)) : Infinity;
      const bt = b.targetDate ? Date.parse(String(b.targetDate)) : Infinity;
      return at - bt;
    });

  return { active, paused, queued, shipped, next, cycles, notes };
}
