/**
 * Iroh ↔ TrellisVcsSyncPeer integration test.
 *
 * Two engines, two Iroh transports, one sync session.
 * Verifies ops flow through the real have→want→ops→ack protocol over QUIC.
 */

import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { IrohSyncTransport } from '../../src/sync/iroh-transport.js';
import { TrellisVcsSyncPeer } from '../../src/sync/vcs-sync-peer.js';
import { TrellisVcsEngine } from '../../src/engine.js';

const TEST_ROOT = '/tmp/trellis-iroh-integration';

async function initPeer(
  name: string,
): Promise<{ engine: TrellisVcsEngine; rootPath: string }> {
  const rootPath = join(TEST_ROOT, name);
  mkdirSync(rootPath, { recursive: true });
  const engine = new TrellisVcsEngine({
    rootPath,
    agentId: `agent:${name}`,
  });
  await engine.initRepo();
  return { engine, rootPath };
}

async function main() {
  // Clean slate
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true, force: true });

  try {
    console.log('=== Initializing peers ===');

    // Peer A (sender)
    const peerA = await initPeer('peer-a');
    console.log(`  A: ${peerA.engine.getOpCount()} ops`);

    // Peer B (receiver)
    const peerB = await initPeer('peer-b');
    console.log(`  B: ${peerB.engine.getOpCount()} ops`);

    // Create some issues on A
    console.log('\n=== Creating 5 issues on A ===');
    for (let i = 0; i < 5; i++) {
      await peerA.engine.createIssue(`Issue ${i + 1}`, { laneId: 'lane-a' });
    }
    console.log(`  A: ${peerA.engine.getOpCount()} ops`);
    console.log(`  B: ${peerB.engine.getOpCount()} ops`);

    // Create Iroh transports
    console.log('\n=== Setting up Iroh transports ===');
    const transportB = await IrohSyncTransport.create();
    const ticketB = transportB.ticket();
    console.log(`  B online, ticket: ${ticketB.slice(0, 50)}...`);

    const transportA = await IrohSyncTransport.create();
    console.log(`  A online, id: ${transportA.localId().slice(0, 16)}...`);

    // Both peers know each other's tickets (bidirectional)
    await transportA.connectToPeer(ticketB, transportB.localId(), 'peer-b');
    await transportB.connectToPeer(transportA.ticket(), transportA.localId(), 'peer-a');

    // Wrap in TrellisVcsSyncPeer
    const syncA = new TrellisVcsSyncPeer({
      peerId: transportA.localId(),
      engine: peerA.engine,
      transport: transportA,
      onIntegrate: (result) => {
        console.log(`  [A] integrated: ${result.applied} applied, ${result.rejected.length} rejected`);
      },
    });

    const syncB = new TrellisVcsSyncPeer({
      peerId: transportB.localId(),
      engine: peerB.engine,
      transport: transportB,
      onIntegrate: (result) => {
        console.log(`  [B] integrated: ${result.applied} applied, ${result.rejected.length} rejected`);
      },
    });

    // Sync A → B
    console.log('\n=== Syncing A → B ===');

    // pushTo/pullAllFrom fire-and-forget over Iroh; wait for B to receive ops
    const syncPromise = syncA.syncWith(transportB.localId());

    // Wait for B to catch up (or timeout)
    const target = peerA.engine.getOpCount();
    const deadline = Date.now() + 15000;
    while (peerB.engine.getOpCount() < target && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100));
    }

    const result = await syncPromise;
    console.log(`  Result: ${result.applied} applied, ${result.skipped} skipped, ${result.rejected} rejected`);
    console.log(`  A: ${peerA.engine.getOpCount()} ops`);
    console.log(`  B: ${peerB.engine.getOpCount()} ops`);

    // Verify
    console.log('\n=== Verification ===');
    const issuesB = peerB.engine.listIssues();
    console.log(`  B sees ${issuesB.length} issues:`);
    for (const issue of issuesB) {
      console.log(`    - ${issue.title}`);
    }

    if (peerB.engine.getOpCount() === peerA.engine.getOpCount()) {
      console.log('\n✅ PASS — ops synced successfully over Iroh');
    } else {
      console.log(`\n❌ FAIL — A has ${peerA.engine.getOpCount()} ops, B has ${peerB.engine.getOpCount()} ops`);
      process.exit(1);
    }

    // Cleanup
    await transportA.close();
    await transportB.close();
  } finally {
    if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
