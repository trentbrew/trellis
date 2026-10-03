/**
 * git-bug compatibility adapter — Phase 1 read-only import (ADR 0049).
 *
 * Reads git-bug's `refs/bugs/*` (commit chains of JSON OperationPacks) via git
 * plumbing — no git-bug binary, no network — compiles the canonical op order
 * (Lamport clock first, lexicographic pack id on ties), and maps ops to Trellis
 * `vcs:issue*` operations. Trellis stays canonical; git-bug is transport + format.
 *
 * Bookkeeping: an `Integration { provider: 'git-bug' }` entity is upserted and
 * each imported issue links `syncedVia → Integration` (ADR-0036 §3 / FIN-0051).
 */

import { GitReader } from './git-reader.js';
import { createVcsOp } from '../vcs/ops.js';
import type { VcsOp } from '../vcs/types.js';
import type { EngineContext } from '../vcs/engine-context.js';
import { issueEntityId } from '../vcs/types.js';
import { integrationEntityId } from '../core/ontology/core-ontology.js';

// ---------------------------------------------------------------------------
// git-bug op types (entities/bug/operation.go)
// ---------------------------------------------------------------------------

export type GitBugOpType =
  | 1 // CreateOp
  | 2 // SetTitleOp
  | 3 // AddCommentOp
  | 4 // SetStatusOp
  | 5 // LabelChangeOp
  | 6 // EditCommentOp
  | 7 // NoOpOp
  | 8; // SetMetadataOp

export interface GitBugOpBase {
  author: { id: string } | string;
  timestamp: number;
  nonce?: string;
}

export interface GitBugOperation {
  type: GitBugOpType;
  /** Flattened payload fields (git-bug stores the op-specific fields inline). */
  title?: string;
  message?: string;
  status?: number; // 1 = open, 2 = closed
  added?: string[];
  removed?: string[];
  target?: string; // EditCommentOp target combined id
  key?: string;
  value?: string;
  files?: unknown[];
  base?: GitBugOpBase;
  // Some versions nest the base; tolerate both shapes.
  author?: GitBugOpBase['author'];
  timestamp?: number;
}

export interface GitBugPack {
  packId: string; // commit-tree hash the pack was read from
  clock: number; // edit-clock-N / create-clock-N value
  ops: GitBugOperation[];
}

/** One compiled, canonically-ordered git-bug op with its provenance. */
export interface CompiledOp {
  op: GitBugOperation;
  gitBugOpId: string; // content hash of the op (git-bug `hash(json(op))`)
  gitBugPackId: string;
  gitBugLamport: number;
  gitBugAuthorId: string;
}

// ---------------------------------------------------------------------------
// Git object reading
// ---------------------------------------------------------------------------

/** List all bug refs (`refs/bugs/*`) in the repo. */
export function listBugRefs(reader: GitReader): string[] {
  const raw = reader.readRaw('for-each-ref --format="%(refname)" refs/bugs');
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Read every OperationPack reachable from a bug ref. Walks the commit chain
 * (oldest first) and reads each commit's `ops` blob plus its clock entry.
 */
export function readBugPacks(reader: GitReader, ref: string): GitBugPack[] {
  const commits = reader
    .readRaw(`rev-list --reverse ${ref}`)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const packs: GitBugPack[] = [];
  for (const commit of commits) {
    // Read the tree's `ops` blob; skip commits without one.
    let opsJson: string;
    try {
      const treeEntry = reader.readRaw(`ls-tree ${commit}`).trim();
      const hasOps = treeEntry.split('\n').some((l) => /\sops$/.test(l));
      if (!hasOps) continue;
      const blobHash = reader
        .readRaw(`rev-parse ${commit}:ops`)
        .trim();
      opsJson = reader.readRaw(`cat-file blob ${blobHash}`);
    } catch {
      continue;
    }

    let clock = 0;
    const clockMatch = reader
      .readRaw(`ls-tree ${commit}`)
      .match(/(edit|create)-clock-(\d+)/);
    if (clockMatch) clock = Number(clockMatch[2]);

    let parsed: { ops?: GitBugOperation[] };
    try {
      parsed = JSON.parse(opsJson);
    } catch {
      continue;
    }
    if (Array.isArray(parsed.ops)) {
      packs.push({ packId: commit, clock, ops: parsed.ops });
    }
  }
  return packs;
}

// ---------------------------------------------------------------------------
// Canonical ordering (ADR 0049)
// ---------------------------------------------------------------------------

/** Deterministic string hash for provenance ids (git-bug uses hash(json(op))). */
/**
 * Recursively sort object keys so the serialization is canonical (Go's
 * `json.Marshal` sorts map keys with no whitespace). Strings are emitted with
 * JSON escaping; numbers/booleans/null passthrough.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

/**
 * git-bug op / entity id: sha256 over the canonical JSON of the op.
 *
 * NOTE: git-bug hashes the *raw* `json(op)` it received. We canonicalize with
 * sorted keys (matching Go's `json.Marshal` key ordering and no whitespace),
 * which reproduces git-bug's hash for objects whose field set and values match.
 * This is the documented contract (ADR 0049 §"Op id = hash(json(op))"); it is a
 * real content hash, not an opaque local token, so two importers agree.
 */
export async function gitBugOpHash(op: GitBugOperation): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalize(op)),
  );
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * git-bug comment "combined id": the pair of author id and nonce that git-bug
 * uses to address a comment. `EditCommentOp.target` carries this value.
 */
