import { describe, expect, it } from 'vitest';
import { validateIssueCreateTitle } from '../../src/cli/issue-create-guard.js';

describe('validateIssueCreateTitle', () => {
  it('accepts normal titles', () => {
    expect(validateIssueCreateTitle('Fix auth bug')).toEqual({ ok: true });
    expect(validateIssueCreateTitle('TRL-54 write verbs')).toEqual({ ok: true });
  });

  it('rejects flag-like titles', () => {
    expect(validateIssueCreateTitle('-h').ok).toBe(false);
    expect(validateIssueCreateTitle('--help').ok).toBe(false);
    expect(validateIssueCreateTitle('-h').message).toMatch(/issue --help/i);
  });

  it('rejects subcommand names mistaken as titles', () => {
    expect(validateIssueCreateTitle('active').ok).toBe(false);
    expect(validateIssueCreateTitle('list').message).toMatch(/trellis issue list/i);
  });

  it('suggests fixes for common typos', () => {
    expect(validateIssueCreateTitle('actuve').message).toMatch(/trellis issue active/i);
  });
});
