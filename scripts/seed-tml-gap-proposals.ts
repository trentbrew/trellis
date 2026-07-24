#!/usr/bin/env tsx
/** Seed TML garden gap proposals (Phase 4, op parity, renderer packs). Run: tsx scripts/seed-tml-gap-proposals.ts
 *  Idempotent: skip if TRL-269+ already exist (seeded 2026-07-24). */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TrellisVcsEngine } from '../src/engine.js';
import { PROVENANCE } from '../src/core/persist/canonical-op.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PARENT = 'TRL-247';

const proposals = [
  {
    title: 'Phase 4: Vantage shell resolution — one query, collapse view toggles',
    labels: ['tml', 'phase-4', 'cycle'],
    status: 'backlog' as const,
    priority: 'high' as const,
    desc:
      'Wire shellForVantage(kind, --vantage); grid/kanban/table converge to shell resolution + single collection query. Roll-forward from docs/specs/tml-phase-3-shell-registry.md §8. Depends on TRL-251 Phase 3 shell registry epic AC.',
    ac: [
      'View mode selects shell via shellForVantage (not parallel templates)',
      'Grid, kanban, and table share one issue.title binding site',
      'Single collection query feeds all view shells',
    ],
    children: [
      {
        title: 'Proposal: TML Phase 4 — vantage shell resolution',
        labels: ['proposal', 'tml', 'phase-4', 'needs-design'],
        status: 'queue' as const,
        desc: 'Design + spec proposal: docs/specs/tml-phase-4-vantage-shell.md — shellForVantage, collapse grid/kanban/table toggles into registry resolution.',
      },
    ],
  },
  {
    title: 'Phase 5: TML op parity — all renderers via TmlDriver.op',
    labels: ['tml', 'phase-5', 'cycle', 'tml-op'],
    status: 'backlog' as const,
    priority: 'high' as const,
    desc:
      'Any renderer (grid, kanban, table, future shells) emits mutations through TmlDriver.op / tml-op attributes — zero bespoke fetch in inline script. Extends TRL-249 admin-shell work beyond grid/promote.',
    ac: [
      'No raw fetch to /api/tml-mutations in admin.html inline script',
      'Kanban + grid + table interactive writes route through driver.op',
      'E2e covers promote from at least two view modes',
    ],
    children: [
      {
        title: 'Proposal: TML Phase 5 — renderer-agnostic write path',
        labels: ['proposal', 'tml', 'phase-5', 'needs-e2e'],
        status: 'queue' as const,
        desc: 'Spec proposal: docs/specs/tml-phase-5-op-parity.md — tml-op contract for all shells; retire per-view mutation handlers.',
      },
    ],
  },
  {
    title: 'Spike: Renderer pack registry — user-defined bundle loading',
    labels: ['tml', 'renderer', 'theme', 'spike', 'product'],
    status: 'backlog' as const,
    priority: 'medium' as const,
    issueType: 'spike' as const,
    desc:
      'Theme contract exists (TRL-156+); user-defined renderer bundles (load path, version pin, capability declare) is a product decision + infra spike — not yet infrastructure.',
    ac: [
      'Proposal or ADR with load contract sketch and explicit non-goals',
      'Decision recorded: ship built-in renderers only vs extensible pack registry',
    ],
    children: [
      {
        title: 'Proposal: Renderer pack registry — product + infra',
        labels: ['proposal', 'tml', 'renderer', 'theme'],
        status: 'queue' as const,
        desc: 'Spike deliverable: docs/specs/tml-renderer-pack-registry-proposal.md — bundle format, trust model, relation to unified theme contract (TRL-156).',
      },
    ],
  },
];

async function main() {
  const engine = new TrellisVcsEngine({ rootPath: root, provenance: PROVENANCE.cli });
  engine.open();

  for (const p of proposals) {
    const op = await engine.createIssue(p.title, {
      issueType: p.issueType ?? 'issue',
      priority: p.priority,
      labels: p.labels,
      parentId: PARENT,
      description: p.desc,
      status: p.status,
      criteria: p.ac?.map((description) => ({ description })),
    });
    const epicId = op.vcs?.issueId;
    if (!epicId) throw new Error(`create failed: ${p.title}`);
    console.log('epic', epicId, p.title.slice(0, 56));

    for (const c of p.children ?? []) {
      const child = await engine.createIssue(c.title, {
        priority: 'medium',
        labels: c.labels,
        parentId: epicId,
        description: c.desc,
        status: c.status,
      });
      console.log('  child', child.vcs?.issueId, c.title.slice(0, 52));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
