/**
 * Project attestation (ADR 0032 §4).
 *
 * A project self-attests by minting a `vcs:repoAttest` op signed with the
 * owner's Ed25519 key: "I, `identity:<did>`, created ledger `<repoId>` named
 * `<{owner}/{name}>`". Because the op is part of the causal chain, a clone can
 * verify ownership against the person's public key without trusting a URL.
 */
import type { VcsOp } from './types.js';
import { createVcsOp } from './ops.js';
import { signOp, verifyOp } from '../identity/signing-middleware.js';

export interface AttestationInput {
  /** Owner entity id (`identity:<did>`) — the person key. */
  owner: string;
  /** Repo slug scoped under the owner. */
  repoName: string;
  /** The ledger repoId this attestation covers. */
  repoId: string;
  /** Project kind (code, knowledge-base, notes, data, media, other). */
  kind?: string;
  /** Owner's Ed25519 private key (base64) for signing. */
  privateKey: string;
  agentId: string;
  /** Causal link — the last op in the chain. */
  previousHash?: string;
}

export interface AttestationTarget {
  owner: string;
  repoName: string;
  /**
   * Ledger repoId when already known (e.g. URL clone). Unknown for
   * identity-addressed clones — the human handle `{owner}/{repo}` is the
   * discriminator; repoId is discovered during the clone.
   */
  repoId?: string;
  /** Owner's public key (base64) to verify against. */
  publicKey: string;
}

/** Mint + sign a `vcs:repoAttest` op chained to the current tail. */
export async function createProjectAttestation(
  input: AttestationInput,
): Promise<VcsOp> {
  const op = await createVcsOp('vcs:repoAttest', {
    agentId: input.agentId,
    previousHash: input.previousHash,
    vcs: {
      repoOwner: input.owner,
      repoName: input.repoName,
      repoId: input.repoId,
      projectKind: input.kind,
    },
  });
  return signOp(op, input.privateKey, input.owner, 'root');
}

/** Find the repo-attestation op in an op list, if any. */
export function findAttestation(ops: VcsOp[]): VcsOp | null {
  for (const op of ops) {
    if (op.kind === 'vcs:repoAttest') return op;
  }
  return null;
}

/** True when the op is a `vcs:repoAttest` matching the expected owner/name. */
export function attestationMatches(
  op: VcsOp,
  expected: Pick<AttestationTarget, 'owner' | 'repoName' | 'repoId'>,
): boolean {
  return (
    op.vcs?.repoOwner === expected.owner &&
    op.vcs?.repoName === expected.repoName &&
    (expected.repoId ? op.vcs?.repoId === expected.repoId : true)
  );
}

/**
 * Verify a clone target's attestation: the ledger's attestation op must be
 * signed by the expected owner and cover this exact repo. Returns an error
 * message on failure, or null when verification passes.
 */
export async function verifyAttestation(
  ops: VcsOp[],
  expected: AttestationTarget,
): Promise<string | null> {
  const op = findAttestation(ops);
  if (!op) {
    return `Ledger has no repo-attestation op — refusing to trust a claim of ownership for ${expected.owner}/${expected.repoName}.`;
  }
  if (!attestationMatches(op, expected)) {
    return `Attestation mismatch: expected ${expected.owner}/${expected.repoName}${expected.repoId ? ` (${expected.repoId})` : ""}, op attests ${op.vcs?.repoOwner ?? "?"}/${op.vcs?.repoName ?? "?"} (${op.vcs?.repoId ?? "?"}).`;
  }
  const valid = await verifyOp(op, expected.publicKey);
  if (valid !== true) {
    return `Attestation signature is missing or invalid for ${expected.owner}/${expected.repoName}.`;
  }
  return null;
}

/** Parse a checkpoint JSONL body into ops (raw jsonl or `{checkpoint}` wrapper). */
export function parseCheckpointOps(body: string): VcsOp[] {
  let content = body;
  try {
    const parsed = JSON.parse(body) as { checkpoint?: string };
    if (typeof parsed.checkpoint === 'string') content = parsed.checkpoint;
  } catch {
    /* raw jsonl body */
  }
  const lines = content.split('\n').filter((l) => l.trim());
  return lines.map((l) => JSON.parse(l) as VcsOp);
}
