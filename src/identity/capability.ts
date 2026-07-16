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
 *
 * **Writes mint ops; reads run against the materialized store.** The store is
 * derived — rebuilt by op replay on boot — so writing to it directly would give
 * grants that vanish on restart, never replicate to peers, are not hash-covered
 * and carry no provenance. An authorization change a peer cannot see is not a
 * boundary, so every mutation here goes through the journal as a first-class,
 * nameable op (`vcs:zoneDefine` / `zoneRename` / `grantSet` / `grantRetract`).
 *
 * **Authority is checked at mint AND enforced at ingest.** `assertOwner` stops
 * an honest caller from over-reaching on the trusted local path;
 * `enforceIngestAuthorization` stops a peer from minting a grant op directly and
 * integrating it past the boundary (ADR 0022 Phase 3). The two are the same
 * check at two ends of one pipe: hash integrity (already at ingest) plus
 * attribution (this module) converge on the single ingest gate.
 */

import type { EAVStore, Fact } from '../core/store/eav-store.js';
import type { EngineContext } from '../vcs/engine-context.js';
import type { VcsOp } from '../vcs/types.js';
import { createVcsOp } from '../vcs/ops.js';
import type { IdentityResolver } from './signing-middleware.js';
import { verifyOpBatch, signOp } from './signing-middleware.js';

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
export async function defineZone(
  ctx: EngineContext,
  zone: Zone,
): Promise<VcsOp> {
  zoneOwner(zone.zoneId); // throws on a malformed id before anything is minted
  const op = await signIfNeeded(
    ctx,
    await createVcsOp('vcs:zoneDefine', {
    agentId: ctx.agentId,
    previousHash: ctx.getLastOp()?.hash,
    vcs: {
      zoneId: zone.zoneId,
      zoneAlias: zone.alias,
      zoneDefaultVisibility: zone.defaultVisibility,
      ...(zone.parentZone ? { zoneParent: zone.parentZone } : {}),
      provenance: ctx.provenance,
    },
  }),
  );
  await ctx.applyOp(op);
  return op;
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
export async function renameZone(
  ctx: EngineContext,
  zoneId: ZoneId,
  alias: string,
): Promise<VcsOp> {
  // `alias` is unbounded, so the prior value has to ride on the op: `decompose`
  // is pure and cannot read the store to find what to delete. Exact for
  // sequential renames; concurrent renames by co-owners can leave two alias
  // facts (ADR 0022 §2's "totally ordered writes" half failing).
  const prior = readAlias(ctx.store, zoneId) ?? '';
  const op = await signIfNeeded(
    ctx,
    await createVcsOp('vcs:zoneRename', {
    agentId: ctx.agentId,
    previousHash: ctx.getLastOp()?.hash,
    vcs: {
      zoneId,
      zoneAlias: alias,
      oldZoneAlias: prior,
      provenance: ctx.provenance,
    },
  }),
  );
  await ctx.applyOp(op);
  return op;
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
export async function setGrant(
  ctx: EngineContext,
  grant: Grant,
  actor: string,
): Promise<VcsOp> {
  if (grant.level === CapabilityLevel.None) {
    throw new Error('CapabilityLevel.None is never persisted; use retractGrant');
  }
  assertOwner(ctx.store, grant.zoneId, actor);
  // No prior level is carried: the grant domain is bounded, so `decompose`
  // enumerates and deletes every possible prior exhaustively.
  const op = await signIfNeeded(
    ctx,
    await createVcsOp('vcs:grantSet', {
      agentId: ctx.agentId,
      previousHash: ctx.getLastOp()?.hash,
      vcs: {
        zoneId: grant.zoneId,
        grantPrincipal: grant.principal,
        grantLevel: grant.level,
        provenance: ctx.provenance,
      },
    }),
  );
  await ctx.applyOp(op);
  return op;
}

/**
 * Retract a grant (revocation). Owner-gated. Removes the grant fact; the
 * principal falls back to `defaultVisibility` / `None`.
 */
export async function retractGrant(
  ctx: EngineContext,
  zoneId: ZoneId,
  principal: string,
  actor: string,
): Promise<VcsOp> {
  assertOwner(ctx.store, zoneId, actor);
  const op = await signIfNeeded(
    ctx,
    await createVcsOp('vcs:grantRetract', {
      agentId: ctx.agentId,
      previousHash: ctx.getLastOp()?.hash,
      vcs: {
        zoneId,
        grantPrincipal: principal,
        provenance: ctx.provenance,
      },
    }),
  );
  await ctx.applyOp(op);
  return op;
}

function assertOwner(store: EAVStore, zoneId: ZoneId, actor: string): void {
  if (resolveCapability(store, actor, zoneId) < CapabilityLevel.Owner) {
    throw new Error(`principal ${actor} is not Owner of zone ${zoneId}`);
  }
}

/**
 * Sign an authorization op at mint when the context carries signing material
 * (ADR 0022 Phase 3). Ops minted with a verified key let the ingest boundary's
 * `IdentityResolver` cryptographically attribute them; without material the op
 * stays unsigned, which is correct for identity-less repos (most tests) where
 * no resolver is wired and the gate only requires a signature envelope.
 */
async function signIfNeeded(
  ctx: EngineContext,
  op: VcsOp,
): Promise<VcsOp> {
  const sm = ctx.signingMaterial;
  if (!sm) return op;
  return signOp(op, sm.privateKey, sm.identityEntityId, sm.signedWith);
}

// ---------------------------------------------------------------------------
// Resolution (Phase 2) — parentZone closure, deny-by-default
// ---------------------------------------------------------------------------

/**
 * Resolve the effective capability level of `principal` over `zone`.
 *
 * `effective = max(defaultVisibility, direct grant, inherited grants…)`
 *
 * - The target zone's `defaultVisibility` is a **floor**, always included.
 * - Direct grant on the zone (if any).
 * - Inherited grants up the `parentZone` chain (closure, `allOf`-style).
 * - `None` if the zone does not exist (deny-by-default).
 *
 * Positive-only (union/max) — no explicit-deny override, which keeps resolution
 * precedence-free. A consequence worth stating: **you cannot grant someone less
 * than the zone's default.** If a principal must have less than the public
 * floor, that is a different zone, not a smaller grant. (Partition, don't
 * filter — the same rule the zone model is built on.)
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

    // The target zone's defaultVisibility is a floor, not a fallback: it applies
    // whether or not a direct grant exists. Suppressing it when a grant is
    // present would let `Reader` on a `Member`-default zone resolve BELOW what a
    // stranger gets — a grant that demotes you, i.e. an explicit-deny, which
    // this model does not have. Resolution stays positive-only:
    //   effective = max(defaultVisibility, direct, inherited…)
    //
    // Only the target zone contributes a default. A parent's default does not
    // inherit, so a private zone nested in a public one stays private — the
    // child's own `defaultVisibility` governs its floor. Grants inherit; floors
    // do not.
    if (current === zoneId) {
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

// ---------------------------------------------------------------------------
// Ingest authorization gate (Phase 3) — the kernel deny-by-default boundary
// ---------------------------------------------------------------------------

/** Op kinds that mutate zone authority and therefore require attribution. */
export const AUTH_OP_KINDS = new Set([
  'vcs:zoneDefine',
  'vcs:zoneRename',
  'vcs:grantSet',
  'vcs:grantRetract',
]);

export interface IngestAuthResult {
  ok: boolean;
  reason?: 'unauthorized';
  message?: string;
}

/**
 * Ingest-time authorization gate (ADR 0022 Phase 3).
 *
 * `integrateOps` already verifies op *integrity* (the hash) but, until now,
 * verified no *attribution* — so a peer could mint a `vcs:grantSet` /
 * `vcs:zoneDefine` op directly and the store would apply it, bypassing the
 * `assertOwner` check that only guards the trusted local mint path
 * (`setGrant` / `defineZone` → `applyOp`). This gate closes that: every
 * authorization-bearing op must be attributable to a principal the zone already
 * trusts at `Owner` (or, for `zoneDefine`, to the identity named in the
 * zoneId — authority is self-describing in the id).
 *
 * Attribution: the op must be signed. When an `IdentityResolver` is wired, the
 * signature is cryptographically verified and `signedBy` is trusted only if it
 * verifies; without a resolver the kernel can at best require a signature
 * envelope to exist (deny-by-default for unattributable auth ops). Full PKI
 * validation is the resolver-wiring follow-on (ADR 0020).
 */
export async function enforceIngestAuthorization(
  store: EAVStore,
  op: VcsOp,
  resolver?: IdentityResolver,
): Promise<IngestAuthResult> {
  if (!AUTH_OP_KINDS.has(op.kind)) return { ok: true };

  const vcs = op.vcs;
  if (!vcs?.zoneId) {
    return {
      ok: false,
      reason: 'unauthorized',
      message: `Auth op '${op.kind}' is missing zoneId`,
    };
  }
  const zoneId = vcs.zoneId;

  // Establish the attested author.
  let author: string | undefined;
  if (resolver) {
    const results = await verifyOpBatch([op], resolver);
    if (results.length === 0 || !results[0].valid) {
      return {
        ok: false,
        reason: 'unauthorized',
        message: `Auth op '${op.kind}' has no valid signature`,
      };
    }
    author = op.vcs?.signedBy;
  } else {
    // No resolver: require at least a signature envelope so an anonymous peer
    // cannot mint auth ops. We cannot verify the key, so `signedBy` is
    // trusted only as a claimed identity for the capability lookup.
    if (!op.vcs?.signature) {
      return {
        ok: false,
        reason: 'unauthorized',
        message: `Auth op '${op.kind}' is unsigned (no identity resolver configured)`,
      };
    }
    author = op.vcs?.signedBy ?? op.agentId;
  }
  if (!author) {
    return {
      ok: false,
      reason: 'unauthorized',
      message: `Auth op '${op.kind}' has no attributable author`,
    };
  }

  if (op.kind === 'vcs:zoneDefine') {
    const owner = zoneOwnerDid(zoneId);
    if (!owner || author !== `identity:${owner}`) {
      return {
        ok: false,
        reason: 'unauthorized',
        message: `zoneDefine not authorized by zone owner for ${zoneId}`,
      };
    }
    return { ok: true };
  }

  // grantSet / grantRetract / zoneRename require Owner.
  if (resolveCapability(store, author, zoneId) < CapabilityLevel.Owner) {
    return {
      ok: false,
      reason: 'unauthorized',
      message: `principal ${author} is not Owner of zone ${zoneId}`,
    };
  }
  return { ok: true };
}
