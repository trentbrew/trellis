/**
 * Forge-direct GitHub importer — Phase 1 read-only (ADR-0036 §3, TRL-223).
 *
 * Reads a GitHub repo's issues over REST and projects them onto Trellis `Issue`
 * entities with an `Integration { provider: github }` bookkeeping row and
 * `syncedVia` links, mirroring the git-bug adapter (git-bug-importer.ts).
 *
 * Read-only: no write-back. No token is ever stored as a fact (`credentialRef`
 * is an opaque pointer).
 */

import { createVcsOp } from '../vcs/ops.js';
import type { EngineContext } from '../vcs/engine-context.js';
import { issueEntityId } from '../vcs/types.js';
import { integrationEntityId } from '../core/ontology/core-ontology.js';
import {
  GitHubClient,
  parseRepoSlug,
  type GitHubIssue,
  type GitHubComment,
} from './github-client.js';

export interface ImportGitHubOptions {
  /** `owner/name`. */
  repo: string;
  /** Injectable client (tests pass a fixture transport). */
  client?: GitHubClient;
}

export interface ImportGitHubResult {
  integrationId: string;
  issuesImported: number;
  opsCreated: number;
  commentsCreated: number;
  skipped: number;
}

const IMPORT_SOURCE = 'github';

/** Stable issue id: `github:<owner>/<name>#<number>`. */
export function githubIssueId(owner: string, name: string, number: number): string {
  return `github:${owner}/${name}#${number}`;
}

function labelNames(issue: GitHubIssue): string[] {
  return (issue.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name));
}

function provenanceOf(issue: GitHubIssue) {
  return {
    origin: 'migration' as const,
    actorType: 'machine' as const,
    importSource: IMPORT_SOURCE,
    githubIssueNumber: issue.number,
    githubUpdatedAt: issue.updated_at,
  };
}

/**
 * Import every issue from a GitHub repo. Idempotent: an issue whose recorded
 * `githubUpdatedAt` matches is skipped (no ops). Issues that changed are
 * re-asserted (facts are idempotent by value).
 */
export async function importGitHub(
  ctx: EngineContext,
  opts: ImportGitHubOptions,
): Promise<ImportGitHubResult> {
  const { owner, name } = parseRepoSlug(opts.repo);
  const client = opts.client ?? new GitHubClient();
  const externalId = `${owner}/${name}`;
  const integrationId = integrationEntityId('github', externalId);

  const issues = await client.listIssues(owner, name);
  const recorded = collectRecordedUpdatedAt(ctx);

  let opsCreated = 0;
  let commentsCreated = 0;
  let skipped = 0;

  // Integration bookkeeping (idempotent on its stable id).
  const integrationExists = ctx.store.getFactsByEntity(integrationId).length > 0;
  await assertFacts(ctx, integrationId, [
    { e: integrationId, a: 'type', v: 'Integration' },
    { e: integrationId, a: 'provider', v: 'github' },
    { e: integrationId, a: 'status', v: 'connected' },
    { e: integrationId, a: 'label', v: externalId },
    { e: integrationId, a: 'externalId', v: externalId },
    { e: integrationId, a: 'credentialRef', v: `github:token:${owner}` },
    ...(integrationExists ? [] : [{ e: integrationId, a: 'linkedAt', v: new Date().toISOString() }]),
  ], { origin: 'migration', actorType: 'machine' });

  for (const issue of issues) {
    // Dedup: unchanged since last import → skip.
    const prevUpdated = recorded.get(`${externalId}#${issue.number}`);
    if (prevUpdated === issue.updated_at) {
      skipped++;
      continue;
    }

    const id = githubIssueId(owner, name, issue.number);
    const eid = issueEntityId(id);
    const prov = provenanceOf(issue);

    const isNew = ctx.store.getFactsByEntity(eid).length === 0;
    if (isNew) {
      const op = await createVcsOp('vcs:issueCreate', {
        agentId: ctx.agentId,
        previousHash: ctx.getLastOp()?.hash,
        vcs: {
          provenance: prov,
          issueId: id,
          issueTitle: issue.title,
          issueDescription: issue.body ?? undefined,
          issueStatus: issue.state === 'closed' ? 'closed' : 'backlog',
          issueLabels: labelNames(issue),
        },
      });
      await ctx.applyOp(op);
      opsCreated++;
    } else {
      // Update title/status/description via replace (not assert — assert would
      // leave the old value alongside the new; TRL-225).
      await replaceFacts(ctx, eid, {
        title: issue.title,
        description: issue.body ?? '',
        status: issue.state === 'closed' ? 'closed' : 'backlog',
      }, prov);
      opsCreated++;
    }

    // GitHub-scoped facts. `githubIssueNumber`/`githubUpdatedAt`/`githubUrl` are
    // single-valued (replace); `author` is additive.
    await replaceFacts(ctx, eid, {
      githubIssueNumber: issue.number,
      githubUpdatedAt: issue.updated_at,
      ...(issue.html_url ? { githubUrl: issue.html_url } : {}),
    }, prov);
    if (issue.user) {
      await assertFacts(ctx, eid, [{ e: eid, a: 'author', v: issue.user.login }], prov);
    }

    // Comments as linked entities.
    const comments: GitHubComment[] = await client.listComments(owner, name, issue.number);
    for (const c of comments) {
      const cid = `github-comment:${owner}/${name}#${c.id}`;
      await assertFacts(ctx, cid, [
        { e: cid, a: 'type', v: 'Comment' },
        { e: cid, a: 'body', v: c.body ?? '' },
        { e: cid, a: 'author', v: c.user?.login ?? 'unknown' },
        { e: cid, a: 'timestamp', v: c.created_at },
      ], prov);
      await storeLink(ctx, { e1: cid, a: 'commentsOn', e2: eid }, prov);
      commentsCreated++;
    }

    await storeLink(ctx, { e1: eid, a: 'syncedVia', e2: integrationId }, prov);
  }

  return { integrationId, issuesImported: issues.length, opsCreated, commentsCreated, skipped };
}

