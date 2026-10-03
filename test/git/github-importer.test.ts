import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TrellisVcsEngine } from '../../src/engine.js';
import { GitHubClient } from '../../src/git/github-client.js';
import { importGitHub, githubIssueId } from '../../src/git/github-importer.js';

// TRL-223 — forge-direct GitHub bridge (offline fixture transport).

const ROOT = `/tmp/trellis-github-${process.pid}-${Date.now().toString(36)}`;

interface Fixture {
  issues: unknown[];
  comments: Record<number, unknown[]>;
}

function fixtureClient(fx: Fixture, token = 'test-token'): GitHubClient {
  const fetchImpl = async (url: string) => {
    const json = (v: unknown) => ({ ok: true, status: 200, json: async () => v, text: async () => JSON.stringify(v) });
    if (/\/issues\/\d+\/comments/.test(url)) {
      const n = Number(/\/issues\/(\d+)\/comments/.exec(url)![1]);
      return json(fx.comments[n] ?? []);
    }
    if (/\/issues\?/.test(url)) return json(fx.issues);
    return { ok: false, status: 404, text: async () => 'not found', json: async () => ({}) };
  };
  return new GitHubClient({ fetchImpl: fetchImpl as never, token, baseUrl: 'https://api.github.com' });
}

function issueFx(over: Record<string, unknown> = {}) {
  return {
    number: 1,
    title: 'First issue',
    body: 'body text',
    state: 'open',
    labels: [{ name: 'bug' }],
    user: { login: 'octocat' },
    updated_at: '2026-01-01T00:00:00Z',
    html_url: 'https://github.com/o/r/issues/1',
    ...over,
  };
}

describe('GitHubClient', () => {
  test('throws a clear error when the token is absent', async () => {
    const client = new GitHubClient({ token: '' as unknown as string });
    // Force no token regardless of ambient env.
    (client as unknown as { token: string | undefined }).token = undefined;
    await expect(client.listIssues('o', 'r')).rejects.toThrow(/GITHUB_TOKEN/);
  });

  test('parseRepoSlug validates owner/name', async () => {
    const { parseRepoSlug } = await import('../../src/git/github-client.js');
    expect(parseRepoSlug('octocat/hello-world')).toEqual({ owner: 'octocat', name: 'hello-world' });
    expect(() => parseRepoSlug('nope')).toThrow(/owner\/name/);
  });
});

