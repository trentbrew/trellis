/**
 * Audit Trail for Sync Operations (TRL-336)
 *
 * Logs all sync operations to .trellis/sync-audit.jsonl for compliance
 * and security monitoring.
 */

import { writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface AuditEntry {
  timestamp: string;
  operation: 'connect' | 'disconnect' | 'send' | 'receive' | 'quarantine' | 'bootstrap';
  peerId: string;
  details: {
    messageCount?: number;
    messageSize?: number;
    reason?: string;
    opCount?: number;
    success: boolean;
    error?: string;
  };
}

export class SyncAuditTrail {
  private auditPath: string;
  private enabled: boolean;

  constructor(rootPath: string = '.', enabled: boolean = true) {
    this.auditPath = join(rootPath, '.trellis', 'sync-audit.jsonl');
    this.enabled = enabled;
    
    if (enabled && !existsSync(this.auditPath)) {
      // Create empty file with header
      writeFileSync(this.auditPath, '');
    }
  }

  /**
   * Log an audit entry.
   */
  log(entry: AuditEntry): void {
    if (!this.enabled) return;

    const line = JSON.stringify(entry) + '\n';
    try {
      appendFileSync(this.auditPath, line);
    } catch (err) {
      console.error('Failed to write audit entry:', err);
    }
  }

  /**
   * Log connection event.
   */
  logConnect(peerId: string, success: boolean, error?: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      operation: 'connect',
      peerId,
      details: { success, error },
    });
  }

  /**
   * Log disconnect event.
   */
  logDisconnect(peerId: string, success: boolean): void {
    this.log({
      timestamp: new Date().toISOString(),
      operation: 'disconnect',
      peerId,
      details: { success },
    });
  }

  /**
   * Log message send event.
   */
  logSend(peerId: string, messageCount: number, messageSize: number, success: boolean, error?: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      operation: 'send',
      peerId,
      details: { messageCount, messageSize, success, error },
    });
  }

  /**
   * Log message receive event.
   */
  logReceive(peerId: string, messageCount: number, messageSize: number, success: boolean, error?: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      operation: 'receive',
      peerId,
      details: { messageCount, messageSize, success, error },
    });
  }

  /**
   * Log quarantine event.
   */
  logQuarantine(peerId: string, reason: string, opCount: number): void {
    this.log({
      timestamp: new Date().toISOString(),
      operation: 'quarantine',
      peerId,
      details: { reason, opCount, success: true },
    });
  }

  /**
   * Log bootstrap event.
   */
  logBootstrap(peerId: string, opCount: number, success: boolean, error?: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      operation: 'bootstrap',
      peerId,
      details: { opCount, success, error },
    });
  }

  /**
   * Enable or disable audit logging.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
