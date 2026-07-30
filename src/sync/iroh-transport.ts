/**
 * Iroh Sync Transport
 *
 * Implements SyncTransport over Iroh QUIC bidirectional streams.
 * Each send opens its own connection (simple, reliable).
 * Peers are auto-registered when accepting incoming connections,
 * enabling true bidirectional communication.
 */

import { Endpoint, EndpointTicket, EndpointAddr, EndpointBuilder, presetMinimal } from '@number0/iroh';
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
// Wire framing: JSON payload
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
  /** Disable relay (offline/test mode). */
  disableRelay?: boolean;
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
    } else if (opts?.disableRelay) {
      const builder = Endpoint.builder();
      presetMinimal(builder);
      builder.alpns([TRELLIS_SYNC_ALPN]);
      if (opts.secretKey) builder.secretKey(opts.secretKey);
      endpoint = await builder.bind();
    } else {
      endpoint = await Endpoint.bind({
        alpns: [TRELLIS_SYNC_ALPN],
        secretKey: opts?.secretKey,
      });
    }
    const transport = new IrohSyncTransport(endpoint);
    transport.startAcceptLoop();
    return transport;
  }

  /**
   * Get a ticket string to share with peers.
   */
  ticket(): string {
    return EndpointTicket.fromAddr(this.endpoint.addr()).toString();
  }

  /**
   * Connect to a remote peer by ticket string.
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
  }

  onMessage(handler: SyncMessageHandler): void {
    this.handler = handler;
    for (const msg of this.pendingMessages) {
      handler(msg);
    }
    this.pendingMessages = [];
  }

  peers(): PeerId[] {
    const result: PeerId[] = [];
    for (const [id] of this.peerAddrs) {
      result.push({
        id,
        name: this.peerNames.get(id) ?? id,
      });
    }
    return result;
  }

  /** Connect (no-op — Iroh endpoint is always listening after create). */
  async connect(): Promise<void> {
    // already bound in create()
  }

  /** Disconnect (no-op — the endpoint stays open until close()). */
  async disconnect(): Promise<void> {
    // endpoint lifecycle managed by close()
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

          // Capture remote address before accepting (Incoming.remoteAddr()
          // is only available before accept/refuse).
          const remoteAddrInfo = await incoming.remoteAddr();

          const conn = await (await incoming.accept()).connect();
          this.handleIncoming(conn, remoteAddrInfo).catch(() => {});
        } catch {
          break;
        }
      }
    };
    loop().catch(() => {});
  }

  private async handleIncoming(
    conn: Awaited<ReturnType<Endpoint['connect']>>,
    remoteAddrInfo: { kind: string; addr?: string; endpointId?: string; description?: string },
  ): Promise<void> {
    try {
      const remoteId = conn.remoteId().toString();
      const remoteIdStr = remoteId;

      // Auto-register peer if not already known
      if (!this.peerAddrs.has(remoteIdStr)) {
        this.peerNames.set(remoteIdStr, remoteIdStr);

        // Try cache first
        let addr = await this.endpoint.remoteAddr(conn.remoteId());

        // If not cached, construct from the IncomingAddr
        if (!addr) {
          const directAddrs = remoteAddrInfo.addr ? [remoteAddrInfo.addr] : [];
          addr = new EndpointAddr(conn.remoteId(), remoteAddrInfo.endpointId ?? null, directAddrs);
        }

        if (addr) {
          this.peerAddrs.set(remoteIdStr, addr);
        }
      }

      const bi = await conn.acceptBi();
      const msg = await decodeMessage(bi.recv);
      if (msg) {
        if (this.handler) {
          await this.handler(msg);
        } else {
          this.pendingMessages.push(msg);
        }
      }
    } catch (err) {
      console.error('[iroh-transport] accept error:', err);
    }
  }
}
