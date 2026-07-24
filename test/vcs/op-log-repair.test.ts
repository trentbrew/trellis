import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JsonOpLog } from '../../src/vcs/op-log.js';

describe('JsonOpLog.repair', () => {
  it('leaves intact compact JSONL alone', () => {
    const dir = mkdtempSync(join(tmpdir(), 'oplog-'));
    const p = join(dir, 'ops.json');
    const before =
      [0, 1, 2]
        .map((i) =>
          JSON.stringify({
            kind: 'vcs:test',
            hash: 'trellis:op:' + 'a'.repeat(63) + i,
            timestamp: 't',
            agentId: 'a',
          }),
        )
        .join('\n') + '\n';
    writeFileSync(p, before);
    const r = JsonOpLog.repair(p);
    expect(r).toEqual({ recovered: 3, lost: 0 });
    expect(readFileSync(p, 'utf8')).toBe(before);
  });

  it('truncates trailing corrupt JSONL line and preserves prefix', () => {
    const dir = mkdtempSync(join(tmpdir(), 'oplog-'));
    const p = join(dir, 'ops.json');
    const good = JSON.stringify({
      kind: 'vcs:test',
      hash: 'trellis:op:' + 'b'.repeat(64),
      timestamp: 't',
      agentId: 'a',
    });
    writeFileSync(p, good + '\n' + '{not-json\n');
    const r = JsonOpLog.repair(p, { confirmDestructive: true });
    expect(r.recovered).toBe(1);
    expect(r.lost).toBe(-1);
    expect(readFileSync(p, 'utf8')).toBe(good + '\n');
  });

  it('refuses truncate repair without confirm', () => {
    const dir = mkdtempSync(join(tmpdir(), 'oplog-'));
    const p = join(dir, 'ops.json');
    const good = JSON.stringify({
      kind: 'vcs:test',
      hash: 'trellis:op:' + 'c'.repeat(64),
      timestamp: 't',
      agentId: 'a',
    });
    writeFileSync(p, good + '\n' + '{bad\n');
    expect(() => JsonOpLog.repair(p)).toThrow(/confirm-destructive/i);
  });
});
