import { describe, it, expect } from 'vitest';
import {
  compareCellValues,
  resolveEmptyState,
  isValidIssueId,
  normalizeIssueCommit,
  isValidBranchCommit,
  resolveLaneEntityId,
  resolveCellEditPrior,
} from '../../src/ui/admin-datatable.js';

describe('admin-datatable helpers', () => {
  it('compareCellValues sorts numbers numerically', () => {
    expect(compareCellValues('10', '2')).toBeGreaterThan(0);
    expect(compareCellValues('2', '10')).toBeLessThan(0);
  });

  it('compareCellValues falls back to localeCompare', () => {
    expect(compareCellValues('agent-a', 'agent-b')).toBeLessThan(0);
    expect(compareCellValues('lane-z', 'lane-a')).toBeGreaterThan(0);
  });

  it('resolveEmptyState maps row counts', () => {
    expect(resolveEmptyState(0, 0)).toBe('no-lanes');
    expect(resolveEmptyState(3, 0)).toBe('no-matches');
    expect(resolveEmptyState(3, 2)).toBe('hidden');
  });

  it('isValidIssueId allows empty and TRL-N', () => {
    expect(isValidIssueId('')).toBe(true);
    expect(isValidIssueId('  ')).toBe(true);
    expect(isValidIssueId('TRL-212')).toBe(true);
    expect(isValidIssueId('trl-1')).toBe(true);
    expect(isValidIssueId('not-an-issue')).toBe(false);
    expect(isValidIssueId('TRL-')).toBe(false);
  });

  it('normalizeIssueCommit maps empty to null and canonicalizes', () => {
    expect(normalizeIssueCommit('')).toBeNull();
    expect(normalizeIssueCommit('  ')).toBeNull();
    expect(normalizeIssueCommit('trl-212')).toBe('TRL-212');
    expect(normalizeIssueCommit('TRL-9')).toBe('TRL-9');
  });

  it('isValidBranchCommit rejects empty', () => {
    expect(isValidBranchCommit('')).toBe(false);
    expect(isValidBranchCommit('  ')).toBe(false);
    expect(isValidBranchCommit('main')).toBe(true);
  });

  it('resolveLaneEntityId prefers data-entity-id then lane cell text', () => {
    const laneSpan = { textContent: 'lane-from-text' };
    const laneTd = {
      querySelector(sel: string) {
        if (sel === 'span:not(.progress-spin)') return laneSpan;
        return null;
      },
      textContent: 'x lane-from-text',
    };
    const tr: {
      dataset: { entityId?: string };
      getAttribute: (n: string) => string | null;
      querySelector: (s: string) => typeof laneTd | null;
      _attr: string | null;
    } = {
      dataset: {},
      _attr: null,
      getAttribute(n: string) {
        return n === 'data-entity-id' ? this._attr : null;
      },
      querySelector(s: string) {
        return s === 'td[data-col="lane"]' ? laneTd : null;
      },
    };
    expect(resolveLaneEntityId(tr as unknown as HTMLTableRowElement)).toBe('lane-from-text');
    tr._attr = 'lane-from-attr';
    tr.dataset.entityId = 'lane-from-attr';
    expect(resolveLaneEntityId(tr as unknown as HTMLTableRowElement)).toBe('lane-from-attr');
  });

  it('resolveCellEditPrior uses cache when td textContent is empty', () => {
    const td = { textContent: '', dataset: { col: 'branch' } };
    const tr = {
      dataset: { entityId: 'lane-abc' },
      getAttribute: () => null,
      querySelector: () => null,
    };
    const cache = new Map([['lane-abc', { branch: 'main' }]]);
    expect(
      resolveCellEditPrior(
        td as unknown as HTMLTableCellElement,
        tr as unknown as HTMLTableRowElement,
        'branch',
        cache,
      ),
    ).toEqual({ priorRaw: 'main', priorDisplay: 'main' });
  });

  it('resolveCellEditPrior maps issue em dash to empty raw', () => {
    const td = { textContent: '—', dataset: { col: 'issue' } };
    const tr = {
      dataset: { entityId: 'lane-abc' },
      getAttribute: () => null,
      querySelector: () => null,
    };
    expect(
      resolveCellEditPrior(
        td as unknown as HTMLTableCellElement,
        tr as unknown as HTMLTableRowElement,
        'issue',
      ),
    ).toEqual({ priorRaw: '', priorDisplay: '—' });
  });
});
