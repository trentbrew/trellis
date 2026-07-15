import { describe, test, expect } from 'vitest';
import { EAVStore } from '../../src/core/store/eav-store.js';
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

// Helper: a fresh in-memory store per test.
function store(): EAVStore {
  return new EAVStore();
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
  test('renaming alias leaves zoneId and grants intact (rename-proof)', () => {
    const s = store();
    const zid = makeZoneId('did:key:zowner', 'w1');
    defineZone(s, {
      zoneId: zid,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });
    setGrant(s, { principal: MEMBER, zoneId: zid, level: CapabilityLevel.Member }, OWNER);

    // Rename "Workshop" -> "Workspace"
    renameZone(s, zid, 'Workspace');
    const z = getZone(s, zid);
    expect(z?.alias).toBe('Workspace');
    expect(z?.zoneId).toBe(zid); // unchanged
    // Grant survives the rename
    expect(resolveCapability(s, MEMBER, zid)).toBe(CapabilityLevel.Member);
  });
});

describe('resolveCapability — deny-by-default + closure', () => {
  test('unknown zone denies (None)', () => {
    const s = store();
    expect(resolveCapability(s, STRANGER, makeZoneId('did:key:zowner', 'x'))).toBe(
      CapabilityLevel.None,
    );
  });

  test('absent grant falls back to defaultVisibility', () => {
    const s = store();
    const zid = makeZoneId('did:key:zowner', 'public');
    defineZone(s, {
      zoneId: zid,
      alias: 'Showroom',
      defaultVisibility: CapabilityLevel.Reader,
    });
    // No explicit grant → anon reads via defaultVisibility
    expect(resolveCapability(s, STRANGER, zid)).toBe(CapabilityLevel.Reader);
  });

  test('direct grant overrides defaultVisibility', () => {
    const s = store();
    const zid = makeZoneId('did:key:zowner', 'w1');
    defineZone(s, {
      zoneId: zid,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });
    setGrant(s, { principal: MEMBER, zoneId: zid, level: CapabilityLevel.Member }, OWNER);
    expect(resolveCapability(s, MEMBER, zid)).toBe(CapabilityLevel.Member);
    // Stranger still denied (no grant, default None)
    expect(resolveCapability(s, STRANGER, zid)).toBe(CapabilityLevel.None);
  });

  test('parentZone closure inherits the max level', () => {
    const s = store();
    const parent = makeZoneId('did:key:zowner', 'facility');
    const child = makeZoneId('did:key:zowner', 'lab');
    defineZone(s, {
      zoneId: parent,
      alias: 'Facility',
      defaultVisibility: CapabilityLevel.None,
    });
    defineZone(s, {
      zoneId: child,
      alias: 'Lab',
      defaultVisibility: CapabilityLevel.None,
      parentZone: parent,
    });
    // Grant on the parent applies to the child via closure
    setGrant(s, { principal: MEMBER, zoneId: parent, level: CapabilityLevel.Member }, OWNER);
    expect(resolveCapability(s, MEMBER, child)).toBe(CapabilityLevel.Member);
  });

  test('revocation retracts the grant, not a persisted None', () => {
    const s = store();
    const zid = makeZoneId('did:key:zowner', 'w1');
    defineZone(s, { zoneId: zid, alias: 'Workshop', defaultVisibility: CapabilityLevel.None });
    setGrant(s, { principal: MEMBER, zoneId: zid, level: CapabilityLevel.Member }, OWNER);
    expect(resolveCapability(s, MEMBER, zid)).toBe(CapabilityLevel.Member);
    retractGrant(s, zid, MEMBER, OWNER);
    expect(resolveCapability(s, MEMBER, zid)).toBe(CapabilityLevel.None);
    // No fact should carry CapabilityLevel.None as a persisted grant
    const grants = s.getFactsByEntity(`zone:${zid}`).filter((f) => f.a.startsWith('grant:'));
    expect(grants.some((f) => f.v === CapabilityLevel.None)).toBe(false);
  });
});

describe('Owner-gated mutation invariant', () => {
  test('non-owner cannot set or retract a grant', () => {
    const s = store();
    const zid = makeZoneId('did:key:zowner', 'w1');
    defineZone(s, { zoneId: zid, alias: 'Workshop', defaultVisibility: CapabilityLevel.None });
    // Make MEMBER an owner so it can act thereafter
    setGrant(s, { principal: OWNER, zoneId: zid, level: CapabilityLevel.Owner }, OWNER);
    // STRANGER is not an owner → mutation rejected
    expect(() =>
      setGrant(s, { principal: MEMBER, zoneId: zid, level: CapabilityLevel.Member }, STRANGER),
    ).toThrow();
    expect(() => retractGrant(s, zid, OWNER, STRANGER)).toThrow();
  });

  test('setting None is rejected (use retractGrant)', () => {
    const s = store();
    const zid = makeZoneId('did:key:zowner', 'w1');
    defineZone(s, { zoneId: zid, alias: 'Workshop', defaultVisibility: CapabilityLevel.None });
    expect(() =>
      setGrant(s, { principal: MEMBER, zoneId: zid, level: CapabilityLevel.None }, OWNER),
    ).toThrow();
  });
});
