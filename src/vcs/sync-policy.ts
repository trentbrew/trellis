/**
 * Sync Policy and Safety Gates (TRL-334)
 *
 * Defines safety policies for realtime sync to prevent accidental
 * mutations, deletions, and corruptions from propagating between environments.
 */

import type { NackReason } from '../sync/types.js';
import {
  createHash,
  randomUUID,
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

export interface SyncPolicy {
  /** Require manual approval for destructive ops from remote. */
  blockRemoteDestructive: boolean;
  /** Require confirmation for bulk deletes (>N entities). */
  bulkDeleteThreshold: number;
  /** Block sync if local has uncommitted changes. */
  requireCleanWorkingTree: boolean;
  /** Quarantine suspicious ops for review. */
  quarantineSuspicious: boolean;
}

export interface ChangeRisk {
  risk: 'safe' | 'elevated' | 'destructive' | 'critical';
  reason: string;
}

export interface QuarantineEntry {
  id: string;
  timestamp: string;
  sourcePeerId: string;
  message: any;
  risk: ChangeRisk;
  reason: NackReason;
  reviewed: boolean;
}

/**
 * Default policies by environment type.
 */
export const DEFAULT_POLICIES: Record<string, SyncPolicy> = {
  production: {
    blockRemoteDestructive: true,
    bulkDeleteThreshold: 10,
    requireCleanWorkingTree: true,
    quarantineSuspicious: true,
  },
  sandbox: {
    blockRemoteDestructive: false,
    bulkDeleteThreshold: 100,
    requireCleanWorkingTree: false,
    quarantineSuspicious: false,
  },
  development: {
    blockRemoteDestructive: false,
    bulkDeleteThreshold: 50,
    requireCleanWorkingTree: false,
    quarantineSuspicious: true,
  },
};

/**
 * Get sync policy from environment or default.
 */
export function getSyncPolicy(): SyncPolicy {
  const env = process.env.TRELLIS_SYNC_ENV ?? 'development';
  return DEFAULT_POLICIES[env] ?? DEFAULT_POLICIES.development;
}

/**
 * Classify change risk based on message content.
 */
export function classifyChangeRisk(message: any): ChangeRisk {
  const type = message.type;

  switch (type) {
    case 'graph-snapshot':
      return { risk: 'elevated', reason: 'Full graph snapshot' };
    case 'lane-journal':
      return { risk: 'safe', reason: 'Lane journal sync' };
    case 'decision-trace':
      return { risk: 'safe', reason: 'Decision trace sync' };
    case 'entity-delta':
      return classifyEntityDeltaRisk(message);
    case 'ops':
      return classifyOpsRisk(message);
    default:
      return { risk: 'safe', reason: 'Unknown message type' };
  }
}

/**
 * Classify entity delta risk based on change types and count.
 */
function classifyEntityDeltaRisk(message: any): ChangeRisk {
  const { entityCount, changeTypes } = message;

  if (changeTypes.includes('delete')) {
    if (entityCount > 10) {
      return {
        risk: 'destructive',
        reason: `Bulk delete of ${entityCount} entities`,
      };
    }
    return { risk: 'elevated', reason: 'Entity deletion' };
  }

  if (entityCount > 100) {
    return {
      risk: 'elevated',
      reason: `Bulk modification of ${entityCount} entities`,
    };
  }

  return { risk: 'safe', reason: 'Entity delta sync' };
}

/**
 * Classify ops risk based on op kinds and count.
 */
function classifyOpsRisk(message: any): ChangeRisk {
  const ops = message.ops ?? [];
  const deleteOps = ops.filter(
    (op: any) => op.kind === 'delete' || op.kind === 'repair',
  );
  const systemOps = ops.filter(
    (op: any) => op.kind === 'config' || op.kind === 'agent-rule',
  );

  if (systemOps.length > 0) {
    return {
      risk: 'critical',
      reason: 'System configuration or agent rule modification',
    };
  }

  if (deleteOps.length > 5) {
    return {
      risk: 'destructive',
      reason: `Bulk destructive operations (${deleteOps.length})`,
    };
  }

  if (deleteOps.length > 0) {
    return { risk: 'elevated', reason: 'Destructive operations present' };
  }

  return { risk: 'safe', reason: 'Normal operations' };
}

/**
 * Check if a message should be blocked by sync policy.
 */
export function shouldBlockMessage(
  message: any,
  policy: SyncPolicy,
): { blocked: boolean; reason?: NackReason; details?: string } {
  const risk = classifyChangeRisk(message);

  // Block destructive ops from remote if policy requires
  if (policy.blockRemoteDestructive && risk.risk === 'destructive') {
    return { blocked: true, reason: 'destructive-op', details: risk.reason };
  }

  // Block critical ops from remote
  if (policy.blockRemoteDestructive && risk.risk === 'critical') {
    return {
      blocked: true,
      reason: 'system-modification',
      details: risk.reason,
    };
  }

  // Block bulk deletes
  if (
    risk.risk === 'destructive' &&
    message.entityCount > policy.bulkDeleteThreshold
  ) {
    return { blocked: true, reason: 'bulk-delete', details: risk.reason };
  }

  // Quarantine elevated/suspicious changes if policy requires
  if (
    policy.quarantineSuspicious &&
    (risk.risk === 'elevated' || risk.risk === 'destructive')
  ) {
    return {
      blocked: true,
      reason: 'quarantine-required',
      details: risk.reason,
    };
  }

  return { blocked: false };
}

/**
 * Quarantine store for suspicious changes.
 * Encrypted at rest with AES-256-GCM and HMAC integrity verification.
 */
export class QuarantineStore {
  private entries = new Map<string, QuarantineEntry>();
  private storagePath: string;
  private encryptionKey: Buffer;
  private hmacKey: Buffer;

  constructor(storagePath: string = '.trellis/quarantine.json') {
    this.storagePath = storagePath;
    // Derive keys from environment or generate (in production, use proper key management)
    const keySeed = process.env.TRELLIS_QUARANTINE_KEY || randomUUID();
    this.encryptionKey = createHash('sha256')
      .update(keySeed + '-enc')
      .digest();
    this.hmacKey = createHash('sha256')
      .update(keySeed + '-hmac')
      .digest();
    this.load();
  }

  /**
   * Add an entry to quarantine.
   */
  add(message: any, sourcePeerId: string, reason: NackReason): string {
    const risk = classifyChangeRisk(message);
    const id = crypto.randomUUID();

    const entry: QuarantineEntry = {
      id,
      timestamp: new Date().toISOString(),
      sourcePeerId,
      message,
      risk,
      reason,
      reviewed: false,
    };

    this.entries.set(id, entry);
    this.save();

    return id;
  }

  /**
   * Get all quarantine entries.
   */
  getAll(): QuarantineEntry[] {
    return Array.from(this.entries.values()).sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  /**
   * Get a specific quarantine entry.
   */
  get(id: string): QuarantineEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Mark an entry as reviewed.
   */
  markReviewed(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.reviewed = true;
      this.save();
    }
  }

  /**
   * Remove an entry from quarantine.
   */
  remove(id: string): void {
    this.entries.delete(id);
    this.save();
  }

  /**
   * Load quarantine from disk.
   */
  private load(): void {
    try {
      const data = readFileSync(this.storagePath, 'utf-8');
      const encrypted = JSON.parse(data);

      // Verify HMAC integrity
      const hmac = createHmac('sha256', this.hmacKey)
        .update(encrypted.data)
        .digest('hex');
      if (hmac !== encrypted.hmac) {
        console.error(
          'Quarantine store HMAC verification failed - data may be corrupted',
        );
        return;
      }

      // Decrypt
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey,
        Buffer.from(encrypted.iv, 'hex'),
      );
      decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encrypted.data, 'base64')),
        decipher.final(),
      ]);

      const entries = JSON.parse(
        decrypted.toString('utf-8'),
      ) as QuarantineEntry[];
      this.entries.clear();
      for (const entry of entries) {
        this.entries.set(entry.id, entry);
      }
    } catch {
      // File doesn't exist or is invalid, start fresh
    }
  }

  /**
   * Save quarantine to disk.
   */
  private save(): void {
    const data = JSON.stringify(Array.from(this.entries.values()), null, 2);

    // Encrypt
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf-8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Create HMAC for integrity
    const hmac = createHmac('sha256', this.hmacKey)
      .update(encrypted)
      .digest('hex');

    const payload = {
      data: encrypted.toString('base64'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      hmac,
    };

    writeFileSync(this.storagePath, JSON.stringify(payload, null, 2));
  }
}
