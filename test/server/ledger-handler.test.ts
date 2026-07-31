import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LedgerStore } from '../../src/server/ledger-store.js';
import { createLedgerFetchHandler } from '../../src/server/ledger-handler.js';
import type { VcsOp } from '../../src/vcs/types.js';

function sampleOp(suffix: string): VcsOp {
  return {
    kind: 'vcs:test',
    hash: `trellis:op:${suffix.padEnd(64, 'b')}`,
    timestamp: '2026-07-21T00:00:00.000Z',
    agentId: 'agent:test',
  };
}

function checkpointBody(ops: VcsOp[]): string {
  return ops.map((o) => JSON.stringify(o)).join('\n') + '\n';
}

describe('ledger handler', () => {
  let store: LedgerStore;
  let fetchHandler: (req: Request) => Promise<Response>;
  let tmp: string;
  const repoId = 'repo-test';
  const apiKey = 'test-key';

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'ledger-store-'));
    store = new LedgerStore(tmp);
    fetchHandler = createLedgerFetchHandler({ store, apiKey });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function authHeaders(): HeadersInit {
    return { authorization: `Bearer ${apiKey}` };
  }

  it('push acks tail and stores checkpoint', async () => {
    const op = sampleOp('1');
    const checkpoint = checkpointBody([op]);
    const res = await fetchHandler(
      new Request('http://127.0.0.1/v0/ledger/push', {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({
          repoId,
          previousTail: '',
          tailHash: op.hash,
          format: 'jsonl',
          byteLength: Buffer.byteLength(checkpoint, 'utf-8'),
          lineCount: 1,
          checkpoint,
        }),
      }),
    );
    expect(res.status).toBe(200);

    const tailRes = await fetchHandler(
      new Request(`http://127.0.0.1/v0/ledger/tail?repoId=${repoId}`, {
        headers: authHeaders(),
      }),
    );
    expect(tailRes.status).toBe(200);
    const tail = (await tailRes.json()) as { tailHash: string };
    expect(tail.tailHash).toBe(op.hash);
  });

  it('mismatch returns 409 when previousTail wrong', async () => {
    const op1 = sampleOp('2');
    const op2 = sampleOp('3');
    const first = checkpointBody([op1]);
    await fetchHandler(
      new Request('http://127.0.0.1/v0/ledger/push', {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({
          repoId,
          tailHash: op1.hash,
          checkpoint: first,
          format: 'jsonl',
          byteLength: Buffer.byteLength(first, 'utf-8'),
          lineCount: 1,
        }),
      }),
    );

    const second = checkpointBody([op1, op2]);
    const res = await fetchHandler(
      new Request('http://127.0.0.1/v0/ledger/push', {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({
          repoId,
          previousTail: sampleOp('wrong').hash,
          tailHash: op2.hash,
          checkpoint: second,
          format: 'jsonl',
          byteLength: Buffer.byteLength(second, 'utf-8'),
          lineCount: 2,
        }),
      }),
    );
    expect(res.status).toBe(409);
  });

  it('restore pulls checkpoint bytes by tail hash', async () => {
    const op = sampleOp('4');
    const checkpoint = checkpointBody([op]);
    await fetchHandler(
      new Request('http://127.0.0.1/v0/ledger/push', {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({
          repoId,
          tailHash: op.hash,
          checkpoint,
          format: 'jsonl',
          byteLength: Buffer.byteLength(checkpoint, 'utf-8'),
          lineCount: 1,
        }),
      }),
    );

    const res = await fetchHandler(
      new Request(
        `http://127.0.0.1/v0/ledger/checkpoints/${encodeURIComponent(op.hash)}`,
        { headers: authHeaders() },
      ),
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(checkpoint);
  });

  it('repos endpoint lists hosted ledgers', async () => {
    const op = sampleOp('5');
    const checkpoint = checkpointBody([op]);
    await fetchHandler(
      new Request('http://127.0.0.1/v0/ledger/push', {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({
          repoId,
          tailHash: op.hash,
          checkpoint,
          format: 'jsonl',
          byteLength: Buffer.byteLength(checkpoint, 'utf-8'),
          lineCount: 1,
        }),
      }),
    );

    const res = await fetchHandler(
      new Request('http://127.0.0.1/v0/ledger/repos', {
        headers: authHeaders(),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      repoId: string;
      tailHash: string;
      lineCount: number;
    }[];
    expect(body.length).toBe(1);
    expect(body[0]!.repoId).toBe(repoId);
    expect(body[0]!.tailHash).toBe(op.hash);
    expect(body[0]!.lineCount).toBe(1);
  });

  it('repos endpoint requires auth when key set', async () => {
    const res = await fetchHandler(
      new Request('http://127.0.0.1/v0/ledger/repos'),
    );
    expect(res.status).toBe(401);
  });
});
