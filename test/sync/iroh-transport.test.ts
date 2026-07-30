/**
 * Vitest tests for IrohSyncTransport.
 */
import { describe, it, expect, onTestFinished } from 'vitest';
import { IrohSyncTransport } from '../../src/sync/iroh-transport.js';
import type { SyncMessage } from '../../src/sync/types.js';

function makeTestMsg(peerId: string, overrides?: Partial<Record<string, unknown>>): SyncMessage {
  return {
    version: 1,
    type: 'have',
    peerId,
    heads: { main: 'trellis:op:abc123' },
    opCount: 42,
    ...overrides,
  } as SyncMessage;
}

describe('IrohSyncTransport', () => {
  it('creates two peers with distinct identities', async () => {
    const peerA = await IrohSyncTransport.create({ disableRelay: true });
    onTestFinished(() => peerA.close());
    const peerB = await IrohSyncTransport.create({ disableRelay: true });
    onTestFinished(() => peerB.close());

    expect(peerA.localId()).toBeTruthy();
    expect(peerB.localId()).toBeTruthy();
    expect(peerA.localId()).not.toBe(peerB.localId());
  });

  it('sends unidirectional A→B via ticket', async () => {
    const peerA = await IrohSyncTransport.create({ disableRelay: true });
    onTestFinished(() => peerA.close());
    const peerB = await IrohSyncTransport.create({ disableRelay: true });
    onTestFinished(() => peerB.close());

    const ticketB = peerB.ticket();
    await peerA.connectToPeer(ticketB, peerB.localId(), 'peer-b');

    const received = new Promise<SyncMessage>((resolve) => {
      peerB.onMessage((msg) => resolve(msg));
    });

    await peerA.send(peerB.localId(), makeTestMsg(peerA.localId()));
    const msg = await received;
    expect(msg.type).toBe('have');
    expect((msg as any).opCount).toBe(42);
  }, 15000);

  it('sends bidirectional A→B→A with tickets on both sides', async () => {
    const peerA = await IrohSyncTransport.create({ disableRelay: true });
    onTestFinished(() => peerA.close());
    const peerB = await IrohSyncTransport.create({ disableRelay: true });
    onTestFinished(() => peerB.close());

    // Both sides exchange tickets
    await peerA.connectToPeer(peerB.ticket(), peerB.localId(), 'peer-b');
    await peerB.connectToPeer(peerA.ticket(), peerA.localId(), 'peer-a');

    // B receives from A
    const bReceived = new Promise<SyncMessage>((resolve) => {
      peerB.onMessage((msg) => resolve(msg));
    });

    await peerA.send(peerB.localId(), makeTestMsg(peerA.localId(), { opCount: 1 }));
    await bReceived;

    // A receives reply from B
    const aReceived = new Promise<SyncMessage>((resolve) => {
      peerA.onMessage((msg) => resolve(msg));
    });

    await peerB.send(peerA.localId(), makeTestMsg(peerB.localId(), { opCount: 2 }));

    const reply = await aReceived;
    expect(reply.type).toBe('have');
    expect((reply as any).opCount).toBe(2);
  }, 15000);

  it('auto-registers peer from incoming connection for reply', async () => {
    const peerA = await IrohSyncTransport.create({ disableRelay: true });
    onTestFinished(() => peerA.close());
    const peerB = await IrohSyncTransport.create({ disableRelay: true });
    onTestFinished(() => peerB.close());

    // Only A knows B's ticket — B does NOT know A's ticket
    await peerA.connectToPeer(peerB.ticket(), peerB.localId(), 'peer-b');

    // B registers A when it receives the incoming connection
    const bReceived = new Promise<SyncMessage>((resolve) => {
      peerB.onMessage((msg) => resolve(msg));
    });

    await peerA.send(peerB.localId(), makeTestMsg(peerA.localId(), { opCount: 5 }));
    await bReceived;

    // B should now have A auto-registered and be able to send back
    const aReceived = new Promise<SyncMessage>((resolve) => {
      peerA.onMessage((msg) => resolve(msg));
    });

    await peerB.send(peerA.localId(), makeTestMsg(peerB.localId(), { opCount: 10 }));

    const reply = await aReceived;
    expect(reply.type).toBe('have');
    expect((reply as any).opCount).toBe(10);

    // Verify B sees A in its peer list
    const bPeers = peerB.peers();
    expect(bPeers.some((p) => p.id === peerA.localId())).toBe(true);
  }, 15000);

  it('supports multiple send/receive cycles', async () => {
    const peerA = await IrohSyncTransport.create({ disableRelay: true });
    onTestFinished(() => peerA.close());
    const peerB = await IrohSyncTransport.create({ disableRelay: true });
    onTestFinished(() => peerB.close());

    await peerA.connectToPeer(peerB.ticket(), peerB.localId(), 'peer-b');
    await peerB.connectToPeer(peerA.ticket(), peerA.localId(), 'peer-a');

    const received: SyncMessage[] = [];
    peerB.onMessage((msg) => { received.push(msg); });

    // Send 3 messages sequentially
    for (let i = 0; i < 3; i++) {
      await peerA.send(peerB.localId(), makeTestMsg(peerA.localId(), { opCount: i }));
    }

    await new Promise((r) => setTimeout(r, 2000));
    expect(received).toHaveLength(3);
  }, 15000);

  it('returns peer list', async () => {
    const peerA = await IrohSyncTransport.create({ disableRelay: true });
    onTestFinished(() => peerA.close());
    const peerB = await IrohSyncTransport.create({ disableRelay: true });
    onTestFinished(() => peerB.close());

    expect(peerA.peers()).toHaveLength(0);
    await peerA.connectToPeer(peerB.ticket(), peerB.localId(), 'peer-b');

    const aPeers = peerA.peers();
    expect(aPeers).toHaveLength(1);
    expect(aPeers[0].id).toBe(peerB.localId());
    expect(aPeers[0].name).toBe('peer-b');
  });

  it('throws on send to unknown peer', async () => {
    const peerA = await IrohSyncTransport.create({ disableRelay: true });
    onTestFinished(() => peerA.close());

    await expect(
      peerA.send('unknown', makeTestMsg(peerA.localId())),
    ).rejects.toThrow('Unknown peer');
  });
});
