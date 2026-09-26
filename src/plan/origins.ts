/**
 * Per-IDE plan artifact location descriptors and path resolution.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { PlanOrigin, PlanOriginDescriptor } from './types.js';

export const PLAN_ORIGINS: PlanOriginDescriptor[] = [
  {
    id: 'cursor',
    label: 'Cursor Plan Mode',
    defaultGlob: '~/.cursor/plans/*.plan.md',
    scope: 'user-global',
    notes: 'YAML frontmatter + todos; not repo-local by default',
  },
  {
    id: 'claude',
    label: 'Claude Code',
    defaultGlob: '~/.claude/plans/*.md',
    scope: 'user-global',
    notes: 'Plain markdown; EnterPlanMode / ExitPlanMode',
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    defaultGlob: '{repo}/.opencode/plans/*.md',
    scope: 'repo-local',
    notes: 'Workspace-local for git projects',
  },
  {
    id: 'antigravity',
    label: 'Antigravity IDE',
    defaultGlob: '~/.gemini/antigravity-ide/brain/{uuid}/implementation_plan.md',
    scope: 'user-global',
    notes: 'Also investigation.md, walkthrough.md + *.metadata.json',
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    defaultGlob: '~/.gemini/tmp/*/plans/*.md or {repo}/.gemini/plans/',
    scope: 'user-global',
    notes: 'Configure general.plan.directory → .gemini/plans in repo',
  },
  {
    id: 'codex',
    label: 'Codex',
    defaultGlob: '~/.codex/sessions/**/rollout-*.jsonl',
    scope: 'session-jsonl',
    notes: 'No canonical plan file; extract from session transcript',
  },
  {
    id: 'path',
    label: 'Explicit path',
    defaultGlob: '(user-supplied --path)',
    scope: 'repo-local',
    notes: 'Any markdown file',
  },
];

export function expandHome(path: string, home = homedir()): string {
  return path.startsWith('~/') ? join(home, path.slice(2)) : path;
}

export function resolveOpenCodePlansDir(rootPath: string): string {
  return join(rootPath, '.opencode', 'plans');
}

export function resolveGeminiRepoPlansDir(rootPath: string): string {
  return join(rootPath, '.gemini', 'plans');
}

/** Latest matching file by mtime under a directory (non-recursive). */
export function latestFileInDir(dir: string, ext: string): string | null {
  if (!existsSync(dir)) return null;
  let best: { path: string; mtime: number } | null = null;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(ext)) continue;
    const full = join(dir, name);
    try {
      const st = statSync(full);
      if (!st.isFile()) continue;
      if (!best || st.mtimeMs > best.mtime) {
        best = { path: full, mtime: st.mtimeMs };
      }
    } catch {
      // skip
    }
  }
  return best?.path ?? null;
}

/** Latest .plan.md under ~/.cursor/plans */
export function resolveLatestCursorPlan(home = homedir()): string | null {
  return latestFileInDir(join(home, '.cursor', 'plans'), '.plan.md');
}

/** Latest plan under ~/.claude/plans */
export function resolveLatestClaudePlan(home = homedir()): string | null {
  return latestFileInDir(join(home, '.claude', 'plans'), '.md');
}

export function resolveAntigravityPlan(
  session: string | undefined,
  home = homedir(),
): string | null {
  const brainRoot = join(home, '.gemini', 'antigravity-ide', 'brain');
  if (session) {
    const candidate = join(brainRoot, session, 'implementation_plan.md');
    if (existsSync(candidate)) return candidate;
  }
  if (!existsSync(brainRoot)) return null;
  let best: { path: string; mtime: number } | null = null;
  for (const id of readdirSync(brainRoot)) {
    const candidate = join(brainRoot, id, 'implementation_plan.md');
    if (!existsSync(candidate)) continue;
    const st = statSync(candidate);
    if (!best || st.mtimeMs > best.mtime) {
      best = { path: candidate, mtime: st.mtimeMs };
    }
  }
  return best?.path ?? null;
}

