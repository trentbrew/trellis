/**
 * Grounded extension — toy fixtures and attack-graph helpers.
 */
import { describe, expect, test } from 'vitest';
import {
  buildAttackGraph,
  computeGroundedExtension,
} from '../../src/reasoning/index.js';

describe('computeGroundedExtension', () => {
  test('unattacked claims are accepted', () => {
    const result = computeGroundedExtension(['A', 'B'], []);
    expect(result.accepted).toEqual(new Set(['A', 'B']));
    expect(result.defeated.size).toBe(0);
  });

  test('attacker defeats target (C2 attacks C1)', () => {
    const result = computeGroundedExtension(
      ['C1', 'C2'],
      [{ attacker: 'C2', target: 'C1' }],
    );
    expect(result.accepted).toEqual(new Set(['C2']));
    expect(result.defeated).toEqual(new Set(['C1']));
  });

  test('symmetric attack leaves both undecided', () => {
    const attacks = [
      { attacker: 'A', target: 'B' },
      { attacker: 'B', target: 'A' },
    ];
    const result = computeGroundedExtension(['A', 'B'], attacks);
    expect(result.accepted.size).toBe(0);
    expect(result.defeated.size).toBe(0);
    expect(result.undecided).toEqual(new Set(['A', 'B']));
  });

  test('chain: C3 attacks C2 attacks C1', () => {
    const attacks = [
      { attacker: 'C2', target: 'C1' },
      { attacker: 'C3', target: 'C2' },
    ];
    const result = computeGroundedExtension(['C1', 'C2', 'C3'], attacks);
    expect(result.accepted).toEqual(new Set(['C3', 'C1']));
    expect(result.defeated).toEqual(new Set(['C2']));
  });

  test('ignores attacks involving unknown claim ids', () => {
    const result = computeGroundedExtension(
      ['C1'],
      [{ attacker: 'C2', target: 'C1' }],
    );
    expect(result.accepted).toEqual(new Set(['C1']));
  });
});

describe('buildAttackGraph', () => {
  test('extracts attacks links only', () => {
    const edges = buildAttackGraph([
      { e1: 'a', a: 'attacks', e2: 'b' },
      { e1: 'a', a: 'cites', e2: 'c' },
    ]);
    expect(edges).toEqual([{ attacker: 'a', target: 'b' }]);
  });
});
