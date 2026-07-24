#!/usr/bin/env tsx
/** Seed TML garden cycle epic + phase issues. Run from repo root: tsx scripts/seed-tml-cycle.ts */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TrellisVcsEngine } from '../src/engine.js';
import { PROVENANCE } from '../src/core/persist/canonical-op.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const phases = [
  {
    title: 'Phase 0: TML causal loop — tml-op promote on admin grid',
    labels: ['tml', 'phase-0', 'cycle', 'needs-e2e'],
    status: 'queue' as const,
    desc: 'Wire tml-op=promote(lane.id) on admin grid; e2e verifies POST /api/tml-mutations; SSE snapshot refresh.',
    ac: [
      'test:pnpm exec vitest run test/ui/tml-runtime.test.ts',
      'test:pnpm exec playwright test e2e/admin.spec.cjs -g "tml-op"',
    ],
  },
  {
    title: 'Phase 1: TML v0 complete on admin — driver-unified writes',
    labels: ['tml', 'phase-1', 'cycle'],
    status: 'backlog' as const,
    desc: 'Extract admin-shell.ts; mutations via TmlDriver.op; unify connect/seed path.',
    ac: ['admin-shell.ts extracted', 'promote + updateLaneMeta via driver'],
  },
  {
    title: 'Phase 2: PeerDriver / local-first materialization',
    labels: ['tml', 'phase-2', 'cycle'],
    status: 'backlog' as const,
    desc: 'Opt-in ?driver=peer; incremental op apply; expand tml-mutations map.',
    ac: ['One query works in PeerDriver only'],
  },
  {
    title: 'Phase 3: Shell registry — one template, multiple views',
    labels: ['tml', 'phase-3', 'cycle'],
    status: 'backlog' as const,
    desc: 'Shared lane/issue shell partials; vantage → shell resolution.',
    ac: ['Issue title binding edited once, reflects in kanban + grid'],
  },
];

async function main() {
  const engine = new TrellisVcsEngine({ rootPath: root, provenance: PROVENANCE.cli });
  engine.open();

  const epicOp = await engine.createIssue('Cycle: TML garden — graph-native UI roadmap', {
    issueType: 'epic',
    priority: 'high',
    labels: ['cycle', 'tml', 'roadmap', 'garden'],
    status: 'queue',
    description:
      'Epic container for TML phase spokes (0→3). Child issues roll up here; milestone on phase completion uses Cycle: prefix.',
  });
  const epicId = epicOp.vcs?.issueId;
  if (!epicId) throw new Error('epic create failed');
  console.log('epic', epicId);

  for (const p of phases) {
    const op = await engine.createIssue(p.title, {
      priority: 'high',
      labels: p.labels,
      parentId: epicId,
      description: p.desc,
      status: p.status,
      criteria: p.ac?.map((description) =>
        description.startsWith('test:')
          ? { description: description.slice(5), command: description.slice(5) }
          : { description },
      ),
    });
    console.log('  child', op.vcs?.issueId, p.title.slice(0, 48));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
