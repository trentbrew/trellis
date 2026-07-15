import { describe, test, expect } from 'vitest';
import { EAVStore } from '../../src/core/store/eav-store.js';
import { decompose } from '../../src/vcs/decompose.js';
import type { EngineContext } from '../../src/vcs/engine-context.js';
import type { VcsOp } from '../../src/vcs/types.js';
import {
  CapabilityLevel,
  makeZoneId,
  zoneOwnerDid,
  defineZone,
  renameZone,
  getZone,
  setGrant,
  retractGrant,
  resolveCapability,
} from '../../src/identity/capability.js';

/**
 * Minimal EngineContext over an in-memory store + op log.
 *
 * Capability writes mint ops (ADR 0022) rather than touching the store, so
 * these tests apply them exactly as `engine.applyOp` does — decompose, deletes
 * before adds, append to the journal. `test/p4/capability-persistence.test.ts`
 * covers the same surface against a real engine and a real reboot.
 */
function ctx(): EngineContext {
  const store = new EAVStore();
  const ops: VcsOp[] = [];
  return {
    store,
    agentId: 'user:test',
    readAllOps: () => ops,
    getLastOp: () => ops.at(-1),
    applyOp: async (op: VcsOp) => {
      const d = decompose(op);
      if (d.deleteFacts.length) store.deleteFacts(d.deleteFacts);
      if (d.deleteLinks.length) store.deleteLinks(d.deleteLinks);
      if (d.addFacts.length) store.addFacts(d.addFacts);
      if (d.addLinks.length) store.addLinks(d.addLinks);
      ops.push(op);
    },
  };
}

const OWNER = 'identity:did:key:zowner';
const MEMBER = 'identity:did:key:zmember';
const STRANGER = 'identity:did:key:zstranger';

describe('CapabilityLevel', () => {
  test('is ordinally ordered for "at least L" checks', () => {
    expect(CapabilityLevel.None).toBe(0);
    expect(CapabilityLevel.Reader).toBe(1);
    expect(CapabilityLevel.Member).toBe(2);
    expect(CapabilityLevel.Owner).toBe(3);
    expect(CapabilityLevel.Member > CapabilityLevel.Reader).toBe(true);
    expect(CapabilityLevel.Owner >= CapabilityLevel.Member).toBe(true);
  });
});

describe('zoneId', () => {
  test('encodes owner authority and round-trips', () => {
    const id = makeZoneId('did:key:zowner', 'abc');
    expect(id).toBe('turtle://did:key:zowner/zone/abc');
    expect(zoneOwnerDid(id)).toBe('did:key:zowner');
  });

  test('rejects malformed ids', () => {
    expect(zoneOwnerDid('not-a-zone')).toBeNull();
  });
});

describe('zone registry', () => {
  test('renaming alias leaves zoneId and grants intact (rename-proof)', async () => {
    const c = ctx();
    const zid = makeZoneId('did:key:zowner', 'w1');
    await defineZone(c, {
      zoneId: zid,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });
    await setGrant(c, { principal: MEMBER, zoneId: zid, level: CapabilityLevel.Member }, OWNER);

    await renameZone(c, zid, 'Workspace');
    const z = getZone(c.store, zid);
    expect(z?.alias).toBe('Workspace');
    expect(z?.zoneId).toBe(zid); // unchanged
    expect(resolveCapability(c.store, MEMBER, zid)).toBe(CapabilityLevel.Member);
  });

  test('rename leaves exactly one alias fact (delete-then-add)', async () => {
    const c = ctx();
    const zid = makeZoneId('did:key:zowner', 'w1');
    await defineZone(c, { zoneId: zid, alias: 'Workshop', defaultVisibility: CapabilityLevel.None });
    await renameZone(c, zid, 'Workspace');

    // `alias` is an unbounded-domain register: decompose is pure, so the prior
    // value rides on the op. If that delete missed, two alias facts would
    // accumulate and `getZone`'s find() would resolve by insertion order.
    const aliases = c.store.getFactsByEntity(`zone:${zid}`).filter((f) => f.a === 'alias');
    expect(aliases).toHaveLength(1);
    expect(aliases[0]!.v).toBe('Workspace');
  });
});

