import { describe, test, expect } from 'vitest';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

import { SqliteKernelBackend } from '../../src/core/persist/sqlite-backend.js';
import type { KernelOp } from '../../src/core/persist/backend.js';
import { createSqliteLocalOpsReader } from '../../src/sync/sqlite-ops-reader.js';
import { SyncEngine } from '../../src/sync/sync-engine.js';
import type { VcsOp } from '../../src/vcs/types.js';
import type { SyncMessage } from '../../src/sync/types.js';
import { PROTOCOL_VERSION } from '../../src/sync/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mkOp(i: number): KernelOp {
  return {
    hash: `h${String(i).padStart(8, '0')}`,
    kind: 'vcs:fileModify',
    timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
    agentId: 'bench',
    previousHash: i > 0 ? `h${String(i - 1).padStart(8, '0')}` : undefined,
  } as unknown as KernelOp;
}

/** Capturing inbound transport for the responder engine. */
class CaptureTransport implements SyncTransport {
  sent: SyncMessage[] = [];
  private handler?: (msg: SyncMessage) => void | Promise<void>;
  onMessage(handler: (msg: SyncMessage) => void | Promise<void>): void {
    this.handler = handler;
  }
  send(_peerId: string, message: SyncMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
  peers(): string[] {
    return ['peer-a'];
  }
  dispatch(msg: SyncMessage): Promise<void> {
    return this.handler ? Promise.resolve(this.handler(msg)) : Promise.resolve();
  }
}

/** Ask a sync engine for ops after `afterHash`; return sent `ops` payload length. */
async function wantTail(
  engine: SyncEngine,
  transport: CaptureTransport,
  afterHash: string,
): Promise<number> {
  transport.sent = [];
  await transport.dispatch({
    version: PROTOCOL_VERSION,
    type: 'want',
    peerId: 'peer-a',
    wantHashes: [],
    afterHash,
  } as SyncMessage);
  const opsMsg = transport.sent.find((m) => m.type === 'ops');
  return opsMsg ? (opsMsg as unknown as { ops: unknown[] }).ops.length : -1;
}

// ---------------------------------------------------------------------------
// TRL-20 peer wiring: bounded sqlite reader across the message path
// ---------------------------------------------------------------------------

describe('TRL-20 peer wiring: bounded reader across the msg path', () => {
  test('want for a mid-log tail returns the same window with array vs reader', async () => {
    const n = 10_000;
    const ops = Array.from({ length: n }, (_, i) => mkOp(i));
    const dir = join(tmpdir(), `trl20-peer-${randomUUID()}.sqlite`);
    const db = new SqliteKernelBackend(dir);
    db.init();
    db.appendBatch(ops);
    const reader = createSqliteLocalOpsReader(db);

    // Control reader: array-backed from the same corpus.
    const arrayReader = {
      count: () => ops.length,
      lastOp: () => (ops.length ? (ops[ops.length - 1] as unknown as VcsOp) : undefined),
      has: (h: string) => ops.some((o) => o.hash === h),
      opsAfter: (h: string) => {
        const idx = ops.findIndex((o) => o.hash === h);
        return (idx >= 0 ? ops.slice(idx + 1) : ops) as unknown as VcsOp[];
      },
      getOpAtIndex: (i: number) => ops[i] as unknown as VcsOp | undefined,
      all: () => ops as unknown as VcsOp[],
    };

    const cursor = ops[9998].hash;
    const syncArray = new SyncEngine({
      localPeerId: 'peer-b',
      transport: new CaptureTransport(),
      getLocalOps: () => ops as unknown as VcsOp[],
      opsReader: arrayReader,
      onOpsReceived: async () => ({}),
    });
    const syncReader = new SyncEngine({
      localPeerId: 'peer-b',
      transport: new CaptureTransport(),
      getLocalOps: () => db.readAll() as unknown as VcsOp[],
      opsReader: reader,
      onOpsReceived: async () => ({}),
    });

    const arrayTrans = (syncArray as unknown as { transport: CaptureTransport }).transport;
    const readerTrans = (syncReader as unknown as { transport: CaptureTransport }).transport;

    const arrayTail = await wantTail(syncArray, arrayTrans, cursor);
    const readerTail = await wantTail(syncReader, readerTrans, cursor);
    expect(arrayTail).toBe(1);
    expect(readerTail).toBe(arrayTail);

    db.close();
    rmSync(dir, { force: true });
  });
});