export function gitBugCombinedId(authorId: string, nonce: string | undefined): string {
  return `${authorId}/${nonce ?? ''}`;
}

function authorIdOf(op: GitBugOperation): string {
  const a = op.base?.author ?? op.author;
  if (typeof a === 'string') return a;
  if (a && typeof a === 'object' && 'id' in a) return String((a as { id: string }).id);
  return 'unknown';
}

function nonceOf(op: GitBugOperation): string | undefined {
  return op.base?.nonce;
}

function timestampOf(op: GitBugOperation): number {
  return op.base?.timestamp ?? op.timestamp ?? 0;
}

/**
 * Compile all packs into one canonically-ordered op list.
 * Order: Lamport clock first; on ties, lexicographic pack id (ADR 0049).
 */
export async function compileOps(packs: GitBugPack[]): Promise<CompiledOp[]> {
  const sorted = [...packs].sort((a, b) => {
    if (a.clock !== b.clock) return a.clock - b.clock;
    return a.packId < b.packId ? -1 : a.packId > b.packId ? 1 : 0;
  });

  const out: CompiledOp[] = [];
  for (const pack of sorted) {
    // Within a pack, keep declared order (git-bug applies packs as ordered lists).
    for (const op of pack.ops) {
      out.push({
        op,
        gitBugOpId: await gitBugOpHash(op),
        gitBugPackId: pack.packId,
        gitBugLamport: pack.clock,
        gitBugAuthorId: authorIdOf(op),
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Snapshot compilation (ops → issue state)
// ---------------------------------------------------------------------------

export interface CompiledIssue {
  gitBugEntityId: string; // entity id derived from the CreateOp hash
  title: string;
  description?: string;
  closed: boolean;
  labels: string[];
  comments: Array<{ id: string; message: string; author: string; timestamp: number }>;
  metadata: Record<string, string>;
  /** Every op that shaped this issue, in canonical order (for provenance). */
  ops: CompiledOp[];
}

/**
 * Apply the canonical op list to empty snapshots (operation-based CRDT), per
 * ADR 0049. Each bug ref is compiled independently.
 */
export function compileIssues(perRefOps: Array<{ ref: string; ops: CompiledOp[] }>): CompiledIssue[] {
  const issues: CompiledIssue[] = [];
  for (const { ops } of perRefOps) {
    let issue: CompiledIssue | null = null;
    for (const c of ops) {
      const op = c.op;
      switch (op.type) {
        case 1: // CreateOp
          if (issue) break;
          issue = {
            gitBugEntityId: c.gitBugOpId,
            title: op.title ?? '',
            description: op.message,
            closed: false,
            labels: [],
            comments: [],
            metadata: {},
            ops: [],
          };
          break;
        case 2: // SetTitleOp
          if (issue && op.title != null) issue.title = op.title;
          break;
        case 4: // SetStatusOp
          if (issue && op.status != null) issue.closed = op.status === 2;
          break;
        case 5: // LabelChangeOp
          if (issue) {
            for (const l of op.added ?? []) if (!issue.labels.includes(l)) issue.labels.push(l);
            issue.labels = issue.labels.filter((l) => !(op.removed ?? []).includes(l));
          }
          break;
        case 3: // AddCommentOp — id is git-bug's combined id (author + nonce)
          if (issue) {
            issue.comments.push({
              id: gitBugCombinedId(c.gitBugAuthorId, nonceOf(op)),
              message: op.message ?? '',
              author: c.gitBugAuthorId,
              timestamp: timestampOf(op),
            });
          }
          break;
        case 6: {
          // EditCommentOp — target carries the comment's combined id.
          if (issue && op.target) {
            const target = issue.comments.find((x) => x.id === op.target);
            if (target) target.message = op.message ?? target.message;
          }
          break;
        }
        case 8: // SetMetadataOp
          if (issue && op.key != null) issue.metadata[op.key] = op.value ?? '';
          break;
        // 7 = NoOpOp → ignored
      }
      if (issue) issue.ops.push(c);
    }
    if (issue) issues.push(issue);
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Import (write path)
// ---------------------------------------------------------------------------

export interface ImportGitBugOptions {
  reader?: GitReader;
  repoPath: string;
  /** Repo identity for the Integration externalId (remote URL or path). */
  repoIdentity?: string;
}

export interface ImportGitBugResult {
  integrationId: string;
  issuesImported: number;
  opsCreated: number;
  commentsCreated: number;
  skipped: number;
}

/** Imported issue ids link back to the git-bug entity via this attribute. */
export const GITBUG_ENTITY_ATTR = 'gitBugEntityId';

function provenanceOf(c: CompiledOp) {
  return {
    origin: 'migration' as const,
    actorType: 'machine' as const,
    importSource: 'git-bug',
    gitBugOpId: c.gitBugOpId,
    gitBugPackId: c.gitBugPackId,
    gitBugLamport: c.gitBugLamport,
    gitBugAuthorId: c.gitBugAuthorId,
  };
}

/**
 * Import every bug from `repoPath` into the graph as Issues, upserting the
 * `Integration` bookkeeping row. Idempotent: ops already recorded (by
 * `gitBugOpId`) are skipped.
 */
export async function importGitBug(
  ctx: EngineContext,
  opts: ImportGitBugOptions,
): Promise<ImportGitBugResult> {
  const reader = opts.reader ?? new GitReader(opts.repoPath);
  const identity = opts.repoIdentity ?? resolveRepoIdentity(reader, opts.repoPath);
  const integrationId = integrationEntityId('git-bug', identity);

  // Recorded op ids from prior runs (dedup).
  const recorded = collectRecordedGitBugOpIds(ctx);

  const refs = listBugRefs(reader);
  const perRef = await Promise.all(
    refs.map(async (ref) => ({ ref, ops: await compileOps(readBugPacks(reader, ref)) })),
  );
  const issues = compileIssues(perRef);

  let opsCreated = 0;
  let commentsCreated = 0;
  let skipped = 0;

  // Upsert the Integration bookkeeping entity (idempotent on its stable id).
  // Timestamp facts are set only on first connect so a re-run appends no ops.
  const integrationExists = ctx.store.getFactsByEntity(integrationId).length > 0;
  await assertFacts(ctx, integrationId, [
    { e: integrationId, a: 'type', v: 'Integration' },
    { e: integrationId, a: 'provider', v: 'git-bug' },
    { e: integrationId, a: 'status', v: 'connected' },
    { e: integrationId, a: 'label', v: identity },
    { e: integrationId, a: 'externalId', v: identity },
    ...(integrationExists ? [] : [{ e: integrationId, a: 'linkedAt', v: new Date().toISOString() }]),
  ]);

  for (const issue of issues) {
    const createOp = issue.ops.find((c) => c.op.type === 1);
    // Dedup is per-issue, keyed on the CreateOp id: the create op identifies the
    // bug, and a re-run recompiles the same id. (A later op appearing does not
    // mean the issue is new — the create op does.)
    if (!createOp || recorded.has(createOp.gitBugOpId)) {
      skipped += issue.ops.length;
      continue;
    }

    const id = `gitbug:${issue.gitBugEntityId}`;
    const eid = issueEntityId(id);

    const op = await createVcsOp('vcs:issueCreate', {
      agentId: ctx.agentId,
      previousHash: ctx.getLastOp()?.hash,
      vcs: {
        provenance: provenanceOf(createOp),
        issueId: id,
        issueTitle: issue.title,
        issueDescription: issue.description,
        issueStatus: issue.closed ? 'closed' : 'backlog',
        issueLabels: issue.labels,
      },
    });
    await ctx.applyOp(op);
    opsCreated++;

    // Record the git-bug entity id + provenance on the issue, and link syncedVia.
    await assertFacts(ctx, eid, [
      { e: eid, a: GITBUG_ENTITY_ATTR, v: issue.gitBugEntityId },
      ...Object.entries(issue.metadata).map(([k, v]) => ({ e: eid, a: `gitBugMeta:${k}`, v })),
    ], provenanceOf(createOp));

    for (const comment of issue.comments) {
      const cid = `gitbug-comment:${comment.id}`;
      await assertFacts(ctx, cid, [
        { e: cid, a: 'type', v: 'Comment' },
        { e: cid, a: 'body', v: comment.message },
        { e: cid, a: 'author', v: comment.author },
        { e: cid, a: 'timestamp', v: comment.timestamp },
        { e: cid, a: 'gitBugCommentId', v: comment.id },
      ], provenanceOf(createOp));
      await storeLink(ctx, { e1: cid, a: 'commentsOn', e2: eid }, provenanceOf(createOp));
      commentsCreated++;
    }

    await storeLink(ctx, { e1: eid, a: 'syncedVia', e2: integrationId }, provenanceOf(createOp));
    // Count the non-create/non-comment ops that shaped this issue snapshot.
    for (const c of issue.ops) {
      if (c.op.type !== 1 && c.op.type !== 3) opsCreated++;
    }
  }

  return { integrationId, issuesImported: issues.length, opsCreated, commentsCreated, skipped };
}

function resolveRepoIdentity(reader: GitReader, repoPath: string): string {
  try {
    const url = reader.readRaw('config --get remote.origin.url').trim();
    if (url) return url;
  } catch {
    // no remote
  }
  return repoPath;
}

/** Collect `gitBugOpId`s already recorded in the op log (dedup key). */
function collectRecordedGitBugOpIds(ctx: EngineContext): Set<string> {
  const ids = new Set<string>();
  for (const op of ctx.readAllOps()) {
    const src = (op.vcs as { provenance?: Record<string, unknown> })?.provenance;
    const id = src?.gitBugOpId;
    if (src?.importSource === 'git-bug' && typeof id === 'string') ids.add(id);
  }
  return ids;
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

export type { VcsOp };
