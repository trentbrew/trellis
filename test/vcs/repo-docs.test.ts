import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  assertIssueDocId,
  listRepoDocs,
  readIssueDocFiles,
  readRepoDocFile,
} from '../../src/vcs/repo-docs.js';

describe('repo-docs', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'repo-docs-'));
    mkdirSync(join(root, 'docs', 'issues', 'TRL-5'), { recursive: true });
    writeFileSync(join(root, 'docs', 'issues', 'TRL-5', 'summary.md'), '# Summary\n');
    writeFileSync(join(root, 'docs', 'issues', 'TRL-5', 'journal.md'), '# Journal\n');
    mkdirSync(join(root, 'docs', 'adr'), { recursive: true });
    writeFileSync(join(root, 'docs', 'adr', '0001-test.md'), '# ADR\n');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('assertIssueDocId rejects traversal', () => {
    expect(() => assertIssueDocId('..')).toThrow();
    expect(assertIssueDocId('issue:TRL-5')).toBe('TRL-5');
  });

  it('lists issue and adr markdown', () => {
    const entries = listRepoDocs(root);
    expect(entries.some((e) => e.relPath === 'docs/adr/0001-test.md')).toBe(true);
    expect(entries.some((e) => e.docRole === 'summary' && e.issueId === 'TRL-5')).toBe(true);
  });

  it('readIssueDocFiles prefers journal ladder', () => {
    const doc = readIssueDocFiles(root, 'TRL-5', { description: 'fallback' });
    expect(doc.rendered).toBe('journal');
    expect(doc.journal).toContain('Journal');
  });

  it('readRepoDocFile confines paths', () => {
    expect(readRepoDocFile(root, 'docs/adr/0001-test.md')?.content).toContain('ADR');
    expect(readRepoDocFile(root, 'docs/../package.json')).toBeNull();
  });

  it('rejects symlink escape', () => {
    const outside = mkdtempSync(join(tmpdir(), 'repo-docs-out-'));
    writeFileSync(join(outside, 'secret.md'), 'nope');
    try {
      symlinkSync(outside, join(root, 'docs', 'issues', 'evil'));
      expect(readRepoDocFile(root, 'docs/issues/evil/secret.md')).toBeNull();
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
