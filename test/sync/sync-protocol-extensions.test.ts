/**
 * Protocol Extensions Tests (TRL-334)
 *
 * Tests for new sync message types: graph-snapshot, lane-journal, decision-trace, entity-delta.
 */

import { describe, it, expect } from 'vitest';
import type {
  SyncGraphSnapshotMessage,
  SyncLaneJournalMessage,
  SyncDecisionTraceMessage,
  SyncEntityDeltaMessage,
  NackReason,
} from '../../src/sync/types.js';

describe('Sync Protocol Extensions', () => {
  describe('SyncGraphSnapshotMessage', () => {
    it('should have required fields', () => {
      const msg: SyncGraphSnapshotMessage = {
        version: 1,
        type: 'graph-snapshot',
        peerId: 'peer-1',
        snapshotHash: 'abc123',
        snapshotData: 'base64data',
        entityCount: 100,
        timestamp: '2024-01-01T00:00:00Z',
      };

      expect(msg.type).toBe('graph-snapshot');
      expect(msg.snapshotHash).toBeDefined();
      expect(msg.snapshotData).toBeDefined();
      expect(msg.entityCount).toBeGreaterThan(0);
    });
  });

  describe('SyncLaneJournalMessage', () => {
    it('should have required fields', () => {
      const msg: SyncLaneJournalMessage = {
        version: 1,
        type: 'lane-journal',
        peerId: 'peer-1',
        laneId: 'lane-uuid',
        headHash: 'hash123',
        journalData: 'jsonl-data',
        opCount: 50,
      };

      expect(msg.type).toBe('lane-journal');
      expect(msg.laneId).toBeDefined();
      expect(msg.headHash).toBeDefined();
      expect(msg.opCount).toBeGreaterThan(0);
    });
  });

  describe('SyncDecisionTraceMessage', () => {
    it('should have required fields', () => {
      const msg: SyncDecisionTraceMessage = {
        version: 1,
        type: 'decision-trace',
        peerId: 'peer-1',
        traceId: 'trace-123',
        traceData: '{}',
        relatedOpId: 'op-456',
      };

      expect(msg.type).toBe('decision-trace');
      expect(msg.traceId).toBeDefined();
      expect(msg.traceData).toBeDefined();
    });
  });

  describe('SyncEntityDeltaMessage', () => {
    it('should have required fields', () => {
      const msg: SyncEntityDeltaMessage = {
        version: 1,
        type: 'entity-delta',
        peerId: 'peer-1',
        deltaHash: 'delta-123',
        baseSnapshotHash: 'base-456',
        entityData: '{}',
        entityCount: 10,
        changeTypes: ['add', 'modify'],
      };

      expect(msg.type).toBe('entity-delta');
      expect(msg.deltaHash).toBeDefined();
      expect(msg.baseSnapshotHash).toBeDefined();
      expect(msg.changeTypes).toContain('add');
    });
  });

  describe('NackReason extensions', () => {
    it('should include new safety reasons', () => {
      const reasons: NackReason[] = [
        'destructive-op',
        'bulk-delete',
        'system-modification',
        'quarantine-required',
      ];

      expect(reasons).toContain('destructive-op');
      expect(reasons).toContain('bulk-delete');
      expect(reasons).toContain('system-modification');
      expect(reasons).toContain('quarantine-required');
    });
  });
});