export function resolveGeminiCliPlan(
  rootPath: string,
  home = homedir(),
): string | null {
  const repoPlans = resolveGeminiRepoPlansDir(rootPath);
  const fromRepo = latestFileInDir(repoPlans, '.md');
  if (fromRepo) return fromRepo;

  const tmpRoot = join(home, '.gemini', 'tmp');
  if (!existsSync(tmpRoot)) return null;
  let best: { path: string; mtime: number } | null = null;
  for (const hash of readdirSync(tmpRoot)) {
    const plansDir = join(tmpRoot, hash, 'plans');
    const f = latestFileInDir(plansDir, '.md');
    if (!f) continue;
    const st = statSync(f);
    if (!best || st.mtimeMs > best.mtime) {
      best = { path: f, mtime: st.mtimeMs };
    }
  }
  return best?.path ?? null;
}

/** Extract last substantial plan-like assistant text from Codex rollout JSONL. */
export function extractCodexPlanFromSession(sessionPath: string): string | null {
  if (!existsSync(sessionPath)) return null;
  const raw = readFileSync(sessionPath, 'utf-8');
  const lines = raw.split('\n').filter(Boolean);
  let best: { text: string; score: number } | null = null;

  for (const line of lines) {
    try {
      const row = JSON.parse(line) as {
        type?: string;
        payload?: {
          type?: string;
          role?: string;
          content?: Array<{ type?: string; text?: string; output_text?: string }>;
          text?: string;
        };
      };
      const payload = row.payload;
      if (!payload) continue;

      let text = '';
      if (payload.type === 'message' && payload.role === 'assistant') {
        const parts = payload.content ?? [];
        text = parts
          .map((p) => p.text ?? p.output_text ?? '')
          .join('\n')
          .trim();
      } else if (typeof payload.text === 'string') {
        text = payload.text.trim();
      }

      if (text.length < 120) continue;
      const score =
        (text.startsWith('#') ? 20 : 0) +
        (text.includes('SPECIFICATION:') ? 40 : 0) +
        (text.includes('## ') ? 10 : 0) +
        Math.min(text.length / 500, 30);
      if (!best || score > best.score) best = { text, score };
    } catch {
      // skip malformed lines
    }
  }
  return best?.text ?? null;
}

export function resolveCodexSessionPath(
  session: string | undefined,
  home = homedir(),
): string | null {
  if (session) {
    const expanded = expandHome(session, home);
    if (existsSync(expanded)) return expanded;
  }
  const sessionsRoot = join(home, '.codex', 'sessions');
  if (!existsSync(sessionsRoot)) return null;

  let best: { path: string; mtime: number } | null = null;
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (!name.startsWith('rollout-') || !name.endsWith('.jsonl')) continue;
      if (!best || st.mtimeMs > best.mtime) {
        best = { path: full, mtime: st.mtimeMs };
      }
    }
  };
  walk(sessionsRoot);
  // TS narrows `best` to `null` here because it can't see the closure's writes.
  const found = best as { path: string; mtime: number } | null;
  return found?.path ?? null;
}

export function resolveSourcePath(
  origin: PlanOrigin,
  opts: {
    rootPath: string;
    path?: string;
    session?: string;
    homeDir?: string;
  },
): string | null {
  const home = opts.homeDir ?? homedir();
  if (origin === 'path') {
    if (!opts.path) return null;
    const p = expandHome(opts.path, home);
    return existsSync(p) ? p : null;
  }
  if (opts.path) {
    const p = expandHome(opts.path, home);
    return existsSync(p) ? p : null;
  }
  switch (origin) {
    case 'cursor':
      return resolveLatestCursorPlan(home);
    case 'claude':
      return resolveLatestClaudePlan(home);
    case 'opencode':
      return latestFileInDir(resolveOpenCodePlansDir(opts.rootPath), '.md');
    case 'antigravity':
      return resolveAntigravityPlan(opts.session, home);
    case 'gemini':
      return resolveGeminiCliPlan(opts.rootPath, home);
    case 'codex':
      return resolveCodexSessionPath(opts.session, home);
    default:
      return null;
  }
}
