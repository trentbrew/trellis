/**
 * Capability Model — Zone-scoped read/write authorization
 *
 * ADR 0022. Resolves the §5 "room = boundary" decision and the §2a refs
 * decision under one principle: partition, don't filter.
 *
 * The kernel understands only four capability levels and opaque `zoneId`s.
 * Zone *names* ("Workshop", "Lab", …) are a mutable `alias` fact and never
 * appear in kernel logic, so renaming a zone never requires a refactor.
 *
 * Grants are explicit (principal, zoneId, level) facts. Absence = `None`
 * (deny-by-default). Revocation retracts the grant fact; `None` is never
 * persisted. Nesting via `parentZone` yields a capability closure.
 */

import type { EAVStore, Fact } from '../core/store/eav-store.js';

// ---------------------------------------------------------------------------
// Capability levels
// ---------------------------------------------------------------------------

/**
 * Capability levels, ordered. Higher numeric value = broader access, so
 * "at least level L" is a simple ordinal comparison.
 *
 * `None` is the deny-by-default absence of a grant. It is NEVER persisted as a
 * fact (see ADR 0022 §1): revocation retracts the grant fact instead.
 */
export enum CapabilityLevel {
  None = 0, // absence of grant = default. Never persisted.
  Reader = 1, // read-only within the boundary
  Member = 2, // read + write within the boundary
  Owner = 3, // administer grants + full access; MAY be multi-principal
}

// ---------------------------------------------------------------------------
// Zone model
// ---------------------------------------------------------------------------

/** Authoritative zone id: `turtle://<ownerDid>/zone/<uuid>`. Immutable. */
export type ZoneId = string;

export interface Zone {
  /** Immutable, authority-bearing identifier. */
  zoneId: ZoneId;
  /** Mutable human name. Renaming edits this, never the id. */
  alias: string;
  /** Level granted to anon (Reader = public; None = private). */
  defaultVisibility: CapabilityLevel;
  /** Opaque parent zoneId for nesting → grant inheritance (closure). */
  parentZone?: ZoneId;
}

/** A single explicit capability grant. */
export interface Grant {
  principal: string; // Agent Ed25519 did:key entity id
  zoneId: ZoneId;
  level: CapabilityLevel;
}

// Graph entity ids + attribute names (facts, not kernel vocabulary).
const ZONE_PREFIX = 'zone:';
const grantEntity = (zoneId: ZoneId) => `${ZONE_PREFIX}${zoneId}`;

// A grant is stored as a per-principal attribute so its value stays a clean
// Atom (the level) and the principal is part of the key: `grant:<principal>`.
const GRANT_PREFIX = 'grant:';
const grantAttr = (principal: string) => `${GRANT_PREFIX}${principal}`;

// ---------------------------------------------------------------------------
// zoneId construction
// ---------------------------------------------------------------------------

/**
 * Build an immutable, authority-bearing zone id.
 * `turtle://<ownerDid>/zone/<uuid>` — ownership is self-describing in the id.
 */
export function makeZoneId(ownerDid: string, uuid: string): ZoneId {
  return `turtle://${ownerDid}/zone/${uuid}`;
}

