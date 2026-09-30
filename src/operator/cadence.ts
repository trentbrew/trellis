/**
 * Cadence — derived due-check (ADR 0050). Exported on `trellis/operator` so the
 * host scheduler and turtleOS share one generator instead of reimplementing it.
 *
 * Covers the durable, engine-scoped signals: overdue cycles and note-triage debt.
 * The mirror-staleness probe is **injected** (`mirrorCheck`) because it depends on
 * the CLI's mirror generator; lane classification is likewise layered by the
 * caller (lanes are VCS-engine-scoped — see ADR 0052 / TRL-88).
 */
import { cycleAttrs, noteEntityAttrs, type OperatorEngine } from './wip.js';

export interface CadenceSignal {
  kind: string;
  message: string;
}

export interface CadenceResult {
  due: boolean;
  signals: CadenceSignal[];
}

export interface CadenceOptions {
  /** Note triage age threshold in days. Default 14. */
  noteDays?: number;
  /** Clock override for deterministic tests. Default Date.now(). */
  now?: number;
  /** Optional mirror-staleness probe, supplied by the caller. */
  mirrorCheck?: (engine: OperatorEngine) => CadenceSignal[];
}

export function buildCadence(
  engine: OperatorEngine,
  opts: CadenceOptions = {},
): CadenceResult {
  const now = opts.now ?? Date.now();
  const signals: CadenceSignal[] = [];

  // Hard signal: open cycles past their target date.
  for (const rec of engine.listStoreEntities('Cycle')) {
    const c: Record<string, any> = { id: rec.id, ...cycleAttrs(rec) };
    if (c.status === 'closed' || !c.targetDate) continue;
    const t = Date.parse(String(c.targetDate));
    if (Number.isFinite(t) && t < now) {
      const overdue = Math.ceil((now - t) / 86400000);
      const members = engine
        .getEavStore()
        .getLinksByEntityAndAttribute(c.id, 'includes').length;
      signals.push({
        kind: 'cycle-overdue',
        message: `${c.id} is ${overdue}d past target (${members} issue${members === 1 ? '' : 's'})`,
      });
    }
  }

  // Advisory: captured notes aging past the triage threshold.
  const noteDays = opts.noteDays ?? 14;
  const cutoff = now - noteDays * 86400000;
  const staleNotes = engine
    .listStoreEntities('Note')
    .map((r: any) => ({ id: r.id, ...noteEntityAttrs(r) }))
    .filter(
      (n: any) =>
        (n.status ?? 'captured') === 'captured' &&
        n.createdAt &&
        Date.parse(String(n.createdAt)) < cutoff,
    );
  if (staleNotes.length) {
    signals.push({
      kind: 'note-triage',
      message: `${staleNotes.length} note${staleNotes.length === 1 ? '' : 's'} captured >${noteDays}d ago (trellis note list)`,
    });
  }

  // Structural: caller-injected (mirror staleness, lane hygiene, …).
  if (opts.mirrorCheck) signals.push(...opts.mirrorCheck(engine));

  return { due: signals.length > 0, signals };
}
