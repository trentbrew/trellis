/**
 * VCS Operation Constructors
 *
 * Helpers to create content-addressed VcsOps with proper
 * causality chaining and metadata.
 *
 * Two envelope generations:
 *   - v1 (default): linear `previousHash` chain; no `v` key in the preimage.
 *   - v2 (freeze, docs/spec/JOURNAL-FORMAT.md §6): `parents[]` DAG; the
 *     preimage carries `v: 2` and always includes `parents` (`[]` for roots).
 *
 * The version travels with the op — `verifyVcsOpHash` and the signing paths
 * dispatch on `op.v`, so v1 ops keep verifying byte-for-byte.
 */

import type { VcsOp, VcsOpKind, VcsPayload } from './types.js';

type VcsOpHashInput = Pick<
  VcsOp,
  'kind' | 'timestamp' | 'agentId' | 'previousHash' | 'vcs'
>;

type VcsOpV2HashInput = Pick<
  VcsOp,
  'kind' | 'timestamp' | 'agentId' | 'parents' | 'vcs'
>;

async function sha256Hex(content: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes the content-addressed hash for a VCS op body (v1 envelope).
 */
export async function hashVcsOp(op: VcsOpHashInput): Promise<string> {
  // Hash covers the full op body except the hash field itself.
  const content = JSON.stringify({
    kind: op.kind,
    timestamp: op.timestamp,
    agentId: op.agentId,
    previousHash: op.previousHash,
    vcs: op.vcs,
  });
  return `trellis:op:${await sha256Hex(content)}`;
}

/**
 * Computes the content-addressed hash for a v2 journal op.
 *
 * Preimage (docs/spec/JOURNAL-FORMAT.md §6): `{v: 2, kind, timestamp, agentId,
 * parents, vcs}` — `parents` is always present, `[]` for a root.
 */
export async function hashVcsOpV2(op: VcsOpV2HashInput): Promise<string> {
  const content = JSON.stringify({
    v: 2,
    kind: op.kind,
    timestamp: op.timestamp,
    agentId: op.agentId,
    parents: op.parents ?? [],
    vcs: op.vcs,
  });
  return `trellis:op:${await sha256Hex(content)}`;
}

/**
 * Version-dispatching hash: v2 ops hash with the parents preimage; everything
 * else stays byte-compatible with v1.
 */
export async function hashVcsOpByVersion(
  op: VcsOpHashInput & { v?: number; parents?: string[] },
): Promise<string> {
  return op.v === 2 ? hashVcsOpV2(op) : hashVcsOp(op);
}

/**
 * Verifies that a VCS op's hash matches its immutable body (any version).
 */
export async function verifyVcsOpHash(op: VcsOp): Promise<boolean> {
  return op.hash === (await hashVcsOpByVersion(op));
}

/**
 * Creates a v1 VcsOp with full metadata, hash, and causal chain link.
 */
export async function createVcsOp(
  kind: VcsOpKind,
  params: {
    agentId: string;
    previousHash?: string;
    vcs: VcsPayload;
  },
): Promise<VcsOp> {
  const opBase = {
    kind,
    timestamp: new Date().toISOString(),
    agentId: params.agentId,
    previousHash: params.previousHash,
    vcs: params.vcs,
  };

  return {
    ...opBase,
    hash: await hashVcsOp(opBase),
  };
}

/**
 * Creates a v2 VcsOp with `parents[]` (DAG) causality.
 *
 * Sign with `signOp` from `src/identity/signing-middleware.ts` — it dispatches
 * on `op.v` and signs the v2 body preimage.
 */
export async function createVcsOpV2(
  kind: VcsOpKind,
  params: {
    agentId: string;
    parents?: string[];
    vcs?: VcsPayload;
  },
): Promise<VcsOp> {
  const opBase = {
    v: 2,
    kind,
    timestamp: new Date().toISOString(),
    agentId: params.agentId,
    parents: params.parents ?? [],
    vcs: params.vcs,
  };

  return {
    ...opBase,
    hash: await hashVcsOpV2(opBase),
  };
}

/**
 * Checks whether a KernelOp is a VcsOp (has a vcs payload).
 */
export function isVcsOp(op: { kind: string; vcs?: unknown }): op is VcsOp {
  return (
    op.vcs !== undefined ||
    (typeof op.kind === 'string' && op.kind.startsWith('vcs:'))
  );
}

/**
 * Checks whether an op kind is a VCS kind.
 */
export function isVcsOpKind(kind: string): kind is VcsOpKind {
  return kind.startsWith('vcs:');
}
