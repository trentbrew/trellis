/**
 * Desk audit — correlate git working tree with Trellis lane/issue signals.
 * Used by `trellis desk audit` and agent desk-hygiene skill.
 */

import { execFileSync } from 'node:child_process';

export type DeskAuditTheme = {
  key: string;
  files: string[];
};

export type DeskAuditGit = {
  branch: string;
  upstream: string | null;
  ahead: number;
  behind: number;
  unpushedCommits: { hash: string; subject: string }[];
  staged: string[];
  unstaged: string[];
  untracked: string[];
  dirtyFileCount: number;
  themes: DeskAuditTheme[];
};

export type DeskAuditTrellis = {
  branch: string;
  totalOps: number;
  activeLaneId: string | null;
  laneIssueId: string | null;
  laneOpCount: number | null;
  laneSuggestSplit: boolean;
  laneSplitReason: string | null;
  activeIssueCount: number;
  activeIssueIds: string[];
};

export type DeskAuditReport = {
  repoRoot: string;
  git: DeskAuditGit;
  trellis: DeskAuditTrellis;
  /** One-line summary for session briefing hooks. */
  briefingLine: string;
  recommendations: string[];
};

/** Stable theme bucket for grouping paths in audit output. */
export function themeKeyForPath(filePath: string): string {
  const p = filePath.replace(/^\.\//, '');
  const parts = p.split('/').filter(Boolean);
  if (parts.length === 0) return '(root)';
  if (parts[0] === 'src' && parts.length >= 2) {
    return `src/${parts[1]}`;
  }
  if (parts[0] === 'test' && parts.length >= 2) {
    return `test/${parts[1]}`;
  }
  if (parts[0] === 'docs' && parts.length >= 2) {
    return `docs/${parts[1]}`;
  }
  return parts[0];
}

export function groupPathsByTheme(paths: string[]): DeskAuditTheme[] {
  const map = new Map<string, string[]>();
  for (const file of paths) {
    const key = themeKeyForPath(file);
    const list = map.get(key) ?? [];
    list.push(file);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, files]) => ({ key, files: files.sort() }));
}

function gitExec(root: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function gitExecOptional(root: string, args: string[]): string | null {
  try {
    return gitExec(root, args);
  } catch {
    return null;
  }
}

export function collectGitDeskState(repoRoot: string): DeskAuditGit {
  const inside = gitExecOptional(repoRoot, ['rev-parse', '--is-inside-work-tree']);
  if (inside !== 'true') {
    throw new Error('Not a git repository');
  }

  const branch = gitExec(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const upstream = gitExecOptional(repoRoot, [
    'rev-parse',
    '--abbrev-ref',
    '@{u}',
  ]);

  let ahead = 0;
  let behind = 0;
  if (upstream) {
    const counts =
      gitExecOptional(repoRoot, ['rev-list', '--left-right', '--count', `${upstream}...HEAD`]) ??
      '0\t0';
    const [behindStr, aheadStr] = counts.split(/\s+/);
    behind = Number(behindStr) || 0;
    ahead = Number(aheadStr) || 0;
  }

  const unpushedCommits: { hash: string; subject: string }[] = [];
  if (upstream && ahead > 0) {
    const log = gitExecOptional(repoRoot, [
      'log',
      `${upstream}..HEAD`,
      '--oneline',
      '--no-decorate',
    ]);
    if (log) {
      for (const line of log.split('\n')) {
        const m = line.match(/^(\S+)\s+(.*)$/);
        if (m) unpushedCommits.push({ hash: m[1], subject: m[2] });
      }
    }
  }

  const staged = gitExecOptional(repoRoot, ['diff', '--cached', '--name-only'])
    ?.split('\n')
    .filter(Boolean) ?? [];
  const unstaged = gitExecOptional(repoRoot, ['diff', '--name-only'])
    ?.split('\n')
    .filter(Boolean) ?? [];
  const untracked =
    gitExecOptional(repoRoot, [
      'ls-files',
      '--others',
      '--exclude-standard',
    ])
      ?.split('\n')
      .filter(Boolean) ?? [];

  const allPaths = [...new Set([...staged, ...unstaged, ...untracked])];
  const themes = groupPathsByTheme(allPaths);

  return {
    branch,
    upstream,
    ahead,
    behind,
    unpushedCommits,
    staged,
    unstaged,
    untracked,
    dirtyFileCount: allPaths.length,
    themes,
  };
}

export function buildBriefingLine(git: DeskAuditGit): string {
  const parts: string[] = [];
  parts.push(git.branch);
  if (git.ahead > 0) parts.push(`+${git.ahead} unpushed`);
  if (git.dirtyFileCount > 0) {
    parts.push(`${git.dirtyFileCount} dirty`);
    const themeKeys = git.themes.map((t) => t.key);
    if (themeKeys.length > 0 && themeKeys.length <= 5) {
      parts.push(`themes: ${themeKeys.join(', ')}`);
    } else if (themeKeys.length > 5) {
      parts.push(`themes: ${themeKeys.slice(0, 4).join(', ')}, +${themeKeys.length - 4}`);
    }
  }
  if (git.ahead === 0 && git.dirtyFileCount === 0) {
    parts.push('clean');
  }
  return parts.join(' · ');
}

export function buildRecommendations(
  git: DeskAuditGit,
  trellis: DeskAuditTrellis,
): string[] {
  const recs: string[] = [];

  if (git.ahead > 0 && git.unpushedCommits.length > 1) {
    recs.push(
      'Multiple unpushed commits — consider one PR per wedge or squash only when bisect-friendly.',
    );
  } else if (git.ahead > 0) {
    recs.push('Unpushed commit(s) on integration branch — push or open PR before starting a new wedge.');
  }

  if (git.themes.length > 2) {
    recs.push(
      `Working tree spans ${git.themes.length} themes — split: trellis lane split --name <theme> or separate issues per theme.`,
    );
  }

  if (trellis.laneSuggestSplit) {
    recs.push(
      trellis.laneSplitReason ??
        'Lane journal spread > 1 — run trellis lane split before promote/close.',
    );
  }

  if (git.dirtyFileCount > 0 && !trellis.activeLaneId) {
    recs.push(
      'No active lane — trellis issue start TRL-N (or lane split) before more edits on integration.',
    );
  }

  if (git.dirtyFileCount > 15) {
    recs.push(
      'Large dirty tree — run trellis desk audit --json, bucket themes, milestone + close/promote per issue.',
    );
  }

  if (recs.length === 0) {
    recs.push('Desk looks aligned — continue in lane or ship unpushed work.');
  }

  return recs;
}

export function deskAuditExitCode(git: DeskAuditGit): number {
  if (git.dirtyFileCount > 0) return 1;
  if (git.ahead > 0) return 2;
  return 0;
}
