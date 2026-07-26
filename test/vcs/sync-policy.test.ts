/**
 * Sync Policy Tests (TRL-334)
 *
 * Tests for safety gates, change risk classification, and quarantine system.
 */

import { describe, it, expect } from 'vitest';
import {
  getSyncPolicy,
  classifyChangeRisk,
  shouldBlockMessage,
  QuarantineStore,
  DEFAULT_POLICIES,
} from '../../src/vcs/sync-policy.js';

describe('Sync Policy', () => {
  describe('getSyncPolicy', () => {
    it('should return development policy by default', () => {
      const policy = getSyncPolicy();
      expect(policy.blockRemoteDestructive).toBe(false);
      expect(policy.bulkDeleteThreshold).toBe(50);
      expect(policy.requireCleanWorkingTree).toBe(false);
      expect(policy.quarantineSuspicious).toBe(true);
    });

    it('should return production policy when env set', () => {
      process.env.TRELLIS_SYNC_ENV = 'production';
      const policy = getSyncPolicy();
      expect(policy.blockRemoteDestructive).toBe(true);
      expect(policy.bulkDeleteThreshold).toBe(10);
      delete process.env.TRELLIS_SYNC_ENV;
    });

    it('should return sandbox policy when env set', () => {
      process.env.TRELLIS_SYNC_ENV = 'sandbox';
      const policy = getSyncPolicy();
      expect(policy.blockRemoteDestructive).toBe(false);
      expect(policy.bulkDeleteThreshold).toBe(100);
      delete process.env.TRELLIS_SYNC_ENV;
    });
  });

  describe('classifyChangeRisk', () => {
    it('should classify graph-snapshot as elevated', () => {
      const risk = classifyChangeRisk({ type: 'graph-snapshot' });
      expect(risk.risk).toBe('elevated');
    });

    it('should classify lane-journal as safe', () => {
      const risk = classifyChangeRisk({ type: 'lane-journal' });
      expect(risk.risk).toBe('safe');
    });

    it('should classify decision-trace as safe', () => {
      const risk = classifyChangeRisk({ type: 'decision-trace' });
      expect(risk.risk).toBe('safe');
    });

    it('should classify entity-delta with delete as destructive', () => {
      const risk = classifyChangeRisk({
        type: 'entity-delta',
        entityCount: 20,
        changeTypes: ['delete'],
      });
      expect(risk.risk).toBe('destructive');
    });

    it('should classify entity-delta with modify as safe', () => {
      const risk = classifyChangeRisk({
        type: 'entity-delta',
        entityCount: 10,
        changeTypes: ['modify'],
      });
      expect(risk.risk).toBe('safe');
    });

    it('should classify ops with delete as elevated', () => {
      const risk = classifyChangeRisk({
        type: 'ops',
        ops: [
          { kind: 'delete' },
          { kind: 'delete' },
        ],
      });
      expect(risk.risk).toBe('elevated');
    });

    it('should classify ops with config as critical', () => {
      const risk = classifyChangeRisk({
        type: 'ops',
        ops: [{ kind: 'config' }],
      });
      expect(risk.risk).toBe('critical');
    });
  });

  describe('shouldBlockMessage', () => {
    it('should block destructive ops when policy requires', () => {
      const policy = { blockRemoteDestructive: true, bulkDeleteThreshold: 10, requireCleanWorkingTree: false, quarantineSuspicious: false };
      const result = shouldBlockMessage(
        { type: 'ops', ops: Array(6).fill({ kind: 'delete' }) },
        policy,
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('destructive-op');
    });

    it('should block bulk deletes over threshold', () => {
      const policy = { blockRemoteDestructive: false, bulkDeleteThreshold: 10, requireCleanWorkingTree: false, quarantineSuspicious: false };
      const result = shouldBlockMessage(
        { type: 'entity-delta', entityCount: 15, changeTypes: ['delete'] },
        policy,
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('bulk-delete');
    });

    it('should not block safe messages', () => {
      const policy = { blockRemoteDestructive: false, bulkDeleteThreshold: 10, requireCleanWorkingTree: false, quarantineSuspicious: false };
      const result = shouldBlockMessage(
        { type: 'lane-journal' },
        policy,
      );
      expect(result.blocked).toBe(false);
    });
  });

  describe('QuarantineStore', () => {
    it('should add and retrieve entries', () => {
      const store = new QuarantineStore('/tmp/test-quarantine.json');
      const id = store.add({ type: 'ops' }, 'peer-1', 'quarantine-required');
      
      const entry = store.get(id);
      expect(entry).toBeDefined();
      expect(entry?.sourcePeerId).toBe('peer-1');
    });

    it('should list all entries', () => {
      const store = new QuarantineStore('/tmp/test-quarantine.json');
      store.add({ type: 'ops' }, 'peer-1', 'quarantine-required');
      store.add({ type: 'lane-journal' }, 'peer-2', 'destructive-op');
      
      const entries = store.getAll();
      expect(entries.length).toBeGreaterThanOrEqual(2);
    });

    it('should mark entries as reviewed', () => {
      const store = new QuarantineStore('/tmp/test-quarantine.json');
      const id = store.add({ type: 'ops' }, 'peer-1', 'quarantine-required');
      
      store.markReviewed(id);
      const entry = store.get(id);
      expect(entry?.reviewed).toBe(true);
    });

    it('should remove entries', () => {
      const store = new QuarantineStore('/tmp/test-quarantine.json');
      const id = store.add({ type: 'ops' }, 'peer-1', 'quarantine-required');
      
      store.remove(id);
      const entry = store.get(id);
      expect(entry).toBeUndefined();
    });
  });
});
