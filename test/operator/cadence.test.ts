/**
 * buildCadence — exported operator due-check (ADR 0050, TRL-88/89).
 */
import { describe, expect, it } from 'vitest';
import { buildCadence } from '../../src/operator/cadence.js';
import type { OperatorEngine } from '../../src/operator/wip.js';

const NOW = Date.UTC(2026, 8, 29, 12, 0, 0);
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

function makeEngine(
  cycles: Array<Record<string, unknown>> = [],
  notes: Array<Record<string, unknown>> = [],
): OperatorEngine {
  const toRecs = (rows: Array<Record<string, unknown>>, type: string) =>
    rows.map((r, i) => ({
      id: String(r.id ?? `${type}:${i}`),
      facts: Object.entries(r)
        .filter(([k]) => k !== 'id')
        .map(([a, v]) => ({ a, v })),
    }));
  const cycleRecs = toRecs(cycles, 'Cycle');
  const noteRecs = toRecs(notes, 'Note');
  return {
    listIssues: () => [],
    listStoreEntities: (t: string) =>
      t === 'Cycle' ? cycleRecs : t === 'Note' ? noteRecs : [],
    getEavStore: () => ({ getLinksByEntityAndAttribute: () => [] }),
  };
}

describe('buildCadence', () => {
  it('flags an open cycle past its target', () => {
    const engine = makeEngine([{ id: 'cycle:a', targetDate: daysAgo(3), status: 'open' }]);
    const c = buildCadence(engine, { now: NOW });
    expect(c.due).toBe(true);
    expect(c.signals.some((s) => s.kind === 'cycle-overdue')).toBe(true);
  });

  it('ignores closed cycles and future targets', () => {
    const engine = makeEngine([
      { id: 'cycle:a', targetDate: daysAgo(3), status: 'closed' },
      { id: 'cycle:b', targetDate: new Date(NOW + 86400000).toISOString(), status: 'open' },
    ]);
    expect(buildCadence(engine, { now: NOW }).due).toBe(false);
  });

  it('flags captured notes older than the triage threshold', () => {
    const engine = makeEngine(
      [],
      [{ id: 'note:a', status: 'captured', createdAt: daysAgo(20) }],
    );
    const c = buildCadence(engine, { noteDays: 14, now: NOW });
    expect(c.signals.some((s) => s.kind === 'note-triage')).toBe(true);
  });

  it('includes the injected mirrorCheck signals', () => {
    const engine = makeEngine();
    const c = buildCadence(engine, {
      now: NOW,
      mirrorCheck: () => [{ kind: 'mirror-stale', message: 'README.md is stale' }],
    });
    expect(c.due).toBe(true);
    expect(c.signals[0].kind).toBe('mirror-stale');
  });

  it('is clear when nothing is due', () => {
    expect(buildCadence(makeEngine(), { now: NOW })).toEqual({ due: false, signals: [] });
  });
});
