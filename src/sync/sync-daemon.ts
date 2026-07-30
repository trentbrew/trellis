/**
 * Sync Daemon for Background Realtime Sync (TRL-334)
 *
 * Background process that maintains persistent sync connection
 * and auto-syncs full graph state between environments.
 * Transport-agnostic — works with WebSocket, Iroh, or any SyncTransport.
 */

import { SyncEngine } from './sync-engine.js';
import { WebSocketTransport } from './websocket-transport.js';
import type { SyncTransport } from './types.js';
import type { SyncMessage } from './types.js';
import type { VcsOp } from '../vcs/types.js';
import {
  getSyncPolicy,
  shouldBlockMessage,
  QuarantineStore,
} from '../vcs/sync-policy.js';
import { SyncAuditTrail } from './audit-trail.js';
import { RateLimiter } from './rate-limiter.js';

export interface SyncDaemonOptions {
  /** WebSocket server URL (used when transport is not provided). */
  url?: string;
  /** Sync transport. Defaults to WebSocketTransport if not provided. */
  transport?: SyncTransport;
  /** Local peer ID. */
  localPeerId: string;
  /** Function to get local ops. */
  getLocalOps: () => VcsOp[];
  /** Function to apply received ops. */
  onOpsReceived: (ops: VcsOp[]) => void | Promise<void>;
  /** Sync interval in ms (default: 1000). */
  syncInterval?: number;
  /** Root path for audit trail and config. */
  rootPath?: string;
  /** Authentication token (optional - reads from .trellis-db.json if not provided). */
  authToken?: string;
  /** Enable automatic bootstrap for empty remotes. */
  enableBootstrap?: boolean;
}

export interface SyncDaemonState {
  running: boolean;
  connected: boolean;
  lastSyncTime?: string;
  syncCount: number;
  quarantineCount: number;
}

/**
 * Background sync daemon.
 * Maintains connection and auto-syncs on interval.
 */
export class SyncDaemon {
  private options: SyncDaemonOptions;
  private engine: SyncEngine;
  private transport: SyncTransport;
  private quarantine: QuarantineStore;
  private auditTrail: SyncAuditTrail;
  private rateLimiter: RateLimiter;
  private interval: NodeJS.Timeout | null = null;
  private state: SyncDaemonState = {
    running: false,
    connected: false,
    syncCount: 0,
    quarantineCount: 0,
  };

  constructor(opts: SyncDaemonOptions) {
    this.options = {
      syncInterval: 1000,
      rootPath: '.',
      enableBootstrap: false,
      ...opts,
    };

    if (opts.transport) {
      this.transport = opts.transport;
    } else if (opts.url) {
      let authToken = this.options.authToken;
      if (!authToken) {
        try {
          const { readFileSync } = require('node:fs');
          const { join } = require('node:path');
          const dbPath = join(this.options.rootPath!, '.trellis-db.json');
          const db = JSON.parse(readFileSync(dbPath, 'utf-8'));
          authToken = db.apiKey;
        } catch {
          // No API key available
        }
      }

      this.transport = new WebSocketTransport({
        url: opts.url,
        localPeerId: this.options.localPeerId,
        authToken,
      });
    } else {
      throw new Error('SyncDaemon requires either url or transport option');
    }

    this.quarantine = new QuarantineStore();
    this.auditTrail = new SyncAuditTrail(this.options.rootPath!);
    this.rateLimiter = new RateLimiter();

    this.engine = new SyncEngine({
      localPeerId: this.options.localPeerId,
      transport: this.transport,
      getLocalOps: this.options.getLocalOps,
      onOpsReceived: async (ops) => {
        const rateCheck = this.rateLimiter.check('remote');
        if (!rateCheck.allowed) {
          const id = this.quarantine.add({ type: 'ops', ops }, 'remote', 'rate_limited');
          this.state.quarantineCount++;
          this.auditTrail.logQuarantine('remote', 'rate_limited', ops.length);
          console.warn(`Rate limit exceeded for remote (quarantined as ${id})`);
          return {
            rejections: ops.map((op) => ({
              hash: op.hash,
              reason: 'rate_limited',
            })),
          };
        }

        const policy = getSyncPolicy();
        const message = { type: 'ops', ops } as SyncMessage;
        const block = shouldBlockMessage(message, policy);

        if (block.blocked) {
          const id = this.quarantine.add(message, 'remote', block.reason!);
          this.state.quarantineCount++;
          this.auditTrail.logQuarantine('remote', block.reason!, ops.length);
          console.warn(`Sync blocked: ${block.details} (quarantined as ${id})`);
          return {
            rejections: ops.map((op) => ({
              hash: op.hash,
              reason: block.reason!,
            })),
          };
        }

        this.auditTrail.logReceive(
          'remote',
          ops.length,
          JSON.stringify(message).length,
          true,
        );
        return this.options.onOpsReceived(ops);
      },
    });
  }

