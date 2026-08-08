/**
 * Soft per-issue doc convention (`trellis issue doc <id>`).
 *
 * The scaffold writes `docs/issues/<id>/summary.md`, which the embeddings
 * chunker special-cases into its own `summary_md` chunk type and the wiki-link
 * parser indexes as a `file:` entity. It is advisory only — missing docs must
 * never gate `issue show`/`issue close`.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import {
  issueDocExists,
  issueDocRelDir,
  issueDocSummaryPath,
  scaffoldIssueDoc,
} from '../../src/vcs/issue-doc.js';

const TEST_ROOT = join(tmpdir(), 'trellis-issue-doc');

describe('issue doc scaffold', () => {
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
    engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('path convention: docs/issues/<id>/summary.md', () => {
    expect(issueDocRelDir('TRL-5')).toBe(join('docs', 'issues', 'TRL-5'));
    expect(issueDocSummaryPath('/root', 'TRL-5')).toBe(
      join('/root', 'docs', 'issues', 'TRL-5', 'summary.md'),
    );
    expect(issueDocExists('/root', 'TRL-5')).toBe(false);
  });

  test('lane-scoped ids keep a filesystem-safe directory', () => {
    expect(issueDocRelDir('issue:lane-a:1')).toBe(
      join('docs', 'issues', 'lane-a-1'),
    );
  });

  test('scaffold writes a summary.md with the wiki-link backlink', async () => {
    const op = await engine.createIssue('Document the doc convention');
    const id = op.vcs!.issueId!;

    const docPath = scaffoldIssueDoc(TEST_ROOT, engine.getIssue(id)!);

    expect(docPath).toBe(issueDocSummaryPath(TEST_ROOT, id));
    expect(existsSync(docPath)).toBe(true);
    expect(issueDocExists(TEST_ROOT, id)).toBe(true);

    const content = readFileSync(docPath, 'utf-8');
    expect(content).toContain(`# ${id}: Document the doc convention`);
    expect(content).toContain(`[[issue:${id}]]`);
  });

  test('scaffold refuses to overwrite an existing doc', async () => {
    const op = await engine.createIssue('Once is enough');
    const id = op.vcs!.issueId!;
    const issue = engine.getIssue(id)!;

    scaffoldIssueDoc(TEST_ROOT, issue);
    expect(() => scaffoldIssueDoc(TEST_ROOT, issue)).toThrow(
      /already exists/,
    );
  });
});
