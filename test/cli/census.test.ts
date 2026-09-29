import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeHeartbeat } from '../../src/presence/ledger.js';
import { DEFAULT_STALE_MS } from '../../src/presence/ledger.js';
import {
  readCensus,
  fromOpencodeDb,
  fromClaudeProjects,
  isUnder,
  type CensusAgent,
} from '../../src/presence/census.js';

const require_ = createRequire(import.meta.url);

const NOW = Date.UTC(2026, 8, 29, 17, 0, 0); // 2026-09-29T17:00:00Z
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

let root: string;
let scope: string;
let adminDir: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), `trellis-census--${process.pid}-${Date.now().toString(36)}`));
  scope = join(root, 'OS');
  adminDir = join(scope, 'admin');
  mkdirSync(adminDir, { recursive: true });
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function makeOpencodeDb(path: string): void {
  const { DatabaseSync } = require_('node:sqlite');
  const db = new DatabaseSync(path);
  db.exec(
    `CREATE TABLE session (
       id TEXT PRIMARY KEY, directory TEXT, title TEXT, model TEXT,
       lane_id TEXT, time_updated INTEGER
     )`,
  );
  const insert = db.prepare(
    `INSERT INTO session (id, directory, title, model, lane_id, time_updated)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  insert.run(
    'ses_live',
    adminDir,
    'Svelte effect_update_depth_exceeded debugging',
    JSON.stringify({ id: 'deepseek-v4.1-flash', providerID: 'opencode-go', variant: 'high' }),
    'lane-302cf41e',
    NOW - 1000,
  );
  insert.run(
    'ses_outside',
    join(root, 'elsewhere'),
    'not in scope',
    null,
    null,
    NOW - 1000,
  );
  insert.run(
    'ses_stale',
    scope,
    'old work',
    null,
    null,
    NOW - (DEFAULT_STALE_MS + 60_000),
  );
  db.close();
}

function makeClaudeProject(dir: string, session: string, cwd: string, opts: { ageMs?: number } = {}): string {
  const projectDir = join(dir, cwd.replace(/[/]/g, '-'));
  mkdirSync(projectDir, { recursive: true });
  const file = join(projectDir, `${session}.jsonl`);
  writeFileSync(
    file,
    [
      JSON.stringify({ type: 'user', cwd, sessionId: session }),
      JSON.stringify({
        type: 'assistant',
        cwd,
        sessionId: session,
        model: 'claude-opus-5-5',
        gitBranch: 'HEAD',
      }),
    ].join('\n') + '\n',
  );
  const seconds = Math.floor((NOW - (opts.ageMs ?? 0)) / 1000);
  utimesSync(file, seconds, seconds);
  return file;
}

describe('isUnder', () => {
  it('matches self and descendants, not siblings', () => {
    expect(isUnder(scope, scope)).toBe(true);
    expect(isUnder(adminDir, scope)).toBe(true);
    expect(isUnder(scope + '/admin/x', scope)).toBe(true);
    expect(isUnder(scope + '-other', scope)).toBe(false);
    expect(isUnder(join(root, 'elsewhere'), scope)).toBe(false);
  });
});

describe('fromOpencodeDb', () => {
  it('reads in-scope, non-stale sessions and parses model', () => {
    const db = join(root, 'opencode.db');
    makeOpencodeDb(db);
    const entries = fromOpencodeDb(scope, { opencodeDbPath: db, now: NOW });
    expect(entries.map((e) => e.id)).toEqual(['opencode:ses_live']);
    const live = entries[0];
    expect(live.harness).toBe('opencode');
    expect(live.provider).toBe('opencode-go');
    expect(live.model).toBe('deepseek-v4.1-flash');
    expect(live.laneId).toBe('lane-302cf41e');
    expect(live.task).toContain('effect_update_depth_exceeded');
    expect(live.verified).toBe(false);
  });

  it('degrades to empty when the DB is absent', () => {
    expect(fromOpencodeDb(scope, { opencodeDbPath: join(root, 'nope.db'), now: NOW })).toEqual([]);
  });
});

describe('fromClaudeProjects', () => {
  it('reads in-scope, non-stale sessions with model and branch', () => {
    const projects = join(root, 'claude-projects');
    makeClaudeProject(projects, 'sess-live', adminDir);
    makeClaudeProject(projects, 'sess-stale', scope, { ageMs: DEFAULT_STALE_MS + 60_000 });
    makeClaudeProject(projects, 'sess-out', join(root, 'elsewhere'));
    const entries = fromClaudeProjects(scope, { claudeProjectsDir: projects, now: NOW });
    expect(entries.map((e) => e.id)).toEqual(['claude:sess-live']);
    expect(entries[0].provider).toBe('anthropic');
    expect(entries[0].model).toBe('claude-opus-5-5');
    expect(entries[0].dir).toBe(adminDir);
  });
});

describe('readCensus merge', () => {
  it('merges ledger + adapters on identity, sorted newest-first', async () => {
    const db = join(root, 'opencode.db');
    makeOpencodeDb(db);
    const projects = join(root, 'claude-projects');
    makeClaudeProject(projects, 'sess-live', adminDir, { ageMs: 4 * 60_000 });

    // Ledger heartbeat for the same admin dir as the opencode session.
    writeHeartbeat(scope, {
      sessionId: 'opencode:ses_live',
      agentId: 'identity:test',
      displayName: 'Trent',
      client: 'opencode',
      harness: 'opencode',
      provider: 'opencode-go',
      model: 'deepseek-v4.1-flash',
      task: 'census',
      dir: adminDir,
      status: 'active',
      startedAt: iso(1000),
      lastHeartbeat: iso(1000),
    });

    const entries = await readCensus(scope, {
      opencodeDbPath: db,
      claudeProjectsDir: projects,
      now: NOW,
    });

    // Ledger entry for admin, plus the claude session (admin deduped).
    expect(entries.map((e) => e.id).sort()).toEqual(['claude:sess-live', 'opencode:ses_live']);
    const ledger = entries.find((e) => e.source === 'ledger')!;
    expect(ledger.verified).toBe(true);
    // Newest-first ordering.
    expect(entries[0].id).toBe('opencode:ses_live');
  });

  it('keeps two distinct sessions that share a workspace', async () => {
    const db = join(root, 'opencode.db');
    const { DatabaseSync } = require_('node:sqlite');
    const d = new DatabaseSync(db);
    d.exec(
      `CREATE TABLE session (
         id TEXT PRIMARY KEY, directory TEXT, title TEXT, model TEXT,
         lane_id TEXT, time_updated INTEGER
       )`,
    );
    const ins = d.prepare(
      `INSERT INTO session (id, directory, title, model, lane_id, time_updated)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    ins.run('ses_a', scope, 'task a', null, null, NOW - 1000);
    ins.run('ses_b', scope, 'task b', null, null, NOW - 2000);
    d.close();

    const entries = await readCensus(scope, {
      opencodeDbPath: db,
      includeClaude: false,
      now: NOW,
    });
    expect(entries.map((e) => e.id).sort()).toEqual(['opencode:ses_a', 'opencode:ses_b']);
  });

  it('ledger merges over adapter, inheriting fields it omits (model)', async () => {
    const db = join(root, 'opencode.db');
    makeOpencodeDb(db);
    writeHeartbeat(scope, {
      sessionId: 'opencode:ses_live',
      agentId: 'identity:test',
      displayName: 'Trent',
      client: 'opencode',
      dir: adminDir,
      status: 'active',
      startedAt: iso(1000),
      lastHeartbeat: iso(500),
    });

    const entries = await readCensus(scope, {
      opencodeDbPath: db,
      includeClaude: false,
      now: NOW,
    });
    expect(entries).toHaveLength(1);
    const e = entries[0];
    expect(e.source).toBe('ledger');
    expect(e.verified).toBe(true);
    expect(e.displayName).toBe('Trent');
    expect(e.model).toBe('deepseek-v4.1-flash'); // inherited from the adapter
    expect(e.provider).toBe('opencode-go');
  });

  it('prunes everything stale', async () => {
    const db = join(root, 'opencode.db');
    makeOpencodeDb(db);
    const entries = await readCensus(scope, {
      opencodeDbPath: db,
      includeClaude: false,
      now: NOW + DEFAULT_STALE_MS * 2,
    });
    expect(entries).toEqual([]);
  });

  it('returns [] when there are no sources', async () => {
    const entries: CensusAgent[] = await readCensus(scope, {
      opencodeDbPath: join(root, 'nope.db'),
      claudeProjectsDir: join(root, 'nope-claude'),
      now: NOW,
    });
    expect(entries).toEqual([]);
  });
});