  /**
   * Start the sync daemon.
   */
  async start(): Promise<void> {
    if (this.state.running) {
      console.warn('Sync daemon already running');
      return;
    }

    try {
      await this.transport.connect?.();
      this.state.connected = true;
      this.state.running = true;
      this.auditTrail.logConnect(this.options.localPeerId, true);

      // Check if bootstrap is needed
      if (this.options.enableBootstrap) {
        const remoteState = await this.checkRemoteState();
        if (remoteState.opCount === 0) {
          console.log('Remote is empty - initiating bootstrap');
          await this.bootstrapRemote();
        }
      }

      // Initial sync
      await this.engine.pullAllFrom('server');

      // Periodic sync
      this.interval = setInterval(async () => {
        if (this.state.connected) {
          try {
            await this.engine.pushTo('server');
            await this.engine.pullFrom('server');
            this.state.syncCount++;
            this.state.lastSyncTime = new Date().toISOString();
          } catch (err) {
            console.error('Sync failed:', err);
            this.auditTrail.logSend(
              this.options.localPeerId,
              0,
              0,
              false,
              String(err),
            );
          }
        }
      }, this.options.syncInterval);

      console.log('Sync daemon started');
    } catch (err) {
      this.auditTrail.logConnect(this.options.localPeerId, false, String(err));
      console.error('Failed to start sync daemon:', err);
      throw err;
    }
  }

  /**
   * Stop the sync daemon.
   */
  stop(): void {
    if (!this.state.running) {
      return;
    }

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.transport.disconnect?.();
    this.state.running = false;
    this.state.connected = false;
    this.auditTrail.logDisconnect(this.options.localPeerId, true);

    console.log('Sync daemon stopped');
  }

  /**
   * Get current daemon state.
   */
  getState(): SyncDaemonState {
    return { ...this.state };
  }

  /**
   * Check remote state to determine if bootstrap is needed.
   */
  private async checkRemoteState(): Promise<{ opCount: number }> {
    const localOps = this.options.getLocalOps();
    await this.transport.send('server', {
      version: 1,
      type: 'have',
      peerId: this.options.localPeerId,
      heads:
        localOps.length > 0 ? { main: localOps[localOps.length - 1].hash } : {},
      opCount: localOps.length,
    });

    return { opCount: 0 };
  }

  /**
   * Bootstrap remote with full local state.
   */
  private async bootstrapRemote(): Promise<void> {
    const localOps = this.options.getLocalOps();
    console.log(`Bootstrapping remote with ${localOps.length} ops...`);

    await this.transport.send('server', {
      version: 1,
      type: 'ops',
      peerId: this.options.localPeerId,
      ops: localOps,
    });

    this.auditTrail.logBootstrap('server', localOps.length, true);
    console.log('Bootstrap complete');
  }

  /**
   * Public method to explicitly bootstrap remote.
   */
  async bootstrap(): Promise<void> {
    await this.transport.connect?.();
    await this.bootstrapRemote();
    this.transport.disconnect?.();
  }

  /**
   * Apply a quarantined message.
   */
  async applyQuarantine(id: string): Promise<void> {
    const entry = this.quarantine.get(id);
    if (!entry) {
      throw new Error(`Quarantine entry ${id} not found`);
    }

    if (entry.message.type === 'ops') {
      await this.options.onOpsReceived(entry.message.ops);
    }

    this.quarantine.markReviewed(id);
    this.quarantine.remove(id);
    this.state.quarantineCount--;
  }

  /**
   * Reject a quarantined message.
   */
  rejectQuarantine(id: string): void {
    const entry = this.quarantine.get(id);
    if (!entry) {
      throw new Error(`Quarantine entry ${id} not found`);
    }

    this.quarantine.markReviewed(id);
    this.quarantine.remove(id);
    this.state.quarantineCount--;
  }
}
