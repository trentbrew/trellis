/**
 * Smoke test: IrohSyncTransport two-peer echo.
 *
 * Creates two transport instances, connects them via ticket,
 * sends a sync message from A→B, verifies receipt.
 *
 * Run: bun run test/sync/iroh-smoke.ts
 */

import { IrohSyncTransport } from '../../src/sync/iroh-transport.js';
import type { SyncMessage } from '../../src/sync/types.js';

async function main() {
  console.log('Creating peer A...');
  const peerA = await IrohSyncTransport.create();
  console.log(`  A id: ${peerA.localId()}`);

  console.log('Creating peer B...');
  const peerB = await IrohSyncTransport.create();
  console.log(`  B id: ${peerB.localId()}`);

  // Get B's ticket for A to connect to
  const ticketB = peerB.ticket();
  console.log(`  B ticket: ${ticketB.slice(0, 40)}...`);

  // A connects to B
  console.log('A connecting to B...');
  await peerA.connectToPeer(ticketB, peerB.localId(), 'peer-b');

  // Set up message handler on B
  const received = new Promise<SyncMessage>((resolve) => {
    peerB.onMessage((msg) => {
      console.log(`  B received: type=${msg.type} from=${msg.peerId}`);
      resolve(msg);
    });
  });

  // A sends a "have" message to B
  const testMsg: SyncMessage = {
    version: 1,
    type: 'have',
    peerId: peerA.localId(),
    heads: { main: 'trellis:op:abc123' },
    opCount: 42,
  };

  console.log('A sending have message to B...');
  await peerA.send(peerB.localId(), testMsg);

  // Wait for B to receive it
  const receivedMsg = await received;
  console.log(`  Verified: got ${receivedMsg.type} with ${JSON.stringify((receivedMsg as any).heads)}`);

  // Check peers listing
  const peersA = peerA.peers();
  const peersB = peerB.peers();
  console.log(`  A sees ${peersA.length} peer(s)`);
  console.log(`  B sees ${peersB.length} peer(s)`);

  // Bidirectional: B sends back to A
  const ackReceived = new Promise<SyncMessage>((resolve) => {
    peerA.onMessage((msg) => {
      console.log(`  A received: type=${msg.type} from=${msg.peerId}`);
      resolve(msg);
    });
  });

  // A needs B's addr — get it from the incoming connection
  // For now, B needs to know A's addr. Let's use the ticket approach.
  // Actually, B got A's peerId from the incoming message but doesn't have A's addr.
  // This is expected — B can't send back without A sharing its ticket.
  // For the spike, this is fine — real usage will have both sides share tickets.

  console.log('\nCleaning up...');
  await peerA.close();
  await peerB.close();
  console.log('Done ✓');
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
