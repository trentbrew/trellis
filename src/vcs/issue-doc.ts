/**
 * Soft per-issue markdown doc convention.
 *
 * `trellis issue doc <id>` scaffolds `docs/issues/<id>/summary.md` — the
 * long-form narrative the repo's guidelines already reference ("use summary.md
 * in the issue directory"). The embeddings chunker special-cases `summary.md`
 * into its own `summary_md` chunk type, and the file is a normal `file:`
 * entity picked up by the wiki-link parser + context packs. Advisory only:
 * missing docs never gate `issue show`/`issue close`.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/** Relative directory holding an issue's docs, e.g. `docs/issues/TRL-5`. */
export function issueDocRelDir(id: string): string {
  const bare = id.replace(/^issue:/, '').trim();
  const safe = bare.replace(/[^A-Za-z0-9._-]+/g, '-');
  return join('docs', 'issues', safe);
}

/** Absolute path to an issue's `summary.md`. */
export function issueDocSummaryPath(rootPath: string, id: string): string {
  return join(rootPath, issueDocRelDir(id), 'summary.md');
}

/** True when an issue already has a `summary.md` doc. */
export function issueDocExists(rootPath: string, id: string): boolean {
  return existsSync(issueDocSummaryPath(rootPath, id));
}

export interface IssueDocSource {
  id: string;
  title?: string;
  criteria?: Array<{ description?: string }>;
}

function buildSummaryTemplate(issue: IssueDocSource): string {
  const ref = issue.id.replace(/^issue:/, '');
  const lines: string[] = [
    `# ${issue.id}: ${issue.title ?? '(untitled)'}`,
    '',
    `Long-form context for issue ${issue.id} (scaffolded with \`trellis issue doc ${issue.id}\`).`,
    '',
    '## Context',
    '',
    '<!-- Why does this issue matter? Motivation, background, constraints. -->',
    '',
  ];

  const criteria = (issue.criteria ?? []).filter(
    (c) => c.description?.trim(),
  );
  if (criteria.length > 0) {
    lines.push('## Acceptance criteria', '');
    for (const c of criteria) {
      lines.push(`- [ ] ${c.description}`);
    }
    lines.push('');
  }

  lines.push(
    '## Links',
    '',
    `[[issue:${ref}]]`,
    '',
    '<!-- Reference related work:',
    '[[file:src/engine.ts]]',
    '[[decision:DEC-1]]',
    '[[TRL-42]]',
    '-->',
    '',
    '## Notes',
    '',
    '<!-- Long-form notes; embedded images: ![alt](diagram.png); decisions. -->',
    '',
  );

  return lines.join('\n');
}

/**
 * Scaffold an issue doc. Refuses to overwrite an existing `summary.md`.
 * Returns the absolute path created.
 */
export function scaffoldIssueDoc(
  rootPath: string,
  issue: IssueDocSource,
): string {
  const summaryPath = issueDocSummaryPath(rootPath, issue.id);
  if (existsSync(summaryPath)) {
    throw new Error(`Issue doc already exists: ${summaryPath}`);
  }
  mkdirSync(join(rootPath, issueDocRelDir(issue.id)), { recursive: true });
  writeFileSync(summaryPath, buildSummaryTemplate(issue), 'utf-8');
  return summaryPath;
}
