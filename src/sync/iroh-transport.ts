/**
 * Iroh Sync Transport
 *
 * Implements SyncTransport over Iroh QUIC bidirectional streams.
 * Each message opens a new bi stream — stateless and simple.
 *
 * Usage:
 *   const transport = await IrohSyncTransport.create()
 *   const ticket = transport.ticket() // share this with peers
 *   await IrohSyncTransport.connect(transport, ticket)
 */

import { Endpoint, EndpointTicket, type EndpointAddr } from '@number0/iroh';
import type {
  SyncTransport,
  SyncMessage,
  SyncMessageHandler,
  PeerId,
} from './types.js';

/** ALPN identifier for the trellis sync protocol. */
const TRELLIS_SYNC_ALPN = Array.from(
  Buffer.from('trellis-sync/1'),
);

// ---------------------------------------------------------------------------
// Wire framing: 4-byte length prefix + JSON payload
// ---------------------------------------------------------------------------

function encodeMessage(msg: SyncMessage): number[] {
  const json = JSON.stringify(msg);
  return Array.from(new TextEncoder().encode(json));
}

async function decodeMessage(
  recv: { readToEnd(limit: number): Promise<number[]> },
  maxBytes = 16 * 1024 * 1024,
): Promise<SyncMessage | null> {
  const body = await recv.readToEnd(maxBytes);
  if (body.length === 0) return null;
  const json = new TextDecoder().decode(Uint8Array.from(body));
  return JSON.parse(json) as SyncMessage;
}

// ---------------------------------------------------------------------------
// IrohSyncTransport
// ---------------------------------------------------------------------------

export interface IrohSyncTransportOptions {
  /** Pre-existing endpoint (for testing). */
  endpoint?: Endpoint;
  /** Secret key bytes (for deterministic identity). */
  secretKey?: number[];
}

export class IrohSyncTransport implements SyncTransport {
  private endpoint: Endpoint;
  private handler: SyncMessageHandler | null = null;
  private peerAddrs: Map<string, EndpointAddr> = new Map();
  private peerNames: Map<string, string> = new Map();
  private acceptLoopRunning = false;
  private pendingMessages: SyncMessage[] = [];

  private constructor(endpoint: Endpoint) {
    this.endpoint = endpoint;
  }

  /**
   * Create a new Iroh sync transport.
   * Binds an endpoint with the trellis-sync ALPN and starts accepting.
   */
  static async create(
    opts?: IrohSyncTransportOptions,
  ): Promise<IrohSyncTransport> {
    let endpoint: Endpoint;
    if (opts?.endpoint) {
      endpoint = opts.endpoint;
    } else {
      endpoint = await Endpoint.bind({ alpns: [TRELLIS_SYNC_ALPN] });
    }
    const transport = new IrohSyncTransport(endpoint);
    transport.startAcceptLoop();
    return transport;
  }

  /**
   * Get a ticket string to share with peers.
   * The receiver pastes this into `connect()`.
   */
  ticket(): string {
    return EndpointTicket.fromAddr(this.endpoint.addr()).toString();
  }

  /**
   * Connect to a remote peer by ticket string.
   * Registers the peer for future `send()` calls.
   */
  async connectToPeer(
    ticketStr: string,
    peerId: string,
    peerName?: string,
  ): Promise<void> {
    const addr = EndpointTicket.fromString(ticketStr).endpointAddr();
    this.peerAddrs.set(peerId, addr);
    this.peerNames.set(peerId, peerName ?? peerId);
  }

  /**
   * Register a peer by explicit EndpointAddr (for programmatic use).
   */
  addPeer(peerId: string, addr: EndpointAddr, name?: string): void {
    this.peerAddrs.set(peerId, addr);
    this.peerNames.set(peerId, name ?? peerId);
  }

  /** The local endpoint's ID (hex string). */
  localId(): string {
    return this.endpoint.id().toString();
  }

  // -------------------------------------------------------------------------
  // SyncTransport interface
  // -------------------------------------------------------------------------

  async send(peerId: string, message: SyncMessage): Promise<void> {
    const addr = this.peerAddrs.get(peerId);
    if (!addr) {
      throw new Error(`Unknown peer: ${peerId}. Call connectToPeer() first.`);
    }

    const conn = await this.endpoint.connect(addr, TRELLIS_SYNC_ALPN);
    const bi = await conn.openBi();
    const framed = encodeMessage(message);
    await bi.send.writeAll(framed);
    await bi.send.finish();
    // Don't close the connection — let it close naturally or via timeout.
    // The receiver reads from the stream; closing here would abort it.
  }

  onMessage(handler: SyncMessageHandler): void {
    this.handler = handler;
    // Drain any messages that arrived before the handler was set
    for (const msg of this.pendingMessages) {
      handler(msg);
    }
    this.pendingMessages = [];
  }

  peers(): PeerId[] {
    const result: PeerId[] = [];
    for (const [id, _addr] of this.peerAddrs) {
      result.push({
        id,
        name: this.peerNames.get(id) ?? id,
      });
    }
    return result;
  }

  /** Tear down the endpoint. */
  async close(): Promise<void> {
    await this.endpoint.close();
  }

  // -------------------------------------------------------------------------
  // Accept loop (background)
  // -------------------------------------------------------------------------

  private startAcceptLoop(): void {
    if (this.acceptLoopRunning) return;
    this.acceptLoopRunning = true;

    const loop = async () => {
      while (!this.endpoint.isClosed()) {
        try {
          const incoming = await this.endpoint.acceptNext();
          if (!incoming) break;
          const conn = await (await incoming.accept()).connect();
          this.handleIncoming(conn).catch(() => {});
        } catch {
          // endpoint closed or accept error — stop loop
          break;
        }
      }
    };
    loop().catch(() => {});
  }

  private async handleIncoming(
    conn: Awaited<ReturnType<Endpoint['connect']>>,
  ): Promise<void> {
    try {
      const remoteId = conn.remoteId().toString();
      // Auto-register peer from incoming connection
      if (!this.peerAddrs.has(remoteId)) {
        this.peerNames.set(remoteId, remoteId);
      }

      const bi = await conn.acceptBi();
      const msg = await decodeMessage(bi.recv);
      if (msg) {
        if (this.handler) {
          await this.handler(msg);
        } else {
          // Buffer the message until a handler is registered
          this.pendingMessages.push(msg);
        }
      }
    } catch (err) {
      console.error('[iroh-transport] accept error:', err);
    }
  }
}
