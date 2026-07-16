import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  writeHeartbeat,
  readPresence,
  clearHeartbeat,
  resolveSessionId,
  DEFAULT_STALE_MS,
  type PresenceInfo,
} from '../../src/cli/presence.js';

function makeInfo(sessionId: string, ageMs: number): PresenceInfo {
  const t = new Date(Date.now() - ageMs).toISOString();
  return {
    sessionId,
    agentId: 'identity:test',
    displayName: 'Test',
    client: 'opencode',
    laneId: `lane-${sessionId}`,
    status: 'active',
    startedAt: t,
    lastHeartbeat: t,
  };
}

describe('presence ledger', () => {
  const root = mkdtempSync(join(tmpdir(), 'trellis-presence-'));
  afterEach(() => rmSync(join(root, '.trellis', 'presence'), { recursive: true, force: true }));

  it('reads only non-stale records and prunes stale', () => {
    writeHeartbeat(root, makeInfo('fresh', 1000));
    writeHeartbeat(root, makeInfo('stale', DEFAULT_STALE_MS + 10_000));

    const peers = readPresence(root, { includeSelf: true });
    expect(peers.map((p) => p.sessionId)).toEqual(['fresh']);
  });

  it('includes self when requested', () => {
    writeHeartbeat(root, makeInfo('me', 0));
    const all = readPresence(root, { includeSelf: true, selfSessionId: 'me' });
    expect(all.map((p) => p.sessionId)).toContain('me');
  });

  it('clears a heartbeat', () => {
    writeHeartbeat(root, makeInfo('gone', 0));
    expect(readPresence(root, { includeSelf: true }).length).toBe(1);
    clearHeartbeat(root, 'gone');
    expect(readPresence(root, { includeSelf: true }).length).toBe(0);
  });

  it('resolveSessionId prefers session over lane', () => {
    process.env.TRELLIS_SESSION_ID = 'sess-x';
    process.env.TRELLIS_LANE_ID = 'lane-y';
    expect(resolveSessionId()).toBe('sess-x');
    delete process.env.TRELLIS_SESSION_ID;
    expect(resolveSessionId()).toBe('lane-y');
    delete process.env.TRELLIS_LANE_ID;
  });
});
