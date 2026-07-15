/**
 * Grants must survive a reboot and reach peers (ADR 0022).
 *
 * The capability module's writes originally went straight to `EAVStore`. That
 * store is *derived* — rematerialized from the op log on boot — so grants
 * written that way exist only in the process that wrote them: they vanish on
 * restart, never replicate, are not hash-covered, and carry no provenance.
 *
 * This matters most for the thing ADR 0022 exists to enable. Phase 3 is
 * deny-by-default enforcement; built on evaporating grants, the first reboot
 * drops every grant, `resolveCapability` returns `None` for everyone, and the
 * repo locks itself out.
 *
 * These tests use a real engine and a real reboot, because the original
 * capability tests were store-isolated and could not have caught this.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import {
  CapabilityLevel,
  makeZoneId,
  defineZone,
  setGrant,
  retractGrant,
  renameZone,
  getZone,
  resolveCapability,
} from '../../src/identity/capability.js';

const TEST_ROOT = join(tmpdir(), 'trellis-capability-persistence');

const OWNER_DID = 'did:key:zowner';
const OWNER = `identity:${OWNER_DID}`;
const MEMBER = 'identity:did:key:zmember';
const ZONE = makeZoneId(OWNER_DID, 'workshop-1');

describe('capability persistence (ADR 0022)', () => {
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
    engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  /** Re-open the repo from disk — the store is rebuilt purely by op replay. */
  function reboot(): TrellisVcsEngine {
    const next = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    next.open();
    return next;
  }

  test('a zone survives a reboot', async () => {
    await defineZone(engine.capabilityContext(), {
      zoneId: ZONE,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });

    const after = reboot();
    const zone = getZone(after.getEavStore(), ZONE);

    expect(zone).toBeDefined();
    expect(zone!.alias).toBe('Workshop');
  });

  test('a grant survives a reboot — the lockout regression', async () => {
    const ctx = engine.capabilityContext();
    await defineZone(ctx, {
      zoneId: ZONE,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });
    await setGrant(ctx, { principal: MEMBER, zoneId: ZONE, level: CapabilityLevel.Member }, OWNER);

    expect(resolveCapability(engine.getEavStore(), MEMBER, ZONE)).toBe(CapabilityLevel.Member);

    const after = reboot();

    // Before the fix this was None — every grant gone, deny-by-default locking
    // the repo against its own members.
    expect(resolveCapability(after.getEavStore(), MEMBER, ZONE)).toBe(CapabilityLevel.Member);
    expect(resolveCapability(after.getEavStore(), OWNER, ZONE)).toBe(CapabilityLevel.Owner);
  });

  test('a retraction survives a reboot (revocation must not resurrect)', async () => {
    const ctx = engine.capabilityContext();
    await defineZone(ctx, {
      zoneId: ZONE,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });
    await setGrant(ctx, { principal: MEMBER, zoneId: ZONE, level: CapabilityLevel.Member }, OWNER);
    await retractGrant(ctx, ZONE, MEMBER, OWNER);

    const after = reboot();

    // A revocation that replays as "grant then nothing" would silently
    // re-grant access on every restart.
    expect(resolveCapability(after.getEavStore(), MEMBER, ZONE)).toBe(CapabilityLevel.None);
  });

  test('a rename survives a reboot and keeps grants intact', async () => {
    const ctx = engine.capabilityContext();
    await defineZone(ctx, {
      zoneId: ZONE,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });
    await setGrant(ctx, { principal: MEMBER, zoneId: ZONE, level: CapabilityLevel.Reader }, OWNER);
    await renameZone(ctx, ZONE, 'Workspace');

    const after = reboot();

    expect(getZone(after.getEavStore(), ZONE)!.alias).toBe('Workspace');
    expect(resolveCapability(after.getEavStore(), MEMBER, ZONE)).toBe(CapabilityLevel.Reader);
  });

  test('grants are ops — hash-covered, attributable, and replicable', async () => {
    const ctx = engine.capabilityContext();
    await defineZone(ctx, {
      zoneId: ZONE,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });
    const op = await setGrant(
      ctx,
      { principal: MEMBER, zoneId: ZONE, level: CapabilityLevel.Member },
      OWNER,
    );

    // An authorization change a peer cannot see is not a boundary.
    expect(op.kind).toBe('vcs:grantSet');
    expect(op.hash).toMatch(/^trellis:op:/);
    expect(op.vcs?.provenance).toBeDefined();

    const { verifyVcsOpHash } = await import('../../src/vcs/ops.js');
    expect(await verifyVcsOpHash(op)).toBe(true);

    // And it is in the journal, not just the derived store.
    expect(reboot().getOps().some((o) => o.hash === op.hash)).toBe(true);
  });
});
