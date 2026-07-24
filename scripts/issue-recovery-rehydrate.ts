#!/usr/bin/env bun
/**
 * Rehydrate issues from docs/planning/issue-recovery-catalog.json
 *
 *   bun scripts/issue-recovery-rehydrate.ts --dry-run
 *   bun scripts/issue-recovery-rehydrate.ts
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TrellisVcsEngine } from '../src/engine.js';
import { PROVENANCE } from '../src/core/persist/canonical-op.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const catalogPath = join(repoRoot, 'docs/planning/issue-recovery-catalog.json');

const REHYDRATE_NOTE =
  'Rehydrated 2026-07-21 from Cursor hook logs + specs. Metadata only — AC/history not restored.';

interface CatalogIssue {
  id: string;
  title: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  status?: string;
  labels?: string[];
  parent?: string;
  description?: string;
}

interface Catalog {
  meta?: { skipExisting?: string[]; note?: string };
  issues: Record<string, CatalogIssue>;
}

function parseArgs() {
  return {
    dryRun: process.argv.includes('--dry-run'),
    path: process.argv.includes('--catalog')
      ? process.argv[process.argv.indexOf('--catalog') + 1]
      : catalogPath,
  };
}

function topoSort(issues: CatalogIssue[]): CatalogIssue[] {
  const byId = new Map(issues.map((i) => [i.id, i]));
  const done = new Set<string>();
  /** @type {CatalogIssue[]} */
  const out = [];

  /** @param {CatalogIssue} issue */
  function visit(issue: CatalogIssue) {
    if (done.has(issue.id)) return;
    if (issue.parent && byId.has(issue.parent) && !done.has(issue.parent)) {
      visit(byId.get(issue.parent)!);
    }
    done.add(issue.id);
    out.push(issue);
  }

  for (const issue of [...issues].sort(
    (a, b) => parseInt(a.id.slice(4), 10) - parseInt(b.id.slice(4), 10),
  )) {
    visit(issue);
  }
  return out;
}

async function main() {
  const { dryRun, path } = parseArgs();
  const catalog = JSON.parse(readFileSync(path, 'utf8')) as Catalog;
  const skip = new Set(catalog.meta?.skipExisting ?? []);

  const engine = new TrellisVcsEngine({
    rootPath: repoRoot,
    provenance: PROVENANCE.cli,
  });
  engine.open();

  const existing = new Set(engine.listIssues({}).map((i) => i.id));
  const planned = Object.values(catalog.issues).filter((i) => !skip.has(i.id));
  const ordered = topoSort(planned);

  console.log(
    dryRun ? 'DRY RUN — no writes' : 'REHYDRATE — minting issueCreate ops',
  );
  console.log(`Catalog: ${path}`);
  console.log(`Skip existing: ${[...skip].join(', ')}`);
  console.log(`To create: ${ordered.length} (graph has ${existing.size} issues)`);

  let created = 0;
  let skipped = 0;

  for (const issue of ordered) {
    if (existing.has(issue.id) || skip.has(issue.id)) {
      skipped++;
      console.log(`  skip ${issue.id} (already on graph)`);
      continue;
    }

    const initialStatus =
      issue.status === 'queue' || issue.status === 'backlog'
        ? issue.status
        : 'backlog';

    const payload = {
      forceIssueId: issue.id,
      title: issue.title,
      priority: issue.priority ?? 'medium',
      labels: issue.labels ?? [],
      parentId: issue.parent,
      description: issue.description ?? REHYDRATE_NOTE,
      status: initialStatus as 'backlog' | 'queue',
    };

    if (dryRun) {
      console.log(
        `  would create ${issue.id} [${initialStatus}] ${issue.title.slice(0, 60)}${issue.parent ? ` ← ${issue.parent}` : ''}`,
      );
      created++;
      continue;
    }

    await engine.createIssue(issue.title, {
      forceIssueId: issue.id,
      priority: payload.priority,
      labels: payload.labels,
      parentId: payload.parentId,
      description: payload.description,
      status: payload.status,
    });

    const target = issue.status;
    if (target && target !== initialStatus && target !== 'backlog' && target !== 'queue') {
      await engine.updateIssue(issue.id, {
        status: target as 'closed' | 'in_progress' | 'paused',
      });
    }

    existing.add(issue.id);
    created++;
    console.log(`  ✓ ${issue.id} — ${issue.title.slice(0, 70)}`);
  }

  const after = engine.listIssues({});
  console.log(`\nDone. created=${created} skipped=${skipped} total=${after.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