/** Map `<externalId>#<number>` → last imported `githubUpdatedAt`. */
function collectRecordedUpdatedAt(ctx: EngineContext): Map<string, string> {
  const out = new Map<string, string>();
  // number+updatedAt are facts on the issue; reconstruct the externalId key
  // from syncedVia is expensive, so key by the issue id's external portion.
  for (const rec of ctx.store.getFactsByAttribute('githubIssueNumber')) {
    if (!rec.e.startsWith('issue:github:')) continue;
    const external = rec.e.slice('issue:github:'.length); // owner/name#N
    const updated = ctx.store
      .getFactsByEntity(rec.e)
      .find((f) => f.a === 'githubUpdatedAt')?.v;
    if (typeof updated === 'string') out.set(external, updated);
  }
  return out;
}

/** Assert facts via `vcs:storeAssert` with import provenance (idempotent by fact). */
async function assertFacts(
  ctx: EngineContext,
  eid: string,
  facts: Array<{ e: string; a: string; v: string | number | boolean }>,
  provenance?: Record<string, unknown>,
): Promise<void> {
  const existing = new Set(
    ctx.store.getFactsByEntity(eid).map((f) => `${f.a}\u0000${String(f.v)}`),
  );
  const fresh = facts.filter((f) => !existing.has(`${f.a}\u0000${String(f.v)}`));
  if (!fresh.length) return;
  const op = await createVcsOp('vcs:storeAssert', {
    agentId: ctx.agentId,
    previousHash: ctx.getLastOp()?.hash,
    vcs: {
      provenance: (provenance ?? { origin: 'migration', actorType: 'machine' }) as never,
      facts: fresh,
    },
  });
  await ctx.applyOp(op);
}

/**
 * Replace the value(s) of single-valued attributes: retract every prior fact
 * for the attribute, then assert the new one. `assertFacts` is additive (it
 * never retracts), so it is correct for set-valued facts (author, number) but
 * wrong for replaceable fields — using it to "update" leaves both the old and
 * new values (TRL-225).
 */
async function replaceFacts(
  ctx: EngineContext,
  eid: string,
  attrs: Record<string, string | number | boolean>,
  provenance?: Record<string, unknown>,
): Promise<void> {
  const existing = ctx.store.getFactsByEntity(eid);
  const retract: Array<{ e: string; a: string; v: string | number | boolean }> = [];
  const assert: Array<{ e: string; a: string; v: string | number | boolean }> = [];
  for (const [a, v] of Object.entries(attrs)) {
    const prev = existing.filter((f) => f.a === a);
    if (prev.length === 1 && prev[0].v === v) continue; // already current
    for (const f of prev) retract.push({ e: eid, a: f.a, v: f.v as string | number | boolean });
    assert.push({ e: eid, a, v });
  }
  if (!retract.length && !assert.length) return;

  const prov = (provenance ?? { origin: 'migration', actorType: 'machine' }) as never;
  if (retract.length) {
    const op = await createVcsOp('vcs:storeRetract', {
      agentId: ctx.agentId,
      previousHash: ctx.getLastOp()?.hash,
      vcs: { provenance: prov, facts: retract },
    });
    await ctx.applyOp(op);
  }
  if (assert.length) {
    const op = await createVcsOp('vcs:storeAssert', {
      agentId: ctx.agentId,
      previousHash: ctx.getLastOp()?.hash,
      vcs: { provenance: prov, facts: assert },
    });
    await ctx.applyOp(op);
  }
}

/** Add a link via `vcs:storeLink` (idempotent by (e1,a,e2)). */
async function storeLink(
  ctx: EngineContext,
  link: { e1: string; a: string; e2: string },
  provenance?: Record<string, unknown>,
): Promise<void> {
  const exists = ctx.store
    .getLinksByEntityAndAttribute(link.e1, link.a)
    .some((l) => l.e2 === link.e2);
  if (exists) return;
  const op = await createVcsOp('vcs:storeLink', {
    agentId: ctx.agentId,
    previousHash: ctx.getLastOp()?.hash,
    vcs: {
      provenance: (provenance ?? { origin: 'migration', actorType: 'machine' }) as never,
      links: [link],
    },
  });
  await ctx.applyOp(op);
}