describe('resolveCapability — deny-by-default + closure', () => {
  test('unknown zone denies (None)', () => {
    const c = ctx();
    expect(resolveCapability(c.store, STRANGER, makeZoneId('did:key:zowner', 'x'))).toBe(
      CapabilityLevel.None,
    );
  });

  test('absent grant falls back to defaultVisibility', async () => {
    const c = ctx();
    const zid = makeZoneId('did:key:zowner', 'public');
    await defineZone(c, {
      zoneId: zid,
      alias: 'Showroom',
      defaultVisibility: CapabilityLevel.Reader,
    });
    expect(resolveCapability(c.store, STRANGER, zid)).toBe(CapabilityLevel.Reader);
  });

  test('direct grant overrides defaultVisibility', async () => {
    const c = ctx();
    const zid = makeZoneId('did:key:zowner', 'w1');
    await defineZone(c, {
      zoneId: zid,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });
    await setGrant(c, { principal: MEMBER, zoneId: zid, level: CapabilityLevel.Member }, OWNER);
    expect(resolveCapability(c.store, MEMBER, zid)).toBe(CapabilityLevel.Member);
    expect(resolveCapability(c.store, STRANGER, zid)).toBe(CapabilityLevel.None);
  });

  test('parentZone closure inherits the max level', async () => {
    const c = ctx();
    const parent = makeZoneId('did:key:zowner', 'facility');
    const child = makeZoneId('did:key:zowner', 'lab');
    await defineZone(c, {
      zoneId: parent,
      alias: 'Facility',
      defaultVisibility: CapabilityLevel.None,
    });
    await defineZone(c, {
      zoneId: child,
      alias: 'Lab',
      defaultVisibility: CapabilityLevel.None,
      parentZone: parent,
    });
    await setGrant(c, { principal: MEMBER, zoneId: parent, level: CapabilityLevel.Member }, OWNER);
    expect(resolveCapability(c.store, MEMBER, child)).toBe(CapabilityLevel.Member);
  });

  test('revocation retracts the grant, not a persisted None', async () => {
    const c = ctx();
    const zid = makeZoneId('did:key:zowner', 'w1');
    await defineZone(c, { zoneId: zid, alias: 'Workshop', defaultVisibility: CapabilityLevel.None });
    await setGrant(c, { principal: MEMBER, zoneId: zid, level: CapabilityLevel.Member }, OWNER);
    expect(resolveCapability(c.store, MEMBER, zid)).toBe(CapabilityLevel.Member);
    await retractGrant(c, zid, MEMBER, OWNER);
    expect(resolveCapability(c.store, MEMBER, zid)).toBe(CapabilityLevel.None);

    const grants = c.store.getFactsByEntity(`zone:${zid}`).filter((f) => f.a.startsWith('grant:'));
    expect(grants.some((f) => f.v === CapabilityLevel.None)).toBe(false);
  });

  test('re-granting a principal leaves exactly one grant fact', async () => {
    const c = ctx();
    const zid = makeZoneId('did:key:zowner', 'w1');
    await defineZone(c, { zoneId: zid, alias: 'Workshop', defaultVisibility: CapabilityLevel.None });
    await setGrant(c, { principal: MEMBER, zoneId: zid, level: CapabilityLevel.Reader }, OWNER);
    await setGrant(c, { principal: MEMBER, zoneId: zid, level: CapabilityLevel.Owner }, OWNER);

    // Grants are a bounded domain, so decompose enumerates and deletes every
    // prior level — no accumulation, no position-dependent resolution.
    const mine = c.store
      .getFactsByEntity(`zone:${zid}`)
      .filter((f) => f.a === `grant:${MEMBER}`);
    expect(mine).toHaveLength(1);
    expect(resolveCapability(c.store, MEMBER, zid)).toBe(CapabilityLevel.Owner);
  });
});

describe('Owner-gated mutation invariant', () => {
  test('non-owner cannot set or retract a grant', async () => {
    const c = ctx();
    const zid = makeZoneId('did:key:zowner', 'w1');
    await defineZone(c, { zoneId: zid, alias: 'Workshop', defaultVisibility: CapabilityLevel.None });
    await setGrant(c, { principal: OWNER, zoneId: zid, level: CapabilityLevel.Owner }, OWNER);

    await expect(
      setGrant(c, { principal: MEMBER, zoneId: zid, level: CapabilityLevel.Member }, STRANGER),
    ).rejects.toThrow();
    await expect(retractGrant(c, zid, OWNER, STRANGER)).rejects.toThrow();
  });

  test('a rejected mutation mints no op', async () => {
    const c = ctx();
    const zid = makeZoneId('did:key:zowner', 'w1');
    await defineZone(c, { zoneId: zid, alias: 'Workshop', defaultVisibility: CapabilityLevel.None });
    const before = c.readAllOps().length;

    await expect(
      setGrant(c, { principal: MEMBER, zoneId: zid, level: CapabilityLevel.Member }, STRANGER),
    ).rejects.toThrow();

    // Authority is checked before minting — a refused grant leaves no trace in
    // the journal. (Enforcing this against a peer that mints directly is the
    // kernel boundary, Phase 3.)
    expect(c.readAllOps()).toHaveLength(before);
  });

  test('setting None is rejected (use retractGrant)', async () => {
    const c = ctx();
    const zid = makeZoneId('did:key:zowner', 'w1');
    await defineZone(c, { zoneId: zid, alias: 'Workshop', defaultVisibility: CapabilityLevel.None });
    await expect(
      setGrant(c, { principal: MEMBER, zoneId: zid, level: CapabilityLevel.None }, OWNER),
    ).rejects.toThrow();
  });
});
