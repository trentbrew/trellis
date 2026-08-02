import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { peerKeyResolver } from '../../src/identity/peer-key-resolver.js';
import { createIdentity, saveIdentity } from '../../src/identity/identity.js';
import {
  addPeer,
  type PeerRecord,
} from '../../src/vcs/peer-resolver.js';

function record(partial: Partial<PeerRecord> & Pick<PeerRecord, 'publicKey'>): PeerRecord {
  return {
    did: 'did:key:zPeer',
    entityId: 'identity:did:key:zPeer',
    spriteUrls: [],
    ...partial,
  };
}

describe('peerKeyResolver (ADR 0036)', () => {
  const originalHome = process.env.HOME;
  let home: string;
  let trellisDir: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'peers-'));
    trellisDir = mkdtempSync(join(tmpdir(), 'pkr-'));
    process.env.HOME = home;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  it('resolves a registered peer publicKey by entityId without a local identity', () => {
    const alice = createIdentity({ displayName: 'Alice' });
    addPeer('alice', record({ publicKey: alice.publicKey, entityId: alice.entityId, did: alice.did }));

    const resolver = peerKeyResolver(trellisDir);
    expect(resolver.resolvePublicKey(alice.entityId)).toBe(alice.publicKey);
    expect(resolver.resolvePublicKeys!(alice.entityId)).toEqual([alice.publicKey]);
  });

  it('resolves by bare did as well', () => {
    const bob = createIdentity({ displayName: 'Bob' });
    addPeer('bob', record({ publicKey: bob.publicKey, did: bob.did, entityId: bob.entityId }));

    const resolver = peerKeyResolver(trellisDir);
    expect(resolver.resolvePublicKey(bob.did)).toBe(bob.publicKey);
  });

  it('never resolves a key listed in revokedKeys', () => {
    const carol = createIdentity({ displayName: 'Carol' });
    addPeer('carol', record({
      publicKey: carol.publicKey,
      entityId: carol.entityId,
      revokedKeys: [carol.publicKey],
    }));

    const resolver = peerKeyResolver(trellisDir);
    expect(resolver.resolvePublicKey(carol.entityId)).toBeNull();
    expect(resolver.resolvePublicKeys!(carol.entityId)).toEqual([]);
  });

  it('filters a revoked key while keeping a non-revoked peer key for the same identity', () => {
    const dave = createIdentity({ displayName: 'Dave' });
    const oldKey = 'revoked-key-abc';
    addPeer('dave', record({
      publicKey: dave.publicKey,
      entityId: dave.entityId,
      revokedKeys: [oldKey],
    }));

    const resolver = peerKeyResolver(trellisDir);
    expect(resolver.resolvePublicKey(dave.entityId)).toBe(dave.publicKey);
    expect(resolver.resolvePublicKeys!(dave.entityId)).not.toContain(oldKey);
  });

  it('resolves an unknown identity to no keys', () => {
    const stranger = createIdentity({ displayName: 'Stranger' });
    const resolver = peerKeyResolver(trellisDir);
    expect(resolver.resolvePublicKey(stranger.entityId)).toBeNull();
    expect(resolver.resolvePublicKeys!(stranger.entityId)).toEqual([]);
  });

  it('returns local identity keys alongside peer keys, deduped', () => {
    const self = createIdentity({ displayName: 'Self' });
    saveIdentity(trellisDir, self);
    addPeer('me', record({
      publicKey: self.publicKey,
      entityId: self.entityId,
      did: self.did,
    }));

    const resolver = peerKeyResolver(trellisDir);
    const keys = resolver.resolvePublicKeys!(self.entityId);
    expect(keys.filter((k) => k === self.publicKey)).toHaveLength(1);
  });

  it('delegates device resolution to the pairing path', () => {
    const resolver = peerKeyResolver(trellisDir);
    expect(resolver.resolveDevicePublicKey?.('identity:someone', 'dev-1')).toBeNull();
  });

  it('peers.json files without revokedKeys load and resolve unchanged', () => {
    const erin = createIdentity({ displayName: 'Erin' });
    addPeer('erin', record({ publicKey: erin.publicKey, entityId: erin.entityId }));

    const resolver = peerKeyResolver(trellisDir);
    expect(resolver.resolvePublicKey(erin.entityId)).toBe(erin.publicKey);
  });
});
