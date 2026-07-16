import { describe, test, expect } from 'vitest';
import { createIdentity } from '../../src/identity/identity.js';
import {
  signOp,
  verifyOp,
  verifyOpBatch,
  type IdentityResolver,
} from '../../src/identity/signing-middleware.js';
import { createVcsOp } from '../../src/vcs/ops.js';
import type { VcsOp } from '../../src/vcs/types.js';

// ---------------------------------------------------------------------------
// signOp / verifyOp
// ---------------------------------------------------------------------------

describe('signOp', () => {
  test('adds signature and signedBy to op', async () => {
    const id = createIdentity({ displayName: 'Alice' });
    const op = await createVcsOp('vcs:fileAdd', {
      agentId: id.entityId,
      vcs: { filePath: 'test.ts', contentHash: 'abc' },
    });

    await signOp(op, id.privateKey, id.entityId);

    expect(op.vcs!.signature).toBeDefined();
    expect(op.vcs!.signature!.length).toBeGreaterThan(0);
    expect(op.vcs!.signedBy).toBe(id.entityId);
  });

  test('signed op verifies with correct public key', async () => {
    const id = createIdentity({ displayName: 'Alice' });
    const op = await createVcsOp('vcs:fileAdd', {
      agentId: id.entityId,
      vcs: { filePath: 'test.ts', contentHash: 'abc' },
    });

    await signOp(op, id.privateKey, id.entityId);

    const result = await verifyOp(op, id.publicKey);
    expect(result).toBe(true);
  });

  test('signed op fails verification with wrong key', async () => {
    const alice = createIdentity({ displayName: 'Alice' });
    const bob = createIdentity({ displayName: 'Bob' });

    const op = await createVcsOp('vcs:fileAdd', {
      agentId: alice.entityId,
      vcs: { filePath: 'test.ts', contentHash: 'abc' },
    });

    await signOp(op, alice.privateKey, alice.entityId);

    const result = await verifyOp(op, bob.publicKey);
    expect(result).toBe(false);
  });

  test('unsigned op returns null from verifyOp', async () => {
    const op = await createVcsOp('vcs:fileAdd', {
      agentId: 'identity:anon',
      vcs: { filePath: 'test.ts', contentHash: 'abc' },
    });

    const result = await verifyOp(op, 'irrelevant');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// verifyOpBatch
// ---------------------------------------------------------------------------

describe('verifyOpBatch', () => {
  test('verifies a batch of signed ops', async () => {
    const alice = createIdentity({ displayName: 'Alice' });

    const resolver: IdentityResolver = {
      resolvePublicKey(entityId: string) {
        if (entityId === alice.entityId) return alice.publicKey;
        return null;
      },
    };

    const ops: VcsOp[] = [];
    for (let i = 0; i < 3; i++) {
      const op = await createVcsOp('vcs:fileAdd', {
        agentId: alice.entityId,
        previousHash: ops[i - 1]?.hash,
        vcs: { filePath: `file${i}.ts`, contentHash: `hash${i}` },
      });
      await signOp(op, alice.privateKey, alice.entityId);
      ops.push(op);
    }

    const results = await verifyOpBatch(ops, resolver);
    expect(results.length).toBe(3);
    expect(results.every((r) => r.valid)).toBe(true);
  });

  test('reports unknown identity', async () => {
    const alice = createIdentity({ displayName: 'Alice' });

    const resolver: IdentityResolver = {
      resolvePublicKey() {
        return null; // Can't resolve anyone
      },
    };

    const op = await createVcsOp('vcs:fileAdd', {
      agentId: alice.entityId,
      vcs: { filePath: 'test.ts', contentHash: 'abc' },
    });
    await signOp(op, alice.privateKey, alice.entityId);

    const results = await verifyOpBatch([op], resolver);
    expect(results.length).toBe(1);
    expect(results[0].valid).toBe(false);
    expect(results[0].reason).toContain('Unknown identity');
  });

  test('skips unsigned ops', async () => {
    const resolver: IdentityResolver = {
      resolvePublicKey() { return null; },
    };

    const op = await createVcsOp('vcs:fileAdd', {
      agentId: 'identity:anon',
      vcs: { filePath: 'test.ts', contentHash: 'abc' },
    });

    const results = await verifyOpBatch([op], resolver);
    expect(results.length).toBe(0);
  });
});
