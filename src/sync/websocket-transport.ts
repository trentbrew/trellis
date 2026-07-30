/**
 * WebSocket Transport for SyncEngine (TRL-334)
 *
 * Provides WebSocket-based bidirectional sync transport for realtime
 * full-state sync. Integrates with existing SyncEngine protocol.
 */

import type { SyncTransport, SyncMessage, PeerId } from './types.js';
import { RateLimiter, type RateLimiterOptions } from './rate-limiter.js';

export interface WebSocketTransportOptions {
  /** WebSocket server URL (e.g., wss://localhost:8231/sync) */
  url: string;
  /** Local peer identity. */
  localPeerId: string;
  /** Reconnection delay in ms (default: 5000). */
  reconnectDelay?: number;
  /** Maximum reconnection attempts (default: infinite). */
  maxReconnectAttempts?: number;
  /** Authentication token (JWT or API key). */
  authToken?: string;
  /** Maximum message size in bytes (default: 10MB). */
  maxMessageSize?: number;
  /** Enforce TLS (reject ws://) - defaults to true in production. */
  enforceTls?: boolean;
  /** Rate limiter options. */
  rateLimiter?: RateLimiterOptions;
}

export interface WebSocketTransportState {
  connected: boolean;
  reconnectAttempts: number;
  lastError?: string;
}

/**
 * WebSocket-based sync transport.
 * Maintains persistent connection with automatic reconnection.
 */
export class WebSocketTransport implements SyncTransport {
  private options: WebSocketTransportOptions;
  private ws: WebSocket | null = null;
  private messageHandler: ((message: SyncMessage) => void) | null = null;
  private state: WebSocketTransportState = {
    connected: false,
    reconnectAttempts: 0,
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private rateLimiter: RateLimiter;

  constructor(opts: WebSocketTransportOptions) {
    this.options = {
      reconnectDelay: 5000,
      maxReconnectAttempts: Infinity,
      maxMessageSize: 10 * 1024 * 1024, // 10MB default
      enforceTls: process.env.TRELLIS_SYNC_ENV === 'production',
      ...opts,
    };
    this.rateLimiter = new RateLimiter(this.options.rateLimiter);
  }

  /**
   * Connect to the sync server.
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    // Enforce TLS in production
    if (this.options.enforceTls && this.options.url.startsWith('ws://')) {
      throw new Error(
        'TLS enforcement: ws:// not allowed in production environment. Use wss://',
      );
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = new URL(this.options.url);

        // Add auth token to query params if provided
        if (this.options.authToken) {
          wsUrl.searchParams.set('token', this.options.authToken);
        }

        this.ws = new WebSocket(wsUrl.toString());

        this.ws.onopen = () => {
          this.state.connected = true;
          this.state.reconnectAttempts = 0;
          this.state.lastError = undefined;
          resolve();
        };

        this.ws.onmessage = (event) => {
          // Enforce message size limit
          const messageSize = event.data.length;
          if (messageSize > (this.options.maxMessageSize ?? 10 * 1024 * 1024)) {
            console.error(
              `Message size (${messageSize} bytes) exceeds limit (${this.options.maxMessageSize} bytes)`,
            );
            this.ws?.close();
            return;
          }

          // Enforce rate limiting
          const rateLimit = this.rateLimiter.check('server');
          if (!rateLimit.allowed) {
            console.error(
              `Rate limit exceeded for peer: server. Reset at ${new Date(rateLimit.resetTime).toISOString()}`,
            );
            return;
          }

          if (this.messageHandler) {
            try {
              const message = JSON.parse(event.data.toString()) as SyncMessage;
              this.messageHandler(message);
            } catch (err) {
              console.error('Failed to parse sync message:', err);
            }
          }
        };

        this.ws.onerror = (error) => {
          this.state.lastError =
            error instanceof Error ? error.message : 'Unknown error';
          reject(error);
        };

        this.ws.onclose = () => {
          this.state.connected = false;
          this.scheduleReconnect();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Disconnect from the sync server.
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state.connected = false;
  }

  /**
   * Send a message to the sync server.
   */
  async send(_peerId: string, message: SyncMessage): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Register a handler for incoming messages.
   */
  onMessage(handler: (message: SyncMessage) => void): void {
    this.messageHandler = handler;
  }

  /**
   * List connected peers.
   * Note: WebSocket transport connects to a single server, so this returns
   * the server as a peer if connected.
   */
  peers(): PeerId[] {
    if (!this.state.connected) {
      return [];
    }

    return [
      {
        id: 'server',
        name: 'Sync Server',
        lastSeen: new Date().toISOString(),
      },
    ];
  }

  /**
   * Get current transport state.
   */
  getState(): WebSocketTransportState {
    return { ...this.state };
  }

  /**
   * Schedule reconnection attempt.
   */
  private scheduleReconnect(): void {
    if (
      this.state.reconnectAttempts >=
      (this.options.maxReconnectAttempts ?? Infinity)
    ) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.state.reconnectAttempts++;
      this.connect().catch((err) => {
        console.error('Reconnection failed:', err);
      });
    }, this.options.reconnectDelay);
  }
}
