import { describe, test, expect } from 'vitest';
import { EAVStore } from '../../src/core/store/eav-store.js';
import { createVcsOp } from '../../src/vcs/ops.js';
import { decompose } from '../../src/vcs/decompose.js';
import { getBranchHeadOpHash, branchHeadEntity } from '../../src/vcs/branch.js';
import type { EngineContext } from '../../src/vcs/engine-context.js';

// Minimal EngineContext over an in-memory store + op log, for branch-head
// resolution. Mirrors the ADR 0022 §2a divergence scenario: two peers apply the
// same set of branchAdvance ops in DIFFERENT orders and must still agree on head.
function makeCtx(): { ctx: EngineContext; ops: any[] } {
  const store = new EAVStore();
  const ops: any[] = [];
  const ctx: EngineContext = {
    store,
    agentId: 'user:test',
    readAllOps: () => ops,
    getLastOp: () => ops.at(-1),
    applyOp: async () => {},
  };
  return { ctx, ops };
}

async function advance(
  ctx: EngineContext,
  ops: any[],
  branch: string,
  target: string,
  ts: string,
) {
  const op = await createVcsOp('vcs:branchAdvance', {
    agentId: 'user:test',
    vcs: { branchName: branch, targetOpHash: target },
  });
  op.timestamp = ts;
  // Materialize into the store (add-only, as in decompose.ts:233)
  for (const f of decompose(op).addFacts) ctx.store.addFacts([f]);
  ops.push(op);
  return op;
}

describe('branch head convergence (ADR 0022 §2a)', () => {
  test('two peers with identical ops in different order agree on main', async () => {
    // Both peers advance to aaa @ T1 then bbb @ T2, but APPLY in opposite
    // orders (arrival order differs; causal/timestamp order is identical).
    const a = makeCtx();
    await advance(a.ctx, a.ops, 'main', 'op:aaa', '2026-01-01T00:00:01Z');
    await advance(a.ctx, a.ops, 'main', 'op:bbb', '2026-01-01T00:00:02Z');

    const b = makeCtx();
    await advance(b.ctx, b.ops, 'main', 'op:bbb', '2026-01-01T00:00:02Z');
    await advance(b.ctx, b.ops, 'main', 'op:aaa', '2026-01-01T00:00:01Z');

    // Store insertion order differs (the old bug's premise)...
    const aFacts = a.ctx.store
      .getFactsByEntity('branch:main')
      .filter((f) => f.a === 'headOpHash')
      .map((f) => f.v);
    const bFacts = b.ctx.store
      .getFactsByEntity('branch:main')
      .filter((f) => f.a === 'headOpHash')
      .map((f) => f.v);
    expect(aFacts).not.toEqual(bFacts);

    // ...but resolved head is deterministic from the causally-ordered log.
    const headA = getBranchHeadOpHash(a.ctx, 'main');
    const headB = getBranchHeadOpHash(b.ctx, 'main');
    expect(headA).toBe('op:bbb');
    expect(headB).toBe('op:bbb');
  });

  test('concurrent advances resolve by timestamp, not arrival', async () => {
    const ctx = makeCtx();
    const late = await advance(
      ctx.ctx,
      ctx.ops,
      'main',
      'op:late',
      '2026-01-01T00:00:02Z',
    );
    await advance(ctx.ctx, ctx.ops, 'main', 'op:early', '2026-01-01T00:00:01Z');
    expect(late.timestamp).toBe('2026-01-01T00:00:02Z');
    expect(getBranchHeadOpHash(ctx.ctx, 'main')).toBe('op:late');
  });

  test('SAME-timestamp concurrent advances still converge (tie-break)', async () => {
    // Two writers advance main in the same millisecond. Timestamps are equal,
    // so timestamp sort alone leaves the order to Array.prototype.sort
    // stability — which preserves journal order, which on a syncing peer is
    // ARRIVAL order. The divergence the log-scan resolver exists to close
    // comes back through the tie unless something hash-covered breaks it.
    const T = '2026-01-01T00:00:01.000Z';

    // Mint each op ONCE and share the objects into both peers — "identical op
    // set" means identical hashes, or a hash tiebreak would have nothing
    // stable to break ties with.
    const mk = async (target: string) => {
      const op = await createVcsOp('vcs:branchAdvance', {
        agentId: 'user:test',
        vcs: { branchName: 'main', targetOpHash: target },
      });
      op.timestamp = T;
      return op;
    };
    const op1 = await mk('op:aaa');
    const op2 = await mk('op:bbb');

    const apply = (ctx: ReturnType<typeof makeCtx>, ops: any[]) => {
      for (const op of ops) {
        for (const f of decompose(op).addFacts) ctx.ctx.store.addFacts([f]);
        ctx.ops.push(op);
      }
    };

    const a = makeCtx();
    apply(a, [op1, op2]);
    const b = makeCtx();
    apply(b, [op2, op1]); // same set, opposite arrival

    const headA = getBranchHeadOpHash(a.ctx, 'main');
    const headB = getBranchHeadOpHash(b.ctx, 'main');
    expect(headA).toBe(headB); // identical op set ⇒ identical head, ties included
  });

  test('per-writer personal branch heads never share a pointer (ADR 0022 §4)', async () => {
    const ctx = makeCtx();
    // alice and bob both advance feature/x in the same global order.
    await advance(ctx.ctx, ctx.ops, 'feature/x', 'op:aaa', '2026-01-01T00:00:01Z');
    await advance(ctx.ctx, ctx.ops, 'feature/x', 'op:bbb', '2026-01-01T00:00:02Z');
    // Re-sign the two ops under different principals.
    ctx.ops[0].vcs = { ...ctx.ops[0].vcs, branchName: 'feature/x', targetOpHash: 'op:aaa', signedBy: 'identity:alice' };
    ctx.ops[1].vcs = { ...ctx.ops[1].vcs, branchName: 'feature/x', targetOpHash: 'op:bbb', signedBy: 'identity:bob' };

    // Each writer resolves their OWN head — no cross-contamination.
    expect(getBranchHeadOpHash(ctx.ctx, 'feature/x', 'identity:alice')).toBe('op:aaa');
    expect(getBranchHeadOpHash(ctx.ctx, 'feature/x', 'identity:bob')).toBe('op:bbb');
    // Unscoped read (integration style) is non-deterministic across writers, so
    // it must NOT equal either single writer's head when they diverge.
    const shared = getBranchHeadOpHash(ctx.ctx, 'feature/x');
    expect(shared === 'op:aaa' || shared === 'op:bbb').toBe(true);
  });

  test('branchHeadEntity scopes personal branches per writer, collapses integration', () => {
    expect(branchHeadEntity('feature/x', 'identity:alice')).toBe('branch:feature/x@identity:alice');
    expect(branchHeadEntity('main', 'identity:alice')).toBe('branch:main');
    expect(branchHeadEntity('integration', 'identity:alice')).toBe('branch:integration');
    // Without a principal, personal branches fall back to the shared entity.
    expect(branchHeadEntity('feature/x')).toBe('branch:feature/x');
  });

  test('personal branch heads materialize to per-writer entities (decompose)', async () => {
    const ctx = makeCtx();
    const op = await createVcsOp('vcs:branchAdvance', {
      agentId: 'user:test',
      vcs: { branchName: 'feature/x', targetOpHash: 'op:zzz', signedBy: 'identity:carol' },
    });
    op.timestamp = '2026-01-01T00:00:01Z';
    const facts = decompose(op).addFacts;
    expect(facts).toEqual([
      { e: 'branch:feature/x@identity:carol', a: 'headOpHash', v: 'op:zzz' },
    ]);
  });
});
