import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JsonOpLog } from '../../src/vcs/op-log.js';
import {
  addRemote,
  getDefaultRemote,
  installPulledOps,
  MemoryRemoteSprite,
  pullRemoteLedger,
  pushRemoteLedger,
  readJournalMeta,
  remoteStatus,
  writeRemoteConfig,
} from '../../src/vcs/oplog-remote.js';
import type { VcsOp } from '../../src/vcs/types.js';

function sampleOp(hashSuffix: string): VcsOp {
  return {
    kind: 'vcs:test',
    hash: `trellis:op:${hashSuffix.padEnd(64, 'a')}`,
    timestamp: '2026-07-21T00:00:00.000Z',
    agentId: 'agent:test',
  };
}

function writeOps(root: string, ops: VcsOp[]): string {
  const opsPath = join(root, '.trellis', 'ops.json');
  mkdirSync(join(root, '.trellis'), { recursive: true });
  const body = ops.map((o) => JSON.stringify(o)).join('\n') + '\n';
  writeFileSync(opsPath, body);
  return opsPath;
}

describe('oplog remote sprite peer', () => {
  let root: string;
  let sprite: MemoryRemoteSprite;
  let repoId: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'remote-repo-'));
    sprite = new MemoryRemoteSprite();
    repoId = 'test-repo-id';
    addRemote(root, 'http://sprite.test', { repoId });
  });

  afterEach(() => {
    delete process.env.TRELLIS_I_KNOW;
  });

  it('push acks tail and records lastAckHash in config', async () => {
    const op = sampleOp('1');
    writeOps(root, [op]);
    const meta = readJournalMeta(join(root, '.trellis', 'ops.json'));
    expect(meta?.tailHash).toBe(op.hash);

    const result = await pushRemoteLedger(root, sprite);
    expect(result.pushed).toBe(true);
    expect(result.tailHash).toBe(op.hash);

    const peer = getDefaultRemote(root);
    expect(peer?.lastAckHash).toBe(op.hash);
    expect(peer?.lastAckAt).toBeTruthy();
  });

  it('restore after wipe returns identical tail hash via pull + install', async () => {
    const op = sampleOp('2');
    const opsPath = writeOps(root, [op]);
    const tailBefore = op.hash;

    await pushRemoteLedger(root, sprite);

    writeFileSync(opsPath, '[]\n');

    const pulled = await pullRemoteLedger(root, sprite);
    expect(pulled.tailHash).toBe(tailBefore);

    installPulledOps(root, { from: pulled.path });
    const meta = readJournalMeta(opsPath);
    expect(meta?.tailHash).toBe(tailBefore);
  });

  it('status reports diverged when mock remote is ahead', async () => {
    const localOp = sampleOp('3');
    const remoteOp = sampleOp('9');
    writeOps(root, [localOp]);

    const checkpoint =
      JSON.stringify(remoteOp) +
      '\n' +
      JSON.stringify({
        ...sampleOp('8'),
        previousHash: remoteOp.hash,
      }) +
      '\n';
    sprite.seedRemote(repoId, {
      format: 'jsonl',
      tailHash: remoteOp.hash,
      byteLength: Buffer.byteLength(checkpoint, 'utf-8'),
      lineCount: 2,
    }, checkpoint);

    const status = await remoteStatus(root, sprite);
    expect(status.local?.tailHash).toBe(localOp.hash);
    expect(status.remote?.tailHash).toBe(remoteOp.hash);
    expect(status.synced).toBe(false);
    expect(status.diverged).toBe(true);
  });

  it('repair-gate refuses truncate without recent remote ack', () => {
    const op = sampleOp('4');
    const opsPath = writeOps(root, [op]);
    writeRemoteConfig(root, {
      default: {
        url: 'http://sprite.test',
        repoId,
        lastAckAt: '2020-01-01T00:00:00.000Z',
        lastAckHash: op.hash,
      },
    });

    writeFileSync(opsPath, JSON.stringify(op) + '\n{bad\n');

    expect(() => JsonOpLog.repair(opsPath, { rootPath: root })).toThrow(
      /remote ack/i,
    );

    writeRemoteConfig(root, {
      default: {
        url: 'http://sprite.test',
        repoId,
        lastAckAt: new Date().toISOString(),
        lastAckHash: op.hash,
      },
    });

    expect(() => JsonOpLog.repair(opsPath, { rootPath: root })).toThrow(
      /confirm-destructive/i,
    );

    expect(() =>
      JsonOpLog.repair(opsPath, {
        confirmDestructive: true,
        rootPath: root,
      }),
    ).not.toThrow();
  });
});