describe('importGitHub', () => {
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    rmSync(ROOT, { recursive: true, force: true });
    mkdirSync(ROOT, { recursive: true });
    engine = new TrellisVcsEngine({ rootPath: ROOT });
    await engine.initRepo();
  });

  afterEach(() => {
    rmSync(ROOT, { recursive: true, force: true });
  });

  test('imports issues, Integration bookkeeping, and comments', async () => {
    const fx: Fixture = {
      issues: [issueFx({ number: 1, title: 'A' }), issueFx({ number: 2, title: 'B', state: 'closed' })],
      comments: { 1: [{ id: 10, body: 'a comment', user: { login: 'bob' }, created_at: '2026-01-02T00:00:00Z' }] },
    };
    const ctx = engine.capabilityContext();
    const r = await importGitHub(ctx, { repo: 'octocat/hello-world', client: fixtureClient(fx) });

    expect(r.issuesImported).toBe(2);
    expect(r.integrationId).toBe('integration:github:octocat/hello-world');

    // Integration bookkeeping.
    const integ = ctx.store.getFactsByEntity('integration:github:octocat/hello-world');
    expect(integ.some((f) => f.a === 'provider' && f.v === 'github')).toBe(true);

    // Issue 1 mapped.
    const eid = `issue:${githubIssueId('octocat', 'hello-world', 1)}`;
    const facts = ctx.store.getFactsByEntity(eid);
    expect(facts.find((f) => f.a === 'githubIssueNumber')?.v).toBe(1);
    expect(facts.find((f) => f.a === 'title')?.v).toBe('A');
    expect(facts.find((f) => f.a === 'author')?.v).toBe('octocat');

    // syncedVia link.
    const links = ctx.store.getLinksByEntityAndAttribute(eid, 'syncedVia');
    expect(links.some((l) => l.e2 === 'integration:github:octocat/hello-world')).toBe(true);

    // comment linked.
    const cid = 'github-comment:octocat/hello-world#10';
    expect(ctx.store.getFactsByEntity(cid).find((f) => f.a === 'body')?.v).toBe('a comment');
    expect(ctx.store.getLinksByEntityAndAttribute(cid, 'commentsOn').some((l) => l.e2 === eid)).toBe(true);

    // closed issue → status closed.
    const eid2 = `issue:${githubIssueId('octocat', 'hello-world', 2)}`;
    expect(ctx.store.getFactsByEntity(eid2).find((f) => f.a === 'status')?.v).toBe('closed');
  });

  test('is idempotent — unchanged issues are skipped', async () => {
    const fx: Fixture = { issues: [issueFx({ number: 1 })], comments: {} };
    const ctx = engine.capabilityContext();
    await importGitHub(ctx, { repo: 'o/r', client: fixtureClient(fx) });
    const opsBefore = ctx.readAllOps().length;

    const again = await importGitHub(ctx, { repo: 'o/r', client: fixtureClient(fx) });
    expect(again.opsCreated).toBe(0);
    expect(again.skipped).toBe(1);
    expect(ctx.readAllOps().length).toBe(opsBefore);
  });

  test('changed issue updates in place and converges (TRL-225)', async () => {
    const fxOld: Fixture = { issues: [issueFx({ number: 1, title: 'Old', updated_at: '2026-01-01T00:00:00Z' })], comments: {} };
    const fxNew: Fixture = { issues: [issueFx({ number: 1, title: 'New', state: 'closed', updated_at: '2026-02-02T00:00:00Z' })], comments: {} };
    const ctx = engine.capabilityContext();

    await importGitHub(ctx, { repo: 'o/r', client: fixtureClient(fxOld) });
    await importGitHub(ctx, { repo: 'o/r', client: fixtureClient(fxNew) });

    const eid = `issue:${githubIssueId('o', 'r', 1)}`;
    const facts = ctx.store.getFactsByEntity(eid);
    // exactly one title fact, reading the NEW value (not appended)
    expect(facts.filter((f) => f.a === 'title')).toHaveLength(1);
    expect(facts.find((f) => f.a === 'title')?.v).toBe('New');
    expect(facts.filter((f) => f.a === 'status')).toHaveLength(1);
    expect(facts.find((f) => f.a === 'status')?.v).toBe('closed');
    expect(facts.filter((f) => f.a === 'githubUpdatedAt')).toHaveLength(1);

    // Third run (same as fxNew) converges — zero new ops.
    const before = ctx.readAllOps().length;
    const third = await importGitHub(ctx, { repo: 'o/r', client: fixtureClient(fxNew) });
    expect(third.opsCreated).toBe(0);
    expect(ctx.readAllOps().length).toBe(before);
  });

  test('provenance is queryable on imported ops', async () => {
    const fx: Fixture = { issues: [issueFx({ number: 7 })], comments: {} };
    const ctx = engine.capabilityContext();
    await importGitHub(ctx, { repo: 'o/r', client: fixtureClient(fx) });

    const imported = ctx.readAllOps().filter((op) => {
      const p = (op.vcs as { provenance?: Record<string, unknown> })?.provenance;
      return p?.importSource === 'github';
    });
    expect(imported.length).toBeGreaterThan(0);
    for (const op of imported) {
      const p = (op.vcs as { provenance?: Record<string, unknown> }).provenance!;
      expect(p.githubIssueNumber).toBe(7);
      expect(typeof p.githubUpdatedAt).toBe('string');
    }
  });

  test('no token value is ever stored as a fact', async () => {
    const fx: Fixture = { issues: [issueFx()], comments: {} };
    const ctx = engine.capabilityContext();
    await importGitHub(ctx, { repo: 'o/r', client: fixtureClient(fx, 'super-secret-token') });

    const all = ctx.store.getAllFacts();
    expect(all.some((f) => String(f.v).includes('super-secret-token'))).toBe(false);
    // credentialRef is a pointer, not the token.
    const integ = ctx.store.getFactsByEntity('integration:github:o/r');
    expect(integ.find((f) => f.a === 'credentialRef')?.v).toBe('github:token:o');
  });
});
