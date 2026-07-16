/**
 * Lane coherence / domain-spread signal (TRL-117 AC5).
 *
 * Reuses Idea Garden context-switch affinity (directory overlap) applied live
 * to a single lane journal. When spread > 1 domain, suggest `lane split`.
 */

import type { LaneMeta } from './lane.js';
import type { VcsOp } from './types.js';

const FILE_OP_KINDS = new Set([
  'vcs:fileAdd',
  'vcs:fileModify',
  'vcs:fileDelete',
  'vcs:fileRename',
]);

export interface LaneDomain {
  /** Stable label for display (dir affinity, issue, or lane name). */
  label: string;
  /** Files in this affinity group. */
  files: string[];
  /** How the domain was derived. */
  source: 'affinity' | 'issue' | 'name' | 'intent';
}

export interface LaneCoherence {
  domainCount: number;
  domains: LaneDomain[];
  repoCount: number;
  repos: string[];
  /** True when more than one domain affinity group is present. */
  suggestSplit: boolean;
  reason?: string;
}

function isFileOp(op: VcsOp): boolean {
  return FILE_OP_KINDS.has(op.kind);
}

function dirOf(filePath: string): string {
  const parts = filePath.split('/').filter(Boolean);
  if (parts.length <= 1) return '.';
  return parts.slice(0, -1).join('/');
}

function dirsOverlap(a: string, b: string): boolean {
  return a === b || a.startsWith(b + '/') || b.startsWith(a + '/');
}

/** Partition consecutive file ops into directory-affinity groups (Garden heuristic). */
export function partitionFileOpsByAffinity(ops: VcsOp[]): VcsOp[][] {
  const fileOps = ops.filter(isFileOp);
  if (fileOps.length === 0) return [];

  const groups: VcsOp[][] = [];
  let current: VcsOp[] = [];
  let currentDirs = new Set<string>();

  for (const op of fileOps) {
    const path = op.vcs?.filePath ?? op.vcs?.oldFilePath;
    if (!path) continue;
    const dir = dirOf(path);

    if (current.length === 0) {
      current = [op];
      currentDirs = new Set([dir]);
      continue;
    }

    const hasOverlap = [...currentDirs].some((d) => dirsOverlap(d, dir));
    if (hasOverlap) {
      current.push(op);
      currentDirs.add(dir);
    } else {
      groups.push(current);
      current = [op];
      currentDirs = new Set([dir]);
    }
  }

  if (current.length > 0) groups.push(current);
  return groups;
}

function labelForGroup(group: VcsOp[]): string {
  const dirs = new Map<string, number>();
  for (const op of group) {
    const path = op.vcs?.filePath ?? op.vcs?.oldFilePath;
    if (!path) continue;
    const dir = dirOf(path);
    dirs.set(dir, (dirs.get(dir) ?? 0) + 1);
  }
  const ranked = [...dirs.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? 'unknown';
}

function filesInGroup(group: VcsOp[]): string[] {
  const files = new Set<string>();
  for (const op of group) {
    if (op.vcs?.filePath) files.add(op.vcs.filePath);
    if (op.vcs?.oldFilePath) files.add(op.vcs.oldFilePath);
  }
  return [...files];
}

/** Infer repo roots touched by relative / absolute / parent paths. */
export function inferReposFromPaths(filePaths: string[]): string[] {
  const repos = new Set<string>();
  for (const path of filePaths) {
    if (!path) continue;
    if (path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)) {
      // Absolute: use first two path segments as a coarse repo key
      const parts = path.split(/[/\\]/).filter(Boolean);
      repos.add(parts.slice(0, 2).join('/') || path);
      continue;
    }
    if (path.startsWith('../')) {
      const up = path.match(/^(\.\.\/)+/)?.[0] ?? '../';
      const rest = path.slice(up.length);
      const first = rest.split('/')[0];
      repos.add(first ? `../${first}` : up.slice(0, -1));
      continue;
    }
    repos.add('.');
  }
  return [...repos].sort();
}

/**
 * Live coherence report for one lane.
 * Domain spread > 1 → suggest `trellis lane split`.
 */
export function analyzeLaneCoherence(
  meta: LaneMeta,
  ops: VcsOp[],
  filePaths: string[],
): LaneCoherence {
  const groups = partitionFileOpsByAffinity(ops);
  const domains: LaneDomain[] = groups.map((group) => ({
    label: labelForGroup(group),
    files: filesInGroup(group),
    source: 'affinity' as const,
  }));

  // Intent labels from lane meta (do not inflate count alone when no file spread)
  if (domains.length === 0) {
    if (meta.name) {
      domains.push({ label: meta.name, files: [], source: 'name' });
    } else if (meta.issueId) {
      domains.push({
        label: meta.issueId.replace(/^issue:/, ''),
        files: [],
        source: 'issue',
      });
    }
  }

  // Issue intents referenced in journal ops (secondary labels when spread exists)
  const issueIds = new Set<string>();
  if (meta.issueId) issueIds.add(meta.issueId.replace(/^issue:/, ''));
  for (const op of ops) {
    const id = op.vcs?.issueId?.replace(/^issue:/, '');
    if (id) issueIds.add(id);
  }
  if (issueIds.size > 1 && domains.length <= 1) {
    for (const id of issueIds) {
      if (!domains.some((d) => d.label === id)) {
        domains.push({ label: id, files: [], source: 'issue' });
      }
    }
  }

  const repos = inferReposFromPaths(filePaths);
  const domainCount = Math.max(domains.length, groups.length);
  const suggestSplit = groups.length > 1 || issueIds.size > 1;

  let reason: string | undefined;
  if (groups.length > 1) {
    reason = `Lane spans ${groups.length} directory domains — split before promote`;
  } else if (issueIds.size > 1) {
    reason = `Lane journal references ${issueIds.size} issues — split by issue/domain`;
  } else if (repos.length > 1) {
    reason = `Lane touches ${repos.length} repos — prefer one repo per lane`;
  }

  return {
    domainCount,
    domains,
    repoCount: repos.length,
    repos,
    suggestSplit: suggestSplit || repos.length > 1,
    reason: suggestSplit || repos.length > 1 ? reason : undefined,
  };
}
