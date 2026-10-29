/**
 * Two-peer issue-id conflict recovery (KRN-508, ADR 0064 interim).
 *
 * Two writers allocating offline can mint the same `PREFIX-N` for different
 * issues. `integrateOps` rejects the foreign create (KRN-507), and the peer's
 * later ops chain off it and reject as missing-dependency — a permanent wedge.
 *
 * Recovery: the create that is later by `(timestamp, hash)` loses, on both
 * machines. Only the losing machine acts: it rewrites its own ops that descend
 * from the losing create — the ones the winner rejected — under a new id. This
 * module is the pure part: conflict detection, the descendant set, and the
 * rewrite. Journal replacement and its guards live in the engine.
 *
 * ADR 0064 bounds this to two writers; the target design makes the create hash
 * the identity and the number a computed name, so nothing is rewritten.
 */

import type { VcsOp } from './types.js';
import { hashVcsOpByVersion } from './ops.js';

export interface IssueIdConflict {
  issueId: string;
  local: VcsOp;
  foreign: VcsOp;
  /** The local create is later by `(timestamp, hash)`, so this machine renumbers. */
  localLoses: boolean;
}

/** True when create `a` keeps the number over `b` (ADR 0064 §2). */
export function createWins(a: VcsOp, b: VcsOp): boolean {
  if (a.timestamp !== b.timestamp) return a.timestamp < b.timestamp;
  return a.hash < b.hash;
}

/**
 * Every foreign `issueCreate` whose id names a different local issue.
 *
 * Checks all foreign creates, not only those rejected as `issue-id-conflict`:
 * a later collision descends from the first one and rejects as
 * missing-dependency, so it would otherwise stay hidden.
 */
export function findIssueIdConflicts(
  localOps: VcsOp[],
  foreignOps: VcsOp[],
): IssueIdConflict[] {
  const localCreates = new Map<string, VcsOp>();
  for (const op of localOps) {
    const id = op.kind === 'vcs:issueCreate' ? op.vcs?.issueId : undefined;
    if (id && !localCreates.has(id)) localCreates.set(id, op);
  }

  const conflicts = new Map<string, IssueIdConflict>();
  for (const foreign of foreignOps) {
    const id = foreign.kind === 'vcs:issueCreate' ? foreign.vcs?.issueId : undefined;
    if (!id || conflicts.has(id)) continue;
    const local = localCreates.get(id);
    if (!local || local.hash === foreign.hash) continue;
    conflicts.set(id, { issueId: id, local, foreign, localLoses: createWins(foreign, local) });
  }
  return [...conflicts.values()];
}

/**
 * Hashes of `roots` plus every op that chains from them (`previousHash`, or
 * `parents` for v2), scanning in journal order. Foreign ops keep their own
 * parent, so they never land in the set.
 */
export function descendantHashes(ops: VcsOp[], roots: Iterable<string>): Set<string> {
  const set = new Set(roots);
  for (const op of ops) {
    if (set.has(op.hash)) continue;
    const parents = op.parents ?? (op.previousHash ? [op.previousHash] : []);
    if (parents.some((p) => set.has(p))) set.add(op.hash);
  }
  return set;
}

function remapString(
  value: string,
  renames: Map<string, string>,
  hashMap: Map<string, string>,
): string {
  const renamed = renames.get(value);
  if (renamed) return renamed;
  for (const [from, to] of renames) {
    if (value === `issue:${from}`) return `issue:${to}`;
    if (value.startsWith(`criterion:${from}:`)) {
      return `criterion:${to}:${value.slice(`criterion:${from}:`.length)}`;
    }
  }
  return hashMap.get(value) ?? value;
}

/**
 * Remap exact id and op-hash references, preserving key order — the op hash
 * is computed over `JSON.stringify(vcs)`. Prose that mentions an id is left as
 * written.
 */
function remapValue(
  value: unknown,
  renames: Map<string, string>,
  hashMap: Map<string, string>,
): unknown {
  if (typeof value === 'string') return remapString(value, renames, hashMap);
  if (Array.isArray(value)) return value.map((v) => remapValue(v, renames, hashMap));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = remapValue(v, renames, hashMap);
    return out;
  }
  return value;
}

export interface RewriteResult {
  ops: VcsOp[];
  /** Old hash → new hash for every rewritten op. */
  hashMap: Map<string, string>;
}

/**
 * Rewrite the ops in `rewrite` (journal order kept): issue-id references go
 * through `renames`, op-hash references and parents through the new hashes.
 * Ops outside the set are returned unchanged.
 *
 * `resign` re-signs an op whose original carried a signature; without it a
 * signed op in the set is refused rather than shipped unsigned.
 */
export async function rewriteOps(
  ops: VcsOp[],
  rewrite: Set<string>,
  renames: Map<string, string>,
  resign?: (unsigned: VcsOp, original: VcsOp) => Promise<VcsOp>,
): Promise<RewriteResult> {
  const hashMap = new Map<string, string>();
  const out: VcsOp[] = [];

  for (const op of ops) {
    if (!rewrite.has(op.hash)) {
      out.push(op);
      continue;
    }

    const signed = Boolean(op.vcs?.signature);
    if (signed && !resign) {
      throw new Error(
        `Cannot renumber: op ${op.hash} is signed and no local signing key can re-sign it.`,
      );
    }

    const { hash: _hash, ...envelope } = op;
    let vcs = op.vcs;
    if (vcs) {
      const { signature: _s, signedBy: _b, signedWith: _w, ...unsignedVcs } = vcs;
      vcs = remapValue(unsignedVcs, renames, hashMap) as VcsOp['vcs'];
    }
    const next: VcsOp = {
      ...envelope,
      vcs,
      ...(op.previousHash !== undefined
        ? { previousHash: hashMap.get(op.previousHash) ?? op.previousHash }
        : {}),
      ...(op.parents ? { parents: op.parents.map((p) => hashMap.get(p) ?? p) } : {}),
      hash: '',
    };
    next.hash = await hashVcsOpByVersion(next);
    const final = signed ? await resign!(next, op) : next;

    hashMap.set(op.hash, final.hash);
    out.push(final);
  }

  return { ops: out, hashMap };
}
