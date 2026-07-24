import { describe, it, expect, vi } from 'vitest';
import {
  ROW_HEIGHT,
  LANE_GAP,
  LEFT_PAD,
  TIME_COL_W,
  buildEdges,
  laneX,
  rowY,
  laneLabelOffset,
  formatGraphTime,
  formatViewMeta,
} from '../../src/ui/admin-causal-graph.js';
import type { CausalNode } from '../../src/ui/causal-graph-snapshot.js';

describe('admin-causal-graph layout helpers', () => {
  it('laneX and rowY use normative geometry', () => {
    expect(LEFT_PAD).toBe(28);
    expect(LANE_GAP).toBe(48);
    expect(ROW_HEIGHT).toBe(72);
    expect(laneX(0)).toBe(28);
    expect(laneX(2)).toBe(28 + 96);
    expect(rowY(0)).toBe(36);
    expect(rowY(1)).toBe(108);
  });

  it('buildEdges emits vertical and curved paths', () => {
    const commits: CausalNode[] = [
      {
        id: 'a',
        hash: 'aaa',
        message: 'head',
        lane: 1,
        parents: ['b'],
      },
      {
        id: 'b',
        hash: 'bbb',
        message: 'trunk',
        lane: 0,
        parents: [],
      },
    ];
    const edges = buildEdges(commits, () => 'red');
    expect(edges).toHaveLength(1);
    expect(edges[0].d).toMatch(/^M /);
    expect(edges[0].d).toContain('C');
    expect(edges[0].color).toBe('red');
  });

  it('formatViewMeta re-export matches snapshot helper', () => {
    expect(formatViewMeta({ eventCount: 3, activeForkCount: 2 }, 'main')).toBe(
      '3 events · 2 active forks · integration: main',
    );
  });

  it('laneLabelOffset aligns labels after lane dots', () => {
    expect(laneLabelOffset(0)).toBe(laneX(0) + 10 + 6);
    expect(laneLabelOffset(1)).toBeGreaterThan(laneLabelOffset(0));
  });

  it('formatGraphTime uses trunk date labels', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-21T18:00:00.000Z'));
    try {
      expect(TIME_COL_W).toBe(52);
      expect(formatGraphTime('2026-07-21T12:00:00.000Z', true)).toMatch(/Jul/);
      expect(formatGraphTime('2026-07-21T12:00:00.000Z', false)).toMatch(/^\d+[mhd]|now$/);
    } finally {
      vi.useRealTimers();
    }
  });
});
