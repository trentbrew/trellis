#!/usr/bin/env bun
/**
 * Prune stale lane git worktrees and orphan `.trellis/worktrees/*` dirs.
 *
 * Safe defaults:
 *   bun scripts/prune-lane-worktrees.ts          # report only
 *   bun scripts/prune-lane-worktrees.ts --apply  # remove + fix meta
 *
 * Removes:
 *   - git worktrees for lanes in dropped/promoted status
 *   - orphan worktree dirs (on disk but not registered / not referenced)
 *   - stale worktreePath fields on lane meta when the path is gone (--fix-meta, default with --apply)
 */

import { execSync } from 'child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  laneGitBranch,
  removeWorktree,
} from '../src/vcs/lane-worktree.js';
import {
  listLaneMetas,
  saveLaneMeta,
  type LaneMeta,
} from '../src/vcs/lane.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const trellisDir = join(repoRoot, '.trellis');
const worktreesRoot = join(trellisDir, 'worktrees');

interface GitWorktree {
  path: string;
  branch?: string;
}

interface Action {
  kind: 'remove-worktree' | 'remove-orphan-dir' | 'clear-meta';
  laneId?: string;
  path: string;
  reason: string;
}

function parseArgs(argv: string[]): { apply: boolean; fixMeta: boolean } {
  const apply = argv.includes('--apply');
  const fixMeta = apply || argv.includes('--fix-meta');
  return { apply, fixMeta };
}

function git(command: string): string {
  return execSync(`git -C "${repoRoot}" ${command}`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function listGitWorktrees(): GitWorktree[] {
  const raw = git('worktree list --porcelain');
  const out: GitWorktree[] = [];
  let cur: GitWorktree | null = null;
  for (const line of raw.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (cur) out.push(cur);
      cur = { path: line.slice('worktree '.length) };
    } else if (cur && line.startsWith('branch ')) {
      cur.branch = line.slice('branch '.length);
    }
  }
  if (cur) out.push(cur);
  return out;
}

function dirSizeHuman(path: string): string {
  try {
    const out = execSync(`du -sh "${path}" 2>/dev/null`, {
      encoding: 'utf-8',
    }).trim();
    return out.split('\t')[0] ?? '?';
  } catch {
    return '?';
  }
}

function collectActions(metas: LaneMeta[]): Action[] {
  const actions: Action[] = [];
  const registered = new Map(
    listGitWorktrees()
      .filter((w) => w.path.includes('/.trellis/worktrees/'))
      .map((w) => [w.path, w] as const),
  );
  const metaByPath = new Map<string, LaneMeta>();
  for (const meta of metas) {
    if (meta.worktreePath) metaByPath.set(meta.worktreePath, meta);
  }

  for (const meta of metas) {
    const path = meta.worktreePath;
    if (!path) continue;

    if (meta.status === 'dropped' || meta.status === 'promoted') {
      if (existsSync(path) || registered.has(path)) {
        actions.push({
          kind: 'remove-worktree',
          laneId: meta.id,
          path,
          reason: `lane status is ${meta.status}`,
        });
      } else {
        actions.push({
          kind: 'clear-meta',
          laneId: meta.id,
          path,
          reason: 'stale worktreePath (path already gone)',
        });
      }
      continue;
    }

    if (!existsSync(path) && !registered.has(path)) {
      actions.push({
        kind: 'clear-meta',
        laneId: meta.id,
        path,
        reason: 'active lane references missing worktree',
      });
    }
  }

  const referencedDirNames = new Set(
    metas
      .filter((m) => m.worktreePath)
      .map((m) => basename(m.worktreePath!)),
  );

  if (existsSync(worktreesRoot)) {
    for (const entry of readdirSync(worktreesRoot)) {
      const full = join(worktreesRoot, entry);
      try {
        if (!statSync(full).isDirectory()) continue;
      } catch {
        continue;
      }

      if (registered.has(full)) continue;
      if (referencedDirNames.has(entry)) continue;

      actions.push({
        kind: 'remove-orphan-dir',
        path: full,
        reason: 'orphan directory (not registered, not referenced by lane meta)',
      });
    }
  }

  return actions;
}

function printReport(actions: Action[], metas: LaneMeta[]): void {
  const activeWithWorktree = metas.filter(
    (m) => m.status === 'active' && m.worktreePath,
  ).length;
  const worktreeDirs = existsSync(worktreesRoot)
    ? readdirSync(worktreesRoot).length
    : 0;

  console.log(`Repo: ${repoRoot}`);
  console.log(`Lanes: ${metas.length} · active w/ worktree: ${activeWithWorktree}`);
  console.log(`Worktree dirs on disk: ${worktreeDirs}`);
  console.log('');

  if (actions.length === 0) {
    console.log('Nothing to prune. Active lane worktrees are expected to remain.');
    return;
  }

  console.log(`Planned actions (${actions.length}):`);
  for (const action of actions) {
    const size = dirSizeHuman(action.path);
    const lane = action.laneId ? ` · ${action.laneId}` : '';
    console.log(
      `  [${action.kind}] ${basename(action.path)} (${size})${lane} — ${action.reason}`,
    );
  }
}

function applyActions(actions: Action[], metas: LaneMeta[]): void {
  const metaById = new Map(metas.map((m) => [m.id, m] as const));

  for (const action of actions) {
    if (action.kind === 'remove-worktree' && action.laneId) {
      const meta = metaById.get(action.laneId);
      if (!meta?.worktreePath) continue;
      removeWorktree({
        rootPath: repoRoot,
        worktreePath: meta.worktreePath,
        branch: laneGitBranch(meta.id),
        deleteBranch: true,
      });
      meta.worktreePath = undefined;
      saveLaneMeta(trellisDir, meta);
      console.log(`removed worktree · ${meta.id}`);
      continue;
    }

    if (action.kind === 'remove-orphan-dir') {
      rmSync(action.path, { recursive: true, force: true });
      console.log(`removed orphan dir · ${basename(action.path)}`);
      continue;
    }

    if (action.kind === 'clear-meta' && action.laneId) {
      const meta = metaById.get(action.laneId);
      if (!meta) continue;
      meta.worktreePath = undefined;
      saveLaneMeta(trellisDir, meta);
      console.log(`cleared stale worktreePath · ${meta.id}`);
    }
  }
}

function main(): void {
  const { apply, fixMeta } = parseArgs(process.argv.slice(2));
  if (!existsSync(trellisDir)) {
    console.error('No .trellis directory — run from a TrellisVCS repo root.');
    process.exit(1);
  }

  const metas = listLaneMetas(trellisDir);
  const actions = collectActions(metas);

  printReport(actions, metas);

  if (!apply) {
    console.log('');
    console.log('Dry run. Re-run with --apply to execute removals and meta cleanup.');
    return;
  }

  const actionable = fixMeta
    ? actions
    : actions.filter((a) => a.kind !== 'clear-meta');

  if (actionable.length === 0) return;

  console.log('');
  applyActions(actionable, metas);
  console.log('Done.');
}

main();
