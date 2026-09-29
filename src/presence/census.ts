/**
 * Agent liveness census (ADR 0052).
 *
 * A derived "who is working right now" read over:
 *   1. the presence ledger (ADR 0024) — harness-reported, authoritative;
 *   2. harness-native adapters — read-only, local, best-effort, for runtimes
 *      that do not announce (opencode session DB, Claude Code session JSONL).
 *
 * Liveness is recency of activity, never a stored `status` field. Nothing here
 * is written to the op log, and no network is touched (ADR 0041).
 *
 * This module is host-oriented but harness-agnostic: adapters degrade to empty
 * when their source is absent, so the census never depends on any one runtime.
 */

import { createRequire } from 'node:module';
import {
  existsSync,
  openSync,
  readSync,
  readdirSync,
  statSync,
  closeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import {
  DEFAULT_STALE_MS,
  readPresence,
  type PresenceInfo,
} from './presence.js';

const require_ = createRequire(import.meta.url);

/** Where a census entry came from. Ledger is authoritative; adapters infer. */
export type CensusSource = 'ledger' | 'opencode-db' | 'claude-sessions';

export interface CensusAgent {
  /** Stable per-session key (ledger sessionId, else a synthesized id). */
  id: string;
  /** Harness hosting the session: opencode | claude | cursor | codex | … */
  harness: string;
  provider?: string;
  model?: string;
  displayName?: string;
  agentId?: string;
  laneId?: string;
  branch?: string;
  issueId?: string;
  issueTitle?: string;
  /** Short summary of the work in flight. */
  task?: string;
  /** Absolute workspace directory the session runs in. */
  dir?: string;
  /** ISO timestamp of the last observed activity (drives liveness). */
  lastActivity: string;
  source: CensusSource;
  /** True when the harness reported the identity (ledger), false when inferred. */
  verified: boolean;
}

export interface CensusOptions {
  /** Staleness window in ms. Entries older than this are omitted. */
  staleMs?: number;
  /** Also read the opencode session DB. Default true. */
  includeOpencode?: boolean;
  /** Also read Claude Code session JSONL. Default true. */
  includeClaude?: boolean;
  /** Override opencode DB path (tests). */
  opencodeDbPath?: string;
  /** Override Claude projects dir (tests). */
  claudeProjectsDir?: string;
  /** `now` for deterministic tests. */
  now?: number;
}

/** Default opencode session DB (the `opencode.db` next to this host's data). */
export function opencodeDbPath(): string {
  return (
    process.env.TRELLIS_OPENCODE_DB ??
    join(homedir(), '.local', 'share', 'opencode', 'opencode.db')
  );
}

/** Default Claude Code projects dir. */
export function claudeProjectsDir(): string {
  return process.env.TRELLIS_CLAUDE_PROJECTS ?? join(homedir(), '.claude', 'projects');
}

/** True when `dir` is `scope` or a descendant of it. */
export function isUnder(dir: string, scope: string): boolean {
  const d = normalizeDir(dir);
  const s = normalizeDir(scope);
  if (!d || !s) return false;
  return d === s || d.startsWith(s + sep);
}

function normalizeDir(p: string | undefined): string | undefined {
  if (!p) return undefined;
  return p.replace(/\/+$/, '');
}

// ---------------------------------------------------------------------------
// Adapter: presence ledger (authoritative, harness-reported)
// ---------------------------------------------------------------------------

export function fromLedger(
  rootPath: string,
  opts: CensusOptions = {},
): CensusAgent[] {
  const peers = readPresence(rootPath, {
    // When a deterministic `now` is supplied, read everything and let
    // readCensus prune against it; otherwise prune on the wall clock here.
    staleMs: opts.now ? Number.MAX_SAFE_INTEGER : opts.staleMs,
    includeSelf: true,
  });
  return peers.map((p) => ledgerToCensus(p));
}

function ledgerToCensus(p: PresenceInfo): CensusAgent {
  const harness = p.harness ?? p.client ?? 'unknown';
  return {
    id: p.sessionId,
    harness,
    provider: p.provider,
    model: p.model,
    displayName: p.displayName,
    agentId: p.agentId,
    laneId: p.laneId,
    branch: p.branch,
    issueId: p.claimedIssueId,
    issueTitle: p.claimedIssueTitle,
    task: p.task ?? p.claimedIssueTitle ?? p.branch,
    dir: normalizeDir(p.dir),
    lastActivity: p.lastHeartbeat,
    source: 'ledger',
    verified: true,
  };
}

// ---------------------------------------------------------------------------
// Adapter: opencode session DB
// ---------------------------------------------------------------------------

interface SqliteLike {
  prepare(sql: string): { all(...params: unknown[]): unknown[] };
  close(): void;
}

/** Open a host SQLite file read-only, or null when no driver is available. */
function openReadOnlySqlite(path: string): SqliteLike | null {
  if (!existsSync(path)) return null;
  // Prefer node:sqlite (Node >=22), fall back to better-sqlite3.
  for (const loader of [
    () => {
      const m = require_('node:sqlite');
      return new m.DatabaseSync(path, { readOnly: true });
    },
    () => {
      const m = require_('better-sqlite3');
      const Ctor = m.default ?? m;
      return new Ctor(path, { readonly: true, fileMustExist: true });
    },
  ]) {
    try {
      return loader() as SqliteLike;
    } catch {
      /* try next driver */
    }
  }
  return null;
}

interface OpencodeRow {
  id: string;
  directory: string;
  title: string | null;
  model: string | null;
  lane_id: string | null;
  time_updated: number;
}

export function fromOpencodeDb(
  scope: string,
  opts: CensusOptions = {},
): CensusAgent[] {
  const dbPath = opts.opencodeDbPath ?? opencodeDbPath();
  const db = openReadOnlySqlite(dbPath);
  if (!db) return [];
  const staleMs = opts.staleMs ?? DEFAULT_STALE_MS;
  const now = opts.now ?? Date.now();
  const cutoff = now - staleMs;
  let rows: OpencodeRow[];
  try {
    rows = db
      .prepare(
        `SELECT id, directory, title, model, lane_id, time_updated
           FROM session
          WHERE time_updated > ?
          ORDER BY time_updated DESC
          LIMIT 500`,
      )
      .all(cutoff) as OpencodeRow[];
  } catch {
    db.close();
    return [];
  }
  db.close();

  const out: CensusAgent[] = [];
  for (const r of rows) {
    if (!r.directory || !isUnder(r.directory, scope)) continue;
    const { provider, model } = parseOpencodeModel(r.model);
    out.push({
      id: `opencode:${r.id}`,
      harness: 'opencode',
      provider,
      model,
      laneId: r.lane_id ?? undefined,
      task: r.title ?? undefined,
      dir: normalizeDir(r.directory),
      lastActivity: new Date(r.time_updated).toISOString(),
      source: 'opencode-db',
      verified: false,
    });
  }
  return out;
}

function parseOpencodeModel(raw: string | null): {
  provider?: string;
  model?: string;
} {
  if (!raw) return {};
  try {
    const m = JSON.parse(raw) as { id?: string; providerID?: string };
    return { provider: m.providerID, model: m.id };
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Adapter: Claude Code session JSONL
// ---------------------------------------------------------------------------

export function fromClaudeProjects(
  scope: string,
  opts: CensusOptions = {},
): CensusAgent[] {
  const dir = opts.claudeProjectsDir ?? claudeProjectsDir();
  if (!existsSync(dir)) return [];
  const staleMs = opts.staleMs ?? DEFAULT_STALE_MS;
  const now = opts.now ?? Date.now();
  const out: CensusAgent[] = [];

  for (const project of readdirSync(dir)) {
    const projectDir = join(dir, project);
    let files: string[];
    try {
      files = readdirSync(projectDir).filter((f) => f.endsWith('.jsonl'));
    } catch {
      continue;
    }
    for (const file of files) {
      const full = join(projectDir, file);
      let mtime: number;
      try {
        mtime = statSync(full).mtimeMs;
      } catch {
        continue;
      }
      if (now - mtime > staleMs) continue;
      const meta = readClaudeTail(full);
      if (!meta.cwd || !isUnder(meta.cwd, scope)) continue;
      const branch = meta.gitBranch && meta.gitBranch !== 'HEAD' ? meta.gitBranch : undefined;
      out.push({
        id: `claude:${meta.sessionId ?? file.replace(/\.jsonl$/, '')}`,
        harness: 'claude',
        provider: 'anthropic',
        model: meta.model,
        branch,
        task: branch,
        dir: normalizeDir(meta.cwd),
        lastActivity: new Date(mtime).toISOString(),
        source: 'claude-sessions',
        verified: false,
      });
    }
  }
  return out;
}

/** Read the tail of a JSONL file and extract the last-seen session metadata. */
function readClaudeTail(file: string, bytes = 64 * 1024): {
  cwd?: string;
  model?: string;
  sessionId?: string;
  gitBranch?: string;
} {
  let fd: number | undefined;
  try {
    const size = statSync(file).size;
    fd = openSync(file, 'r');
    const len = Math.min(bytes, size);
    const buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, size - len);
    const text = buf.toString('utf-8');
    return {
      cwd: lastMatch(text, /"cwd":"((?:[^"\\]|\\.)*)"/g),
      model: lastMatch(text, /"model":"([^"]+)"/g),
      sessionId: lastMatch(text, /"sessionId":"([^"]+)"/g),
      gitBranch: lastMatch(text, /"gitBranch":"([^"]+)"/g),
    };
  } catch {
    return {};
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function lastMatch(text: string, re: RegExp): string | undefined {
  let m: RegExpExecArray | null;
  let last: string | undefined;
  while ((m = re.exec(text)) !== null) last = m[1];
  return last ? last.replace(/\\\//g, '/') : undefined;
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

/**
 * Read the full census for a scope directory: ledger entries win over inferred
 * adapter entries for the same location, then everything is sorted newest-first
 * and pruned by staleness.
 */
export async function readCensus(
  scope: string,
  opts: CensusOptions = {},
): Promise<CensusAgent[]> {
  const staleMs = opts.staleMs ?? DEFAULT_STALE_MS;
  const now = opts.now ?? Date.now();
  const scopeDir = resolve(scope);

  const ledger = fromLedger(scopeDir, opts);

  const inferred: CensusAgent[] = [];
  if (opts.includeOpencode !== false) {
    try {
      inferred.push(...fromOpencodeDb(scopeDir, opts));
    } catch {
      /* best-effort */
    }
  }
  if (opts.includeClaude !== false) {
    try {
      inferred.push(...fromClaudeProjects(scopeDir, opts));
    } catch {
      /* best-effort */
    }
  }

  // Dedupe by identity (session id). Ledger is authoritative and merges *over*
  // an adapter entry with the same id, field by field — so it wins the identity
  // fields it reports (displayName/agentId/verified) without discarding adapter
  // values it omits (e.g. model/provider from the session record). Two distinct
  // sessions in the same workspace both survive, unlike a (harness,dir) key.
  const byId = new Map<string, CensusAgent>();
  for (const entry of inferred) {
    if (!byId.has(entry.id)) byId.set(entry.id, entry);
  }
  for (const entry of ledger) {
    const prev = byId.get(entry.id);
    byId.set(entry.id, prev ? mergeCensusAgent(prev, entry) : entry);
  }

  const merged = [...byId.values()].filter(
    (entry) => now - new Date(entry.lastActivity).getTime() <= staleMs,
  );

  merged.sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
  );
  return merged;
}

/** Overlay `winner` on `base`, keeping base values for fields winner omits. */
export function mergeCensusAgent(base: CensusAgent, winner: CensusAgent): CensusAgent {
  const out = { ...base } as CensusAgent;
  for (const [k, v] of Object.entries(winner)) {
    if (v !== undefined && v !== null && v !== '') {
      (out as unknown as Record<string, unknown>)[k] = v;
    }
  }
  out.source = winner.source;
  out.verified = winner.verified;
  out.lastActivity =
    new Date(winner.lastActivity) > new Date(base.lastActivity)
      ? winner.lastActivity
      : base.lastActivity;
  return out;
}

/** Human label for a census entry's work, or empty. */
export function censusWorkLabel(entry: CensusAgent): string {
  if (entry.issueId) {
    return `${entry.issueId}${entry.issueTitle ? ` ${entry.issueTitle}` : ''}`;
  }
  return entry.task ?? entry.branch ?? basename(entry.dir ?? '') ?? '';
}
