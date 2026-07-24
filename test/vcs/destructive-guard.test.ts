import { describe, it, expect } from 'vitest';
import {
  repairCommandNeedsConfirm,
  branchDeleteCommandNeedsConfirm,
  laneDropCommandNeedsConfirm,
  destructiveCommandNeedsConfirm,
  describeDestructiveBlock,
} from '../../src/vcs/destructive-guard.js';

describe('destructive guard shell patterns', () => {
  it('blocks repair without confirm', () => {
    expect(repairCommandNeedsConfirm('trellis repair -p .')).toBe(true);
    expect(repairCommandNeedsConfirm('just trellis repair -p .')).toBe(true);
    expect(
      repairCommandNeedsConfirm('bun src/cli/index.ts repair -p .'),
    ).toBe(true);
  });

  it('allows repair with confirm flag or env', () => {
    expect(
      repairCommandNeedsConfirm('trellis repair --confirm-destructive -p .'),
    ).toBe(false);
    expect(
      repairCommandNeedsConfirm('TRELLIS_CONFIRM_DESTRUCTIVE=1 trellis repair'),
    ).toBe(false);
  });

  it('does not false-positive op-log-repair test filenames', () => {
    expect(repairCommandNeedsConfirm('pnpm vitest run op-log-repair.test.ts')).toBe(
      false,
    );
  });

  it('blocks branch delete without confirm', () => {
    expect(branchDeleteCommandNeedsConfirm('trellis branch -d old -p .')).toBe(
      true,
    );
    expect(
      branchDeleteCommandNeedsConfirm('trellis branch --delete old -p .'),
    ).toBe(true);
    expect(
      branchDeleteCommandNeedsConfirm('just trellis branch -d old -p .'),
    ).toBe(true);
  });

  it('allows branch delete with confirm', () => {
    expect(
      branchDeleteCommandNeedsConfirm(
        'trellis branch -d old --confirm-destructive -p .',
      ),
    ).toBe(false);
  });

  it('blocks lane drop without confirm', () => {
    expect(laneDropCommandNeedsConfirm('trellis lane drop agent:foo -p .')).toBe(
      true,
    );
    expect(
      laneDropCommandNeedsConfirm('just trellis lane drop agent:foo'),
    ).toBe(true);
  });

  it('aggregates destructive verbs', () => {
    expect(destructiveCommandNeedsConfirm('trellis status')).toBe(false);
    expect(destructiveCommandNeedsConfirm('trellis lane list')).toBe(false);
    expect(destructiveCommandNeedsConfirm('trellis branch main')).toBe(false);
  });

  it('describes blocked command', () => {
    expect(describeDestructiveBlock('trellis repair')).toMatch(/journal/i);
    expect(describeDestructiveBlock('trellis branch -d x')).toMatch(/branch/i);
    expect(describeDestructiveBlock('trellis lane drop x')).toMatch(/lane/i);
  });
});
