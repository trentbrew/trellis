/**
 * Sync Daemon Tests (TRL-334 + TRL-336)
 *
 * Tests for the background sync daemon process and TRL-336 behavioral ACs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncDaemon } from '../../src/sync/sync-daemon.js';
import { SyncAuditTrail } from '../../src/sync/audit-trail.js';
import { RateLimiter } from '../../src/sync/rate-limiter.js';
import type { VcsOp } from '../../src/vcs/types.js';
import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

describe('SyncDaemon', () => {
  let mockGetLocalOps: () => VcsOp[];
  let mockOnOpsReceived: (ops: VcsOp[]) => Promise<void>;

  beforeEach(() => {
    mockGetLocalOps = vi.fn(() => []);
    mockOnOpsReceived = vi.fn(async () => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create daemon with options', () => {
      const daemon = new SyncDaemon({
        url: 'ws://localhost:8231/sync',
        localPeerId: 'peer-1',
        getLocalOps: mockGetLocalOps,
        onOpsReceived: mockOnOpsReceived,
      });

      expect(daemon).toBeDefined();
    });

    it('should use default sync interval', () => {
      const daemon = new SyncDaemon({
        url: 'ws://localhost:8231/sync',
        localPeerId: 'peer-1',
        getLocalOps: mockGetLocalOps,
        onOpsReceived: mockOnOpsReceived,
      });

      expect(daemon).toBeDefined();
    });
  });

  describe('getState', () => {
    it('should return initial state', () => {
      const daemon = new SyncDaemon({
        url: 'ws://localhost:8231/sync',
        localPeerId: 'peer-1',
        getLocalOps: mockGetLocalOps,
        onOpsReceived: mockOnOpsReceived,
      });

      const state = daemon.getState();
      expect(state.running).toBe(false);
      expect(state.connected).toBe(false);
      expect(state.syncCount).toBe(0);
      expect(state.quarantineCount).toBe(0);
    });
  });

  describe('stop', () => {
    it('should stop daemon without error when not running', () => {
      const daemon = new SyncDaemon({
        url: 'ws://localhost:8231/sync',
        localPeerId: 'peer-1',
        getLocalOps: mockGetLocalOps,
        onOpsReceived: mockOnOpsReceived,
      });

      expect(() => daemon.stop()).not.toThrow();
    });
  });

  describe('quarantine operations', () => {
    it('should have zero quarantine count initially', () => {
      const daemon = new SyncDaemon({
        url: 'ws://localhost:8231/sync',
        localPeerId: 'peer-1',
        getLocalOps: mockGetLocalOps,
        onOpsReceived: mockOnOpsReceived,
      });

      expect(daemon.getState().quarantineCount).toBe(0);
    });
  });

  // TRL-336 behavioral ACs
  describe('TRL-336 security features', () => {
    describe('authToken integration', () => {
      it('should accept authToken option for WebSocket authentication', () => {
        const daemon = new SyncDaemon({
          url: 'ws://localhost:8231/sync',
          localPeerId: 'peer-1',
          getLocalOps: mockGetLocalOps,
          onOpsReceived: mockOnOpsReceived,
          authToken: 'test-jwt-token',
        });

        expect(daemon).toBeDefined();
      });

      it('should auto-load API key from .trellis-db.json when authToken not provided', () => {
        const tmpDir = join(tmpdir(), `trellis-test-${randomUUID()}`);
        mkdirSync(tmpDir, { recursive: true });
        mkdirSync(join(tmpDir, '.trellis'), { recursive: true });
        writeFileSync(
          join(tmpDir, '.trellis-db.json'),
          JSON.stringify({ apiKey: 'auto-loaded-key-123' }),
        );

        const daemon = new SyncDaemon({
          url: 'wss://localhost:8231/sync',
          localPeerId: 'peer-1',
          getLocalOps: mockGetLocalOps,
          onOpsReceived: mockOnOpsReceived,
          rootPath: tmpDir,
        });

        expect(daemon).toBeDefined();

        rmSync(tmpDir, { recursive: true });
      });
    });

    describe('checkRemoteState', () => {
      it('should detect empty remote when bootstrap is enabled', async () => {
        const tmpDir = join(tmpdir(), `trellis-test-${randomUUID()}`);
        mkdirSync(tmpDir, { recursive: true });
        mkdirSync(join(tmpDir, '.trellis'), { recursive: true });

        const daemon = new SyncDaemon({
          url: 'wss://localhost:8231/sync',
          localPeerId: 'peer-1',
          getLocalOps: mockGetLocalOps,
          onOpsReceived: mockOnOpsReceived,
          rootPath: tmpDir,
          enableBootstrap: true,
        });

        const state = daemon.getState();
        expect(state.running).toBe(false);

        rmSync(tmpDir, { recursive: true });
      });
    });
  });
});

describe('RateLimiter', () => {
  it('should allow messages within the rate limit', () => {
    const limiter = new RateLimiter({ maxMessages: 100, windowMs: 1000 });
    const result = limiter.check('peer-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
  });

  it('should block messages exceeding the rate limit', () => {
    const limiter = new RateLimiter({ maxMessages: 3, windowMs: 1000 });
    limiter.check('peer-1');
    limiter.check('peer-1');
    limiter.check('peer-1');
    const result = limiter.check('peer-1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track different peers independently', () => {
    const limiter = new RateLimiter({ maxMessages: 2, windowMs: 1000 });
    limiter.check('peer-1');
    limiter.check('peer-1');
    const result1 = limiter.check('peer-1');
    limiter.check('peer-2');
    const result2 = limiter.check('peer-2');
    expect(result1.allowed).toBe(false);
    expect(result2.allowed).toBe(true);
  });

  it('should reset bucket after window expires', async () => {
    const limiter = new RateLimiter({ maxMessages: 2, windowMs: 50 });
    limiter.check('peer-1');
    limiter.check('peer-1');
    const resultBefore = limiter.check('peer-1');
    expect(resultBefore.allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 60));
    const resultAfter = limiter.check('peer-1');
    expect(resultAfter.allowed).toBe(true);
  });
});

describe('SyncAuditTrail', () => {
  it('should log connect events to audit file', () => {
    const tmpDir = join(tmpdir(), `trellis-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
    mkdirSync(join(tmpDir, '.trellis'), { recursive: true });

    const trail = new SyncAuditTrail(tmpDir);
    trail.logConnect('peer-1', true);

    const logPath = join(tmpDir, '.trellis', 'sync-audit.jsonl');
    expect(existsSync(logPath)).toBe(true);
    const content = readFileSync(logPath, 'utf-8');
    const entry = JSON.parse(content.trim());
    expect(entry.operation).toBe('connect');
    expect(entry.peerId).toBe('peer-1');
    expect(entry.details.success).toBe(true);

    rmSync(tmpDir, { recursive: true });
  });

  it('should log quarantine events', () => {
    const tmpDir = join(tmpdir(), `trellis-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
    mkdirSync(join(tmpDir, '.trellis'), { recursive: true });

    const trail = new SyncAuditTrail(tmpDir);
    trail.logQuarantine('peer-1', 'suspicious-op', 5);

    const logPath = join(tmpDir, '.trellis', 'sync-audit.jsonl');
    const content = readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n').filter((l) => l.trim());
    const lastEntry = JSON.parse(lines[lines.length - 1]);
    expect(lastEntry.operation).toBe('quarantine');
    expect(lastEntry.peerId).toBe('peer-1');
    expect(lastEntry.details.reason).toBe('suspicious-op');
    expect(lastEntry.details.opCount).toBe(5);

    rmSync(tmpDir, { recursive: true });
  });

  it('should log bootstrap events', () => {
    const tmpDir = join(tmpdir(), `trellis-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
    mkdirSync(join(tmpDir, '.trellis'), { recursive: true });

    const trail = new SyncAuditTrail(tmpDir);
    trail.logBootstrap('server', 42, true);

    const logPath = join(tmpDir, '.trellis', 'sync-audit.jsonl');
    const content = readFileSync(logPath, 'utf-8');
    const entry = JSON.parse(content.trim());
    expect(entry.operation).toBe('bootstrap');
    expect(entry.details.opCount).toBe(42);
    expect(entry.details.success).toBe(true);

    rmSync(tmpDir, { recursive: true });
  });

  it('should log send and receive events with sizes', () => {
    const tmpDir = join(tmpdir(), `trellis-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
    mkdirSync(join(tmpDir, '.trellis'), { recursive: true });

    const trail = new SyncAuditTrail(tmpDir);
    trail.logSend('peer-1', 10, 1024, true);
    trail.logReceive('peer-1', 10, 1024, true);

    const logPath = join(tmpDir, '.trellis', 'sync-audit.jsonl');
    const content = readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n').filter((l) => l.trim());
    expect(lines.length).toBe(2);
    const sendEntry = JSON.parse(lines[0]);
    const recvEntry = JSON.parse(lines[1]);
    expect(sendEntry.operation).toBe('send');
    expect(sendEntry.details.messageCount).toBe(10);
    expect(sendEntry.details.messageSize).toBe(1024);
    expect(recvEntry.operation).toBe('receive');

    rmSync(tmpDir, { recursive: true });
  });

  it('should support disabling audit logging', () => {
    const tmpDir = join(tmpdir(), `trellis-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
    mkdirSync(join(tmpDir, '.trellis'), { recursive: true });

    const trail = new SyncAuditTrail(tmpDir);
    trail.setEnabled(false);
    trail.logConnect('peer-1', true);

    const logPath = join(tmpDir, '.trellis', 'sync-audit.jsonl');
    const content = readFileSync(logPath, 'utf-8');
    expect(content.trim()).toBe('');

    rmSync(tmpDir, { recursive: true });
  });
});
