import { describe, expect, it } from 'vitest';

import { parseOpsFile } from '../../src/wc/parse-ops-file.js';

describe('parseOpsFile', () => {
  it('parses legacy JSON array journals', () => {
    const ops = [{ kind: 'vcs:issueCreate', vcs: { issueId: 'TRL-1' } }];
    expect(parseOpsFile(JSON.stringify(ops))).toEqual(ops);
  });

  it('parses JSONL journals (one op per line)', () => {
    const a = { kind: 'vcs:branchCreate', vcs: { branchName: 'main' } };
    const b = { kind: 'vcs:issueCreate', vcs: { issueId: 'TRL-2' } };
    const raw = `${JSON.stringify(a)}\n${JSON.stringify(b)}\n`;
    expect(parseOpsFile(raw)).toEqual([a, b]);
  });

  it('returns empty array for blank input', () => {
    expect(parseOpsFile('')).toEqual([]);
    expect(parseOpsFile('  \n  ')).toEqual([]);
  });

  it('skips corrupt lines without throwing', () => {
    const good = { kind: 'vcs:issueCreate', vcs: { issueId: 'TRL-3' } };
    const raw = `not-json\n${JSON.stringify(good)}\n{broken`;
    expect(parseOpsFile(raw)).toEqual([good]);
  });
});
