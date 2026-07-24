import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LedgerStore } from '../../src/server/ledger-store.js';
import { startLedgerServer } from '../../src/server/ledger-handler.js';
import type { TrellisHttpServer } from '../../src/server/server-shared.js';
import {
  addRemote,
  defaultFetchTransport,
  installPulledOps,
  pullRemoteLedger,
  pushRemoteLedger,
  readJournalMeta,
  writeRemoteSecrets,
} from '../../src/vcs/oplog-remote.js';
import type { VcsOp } from '../../src/vcs/types.js';

function sampleOp(suffix: string): VcsOp {
  return {
    kind: 'vcs:test',
    hash: `trellis:op:${suffix.padEnd(64, 'c')}`,
    timestamp: '2026-07-21T00:00:00.000Z',
    agentId: 'agent:test',
  };
}

describe('ledger integration', () => {
  let server: TrellisHttpServer;
  let storeDir: string;
  let repoRoot: string;
  let baseUrl: string;
  const apiKey = 'integration-key';
  const repoId = 'integration-repo';

  beforeAll(async () => {
    storeDir = mkdtempSync(join(tmpdir(), 'ledger-int-'));
    repoRoot = mkdtempSync(join(tmpdir(), 'ledger-repo-'));
    mkdirSync(join(repoRoot, '.trellis'), { recursive: true });

    const store = new LedgerStore(storeDir);
    server = await startLedgerServer({ store, apiKey, port: 0 });
    baseUrl = `http://127.0.0.1:${server.port}`;

    addRemote(repoRoot, baseUrl, { repoId, apiKey });
    writeRemoteSecrets(repoRoot, { apiKey });
    process.env.TRELLIS_REMOTE_KEY = apiKey;
  });

  afterAll(async () => {
    delete process.env.TRELLIS_REMOTE_KEY;
    if (server) await server.stop(true);
    rmSync(storeDir, { recursive: true, force: true });
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('roundtrip push wipe pull install restores tail', async () => {
    const op = sampleOp('1');
    const opsPath = join(repoRoot, '.trellis', 'ops.json');
    writeFileSync(opsPath, JSON.stringify(op) + '\n');
    const tailBefore = op.hash;

    const transport = defaultFetchTransport();
    const push = await pushRemoteLedger(repoRoot, transport);
    expect(push.pushed).toBe(true);
    expect(push.tailHash).toBe(tailBefore);

    writeFileSync(opsPath, '[]\n');

    const pulled = await pullRemoteLedger(repoRoot, transport);
    expect(pulled.tailHash).toBe(tailBefore);

    installPulledOps(repoRoot, { from: pulled.path });
    const meta = readJournalMeta(opsPath);
    expect(meta?.tailHash).toBe(tailBefore);
  });
});