/** Parse the owner DID out of a zoneId, or null if malformed. */
export function zoneOwnerDid(zoneId: ZoneId): string | null {
  const m = /^turtle:\/\/(.+?)\/zone\/.+$/.exec(zoneId);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Registry ops (Phase 1)
// ---------------------------------------------------------------------------

/**
 * Define a zone. `alias` is the only mutable display field; `zoneId` is fixed.
 * The zone's owner (from the id) is auto-granted `Owner` so the zone is
 * administerable from creation; subsequent grants are Owner-gated.
 */
export function defineZone(store: EAVStore, zone: Zone): void {
  const e = grantEntity(zone.zoneId);
  const facts: Fact[] = [
    { e, a: 'type', v: 'Zone' },
    { e, a: 'zoneId', v: zone.zoneId },
    { e, a: 'alias', v: zone.alias },
    { e, a: 'defaultVisibility', v: zone.defaultVisibility },
    { e, a: grantAttr(zoneOwner(zone.zoneId)), v: CapabilityLevel.Owner },
  ];
  if (zone.parentZone) {
    facts.push({ e, a: 'parentZone', v: zone.parentZone });
  }
  store.addFacts(facts);
}

/** Owner principal derived from the zoneId's authority. */
function zoneOwner(zoneId: ZoneId): string {
  const did = zoneOwnerDid(zoneId);
  if (!did) throw new Error(`malformed zoneId: ${zoneId}`);
  return `identity:${did}`;
}

/**
 * Rename a zone. Edits only the `alias` fact — `zoneId` and all grants are
 * untouched. This is the rename-proof guarantee (ADR 0022 §2).
 */
export function renameZone(store: EAVStore, zoneId: ZoneId, alias: string): void {
  const e = grantEntity(zoneId);
  const prior = readAlias(store, zoneId) ?? '';
  store.deleteFacts([{ e, a: 'alias', v: prior }]);
  store.addFacts([{ e, a: 'alias', v: alias }]);
}

function readAlias(store: EAVStore, zoneId: ZoneId): string | undefined {
  return store
    .getFactsByEntity(grantEntity(zoneId))
    .find((f) => f.a === 'alias')?.v as string | undefined;
}

/** Load a zone definition from the store. */
export function getZone(store: EAVStore, zoneId: ZoneId): Zone | undefined {
  const facts = store.getFactsByEntity(grantEntity(zoneId));
  if (!facts.some((f) => f.a === 'type' && f.v === 'Zone')) return undefined;
  const get = (a: string) => facts.find((f) => f.a === a)?.v;
  const parent = get('parentZone') as string | undefined;
  return {
    zoneId,
    alias: (get('alias') as string) ?? '',
    defaultVisibility: (get('defaultVisibility') as CapabilityLevel) ?? CapabilityLevel.None,
    ...(parent ? { parentZone: parent } : {}),
  };
}

// ---------------------------------------------------------------------------
// Grant ops (Phase 1) — Owner-gated
// ---------------------------------------------------------------------------

/**
 * Set a grant. Only an existing `Owner` of the zone may mutate grants
 * (ADR 0022 invariant). `level` of `None` is rejected — revoke via
 * `retractGrant` instead, so `None` is never persisted.
 */
export function setGrant(
  store: EAVStore,
  grant: Grant,
  actor: string,
): void {
  if (grant.level === CapabilityLevel.None) {
    throw new Error('CapabilityLevel.None is never persisted; use retractGrant');
  }
  assertOwner(store, grant.zoneId, actor);
  const e = grantEntity(grant.zoneId);
  // Replace any prior grant for this principal on this zone (bounded domain).
  retractGrant(store, grant.zoneId, grant.principal, actor);
  store.addFacts([{ e, a: grantAttr(grant.principal), v: grant.level }]);
}

/**
 * Retract a grant (revocation). Owner-gated. Removes the grant fact; the
 * principal falls back to `defaultVisibility` / `None`.
 */
export function retractGrant(
  store: EAVStore,
  zoneId: ZoneId,
  principal: string,
  actor: string,
): void {
  assertOwner(store, zoneId, actor);
  const e = grantEntity(zoneId);
  const existing = store
    .getFactsByEntity(e)
    .filter((f) => f.a === grantAttr(principal));
  store.deleteFacts(existing);
}

function assertOwner(store: EAVStore, zoneId: ZoneId, actor: string): void {
  if (resolveCapability(store, actor, zoneId) < CapabilityLevel.Owner) {
    throw new Error(`principal ${actor} is not Owner of zone ${zoneId}`);
  }
}

// ---------------------------------------------------------------------------
// Resolution (Phase 2) — parentZone closure, deny-by-default
// ---------------------------------------------------------------------------

/**
 * Resolve the effective capability level of `principal` over `zone`.
 *
 * - Direct grant on the zone (if any).
 * - Inherited grants up the `parentZone` chain (closure, `allOf`-style).
 * - `defaultVisibility` if the principal has no direct/inherited grant.
 * - `None` if the zone does not exist (deny-by-default).
 *
 * Inheritance is positive-only (union/max) — no explicit-deny override, which
 * keeps resolution precedence-free.
 */
export function resolveCapability(
  store: EAVStore,
  principal: string,
  zoneId: ZoneId,
): CapabilityLevel {
  const visited = new Set<ZoneId>();
  let best = CapabilityLevel.None;
  let current: ZoneId | undefined = zoneId;

  while (current && !visited.has(current)) {
    visited.add(current);
    const zone = getZone(store, current);
    if (!zone) break; // unknown zone → deny

    const direct = readGrant(store, current, principal);
    if (direct !== undefined) best = Math.max(best, direct);

    // First zone in the chain supplies defaultVisibility for anon-equivalent.
    if (current === zoneId && direct === undefined) {
      best = Math.max(best, zone.defaultVisibility);
    }
    current = zone.parentZone;
  }

  return best as CapabilityLevel;
}

function readGrant(
  store: EAVStore,
  zoneId: ZoneId,
  principal: string,
): CapabilityLevel | undefined {
  const e = grantEntity(zoneId);
  const fact = store
    .getFactsByEntity(e)
    .find((f) => f.a === grantAttr(principal));
  return fact ? (fact.v as CapabilityLevel) : undefined;
}
