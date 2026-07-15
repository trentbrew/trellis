/**
 * VcsOp provenance (ADR 0021 §5).
 *
 * CLI graph writes mint `VcsOp`s into `ops.json`, not `KernelOp`s, so the
 * kernel's provenance never covered them. Rather than reroute the CLI through
 * the kernel — which would mean abandoning the journal, lanes and milestones —
 * provenance rides inside the `vcs` payload.
 *
 * That placement is the whole trick: `hashVcsOp` hashes `vcs` wholesale, so
 * provenance is covered by the op hash with **no preimage change and no
 * migration**. Ops minted before the field existed still verify, because
 * `JSON.stringify` omits the absent key.
 */
import { describe, it, expect } from 'vitest';
import { createVcsOp, hashVcsOp, verifyVcsOpHash } from '../../src/vcs/ops.js';
import { PROVENANCE } from '../../src/core/persist/canonical-op.js';
import type { VcsOp } from '../../src/vcs/types.js';

const facts = [{ e: 'person:ada', a: 'name', v: 'Ada' }];

describe('VcsOp provenance', () => {
  it('is covered by the op hash', async () => {
    const op = await createVcsOp('vcs:storeAssert', {
      agentId: 'agent:test',
      vcs: { facts, provenance: PROVENANCE.cli },
    });

    expect(op.vcs?.provenance).toEqual({ actorType: 'user', origin: 'cli' });
    expect(await verifyVcsOpHash(op)).toBe(true);
  });

  it('rejects a forged origin', async () => {
    const op = await createVcsOp('vcs:storeAssert', {
      agentId: 'agent:test',
      vcs: { facts, provenance: PROVENANCE.cli },
    });
    const forged: VcsOp = {
      ...op,
      vcs: { ...op.vcs, provenance: PROVENANCE.mcp },
    };

    // Provenance that can be altered without invalidating the hash is
    // decoration, not provenance.
    expect(await verifyVcsOpHash(forged)).toBe(false);
  });

  it('rejects a stripped provenance', async () => {
    const op = await createVcsOp('vcs:storeAssert', {
      agentId: 'agent:test',
      vcs: { facts, provenance: PROVENANCE.cli },
    });
    const stripped: VcsOp = { ...op, vcs: { facts } };

    expect(await verifyVcsOpHash(stripped)).toBe(false);
  });

  it('distinguishes cli from mcp for an otherwise identical op', async () => {
    const base = {
      kind: 'vcs:storeAssert' as const,
      timestamp: '2026-07-14T00:00:00.000Z',
      agentId: 'agent:test',
      previousHash: undefined,
    };

    const asCli = await hashVcsOp({ ...base, vcs: { facts, provenance: PROVENANCE.cli } });
    const asMcp = await hashVcsOp({ ...base, vcs: { facts, provenance: PROVENANCE.mcp } });

    expect(asCli).not.toBe(asMcp);
  });

  // The migration property — this is why provenance went inside `vcs`.
  it('leaves pre-provenance ops verifying unchanged', async () => {
    const legacy = await createVcsOp('vcs:storeAssert', {
      agentId: 'agent:test',
      vcs: { facts },
    });

    expect(legacy.vcs?.provenance).toBeUndefined();
    expect(await verifyVcsOpHash(legacy)).toBe(true);
  });

  it('hashes an absent provenance identically to an omitted key', async () => {
    // Engines without a provenance pass `provenance: undefined`; that must not
    // change the digest, or every legacy journal would fail verification.
    const base = {
      kind: 'vcs:storeAssert' as const,
      timestamp: '2026-07-14T00:00:00.000Z',
      agentId: 'agent:test',
      previousHash: undefined,
    };

    const omitted = await hashVcsOp({ ...base, vcs: { facts } });
    const explicitUndefined = await hashVcsOp({
      ...base,
      vcs: { facts, provenance: undefined },
    });

    expect(omitted).toBe(explicitUndefined);
  });
});
