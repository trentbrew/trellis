/**
 * Entity Lifecycle Module
 *
 * Generic archive / unarchive / tombstone primitives that work on any
 * entity type (Issue, File, Decision, CMS items, custom user-defined).
 *
 * Two deletion modes:
 *
 * - **Archive** (soft): sets `archived: true` fact. Hidden from default
 *   queries, reversible via `unarchiveEntity`. History preserved.
 *
 * - **Tombstone** (hard): retracts every fact and edge for the entity.
 *   Records a `tombstoned` marker so queries can distinguish "never
 *   existed" from "tombstoned." Irreversible (per design decision —
 *   break-refs policy means inbound wikilinks become broken placeholders).
 *
 * Replay safety: tombstone embeds the snapshot of facts/links it retracts
 * directly into the op payload. Decompose stays a pure function.
 */

import { createVcsOp } from './ops.js';
import type { VcsOp } from './types.js';
import type { EngineContext } from './engine-context.js';

// ---------------------------------------------------------------------------
// Cascade rules
// ---------------------------------------------------------------------------

/**
 * Defines how to find child entities for a given entity, by walking
 * specific link attributes in a given direction.
 */
interface CascadeRule {
  /** Match entities whose ID starts with this prefix. */
  entityPrefix: string;
  /** Link attribute that names a "child-of" relationship. */
  linkAttribute: string;
  /**
   * Direction:
   * - 'reverse' = child links to parent. We want links where e2 = parent;
   *   the e1's are the children.
   * - 'forward' = parent links to children directly.
   */
  direction: 'forward' | 'reverse';
}

const CASCADE_RULES: CascadeRule[] = [
  // Issue → Criteria (criteria link via `criterionOf` to their parent issue)
  {
    entityPrefix: 'issue:',
    linkAttribute: 'criterionOf',
    direction: 'reverse',
  },
  // File → Symbols (symbols link via `definedIn` to their parent file)
  {
    entityPrefix: 'file:',
    linkAttribute: 'definedIn',
    direction: 'reverse',
  },
];

/**
 * Resolves the child entity IDs for a given entity, per cascade rules.
 */
function findChildren(ctx: EngineContext, entityId: string): string[] {
  const children: string[] = [];
  for (const rule of CASCADE_RULES) {
    if (!entityId.startsWith(rule.entityPrefix)) continue;
    if (rule.direction === 'reverse') {
      const links = ctx.store
        .getLinksByAttribute(rule.linkAttribute)
        .filter((l) => l.e2 === entityId);
      for (const l of links) children.push(l.e1);
    } else {
      const links = ctx.store
        .getLinksByEntity(entityId)
        .filter((l) => l.a === rule.linkAttribute && l.e1 === entityId);
      for (const l of links) children.push(l.e2);
    }
  }
  return children;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function entityExists(ctx: EngineContext, entityId: string): boolean {
  const facts = ctx.store.getFactsByEntity(entityId);
  // An entity "exists" if it has a `type` fact or any non-tombstone fact.
  return facts.some((f) => f.a === 'type');
}

function isArchived(ctx: EngineContext, entityId: string): boolean {
  const facts = ctx.store.getFactsByEntity(entityId);
  const archivedFacts = facts.filter((f) => f.a === 'archived');
  if (archivedFacts.length === 0) return false;
  return archivedFacts[archivedFacts.length - 1].v === 'true';
}

function isTombstoned(ctx: EngineContext, entityId: string): boolean {
  const facts = ctx.store.getFactsByEntity(entityId);
  return facts.some((f) => f.a === 'tombstoned' && f.v === 'true');
}

// ---------------------------------------------------------------------------
// Archive (soft delete)
// ---------------------------------------------------------------------------

export interface ArchiveOptions {
  reason?: string;
  /** Also archive children per cascade rules. Default true. */
  cascade?: boolean;
}

export interface ArchiveResult {
  op: VcsOp;
  cascadedEntityIds: string[];
}

/**
 * Archive any entity. Reversible via `unarchiveEntity`.
 */
export async function archiveEntity(
  ctx: EngineContext,
  entityId: string,
  opts?: ArchiveOptions,
): Promise<ArchiveResult> {
  if (!entityExists(ctx, entityId)) {
    throw new Error(`Entity ${entityId} not found.`);
  }
  if (isTombstoned(ctx, entityId)) {
    throw new Error(`Entity ${entityId} is tombstoned and cannot be archived.`);
  }
  if (isArchived(ctx, entityId)) {
    throw new Error(`Entity ${entityId} is already archived.`);
  }

  const cascade = opts?.cascade ?? true;
  const cascadedEntityIds = cascade ? findChildren(ctx, entityId) : [];

  const op = await createVcsOp('vcs:entityArchive', {
    agentId: ctx.agentId,
    previousHash: ctx.getLastOp()?.hash,
    vcs: {
      entityId,
      archiveReason: opts?.reason,
      cascadedEntityIds:
        cascadedEntityIds.length > 0 ? cascadedEntityIds : undefined,
    },
  });
  ctx.applyOp(op);

  return { op, cascadedEntityIds };
}

/**
 * Restore an archived entity.
 *
 * Note: cascaded children archived as part of the original archive op are
 * also un-archived. Other relationships (e.g. blocking links) that were
 * cleaned up separately must be re-established manually.
 */
export async function unarchiveEntity(
  ctx: EngineContext,
  entityId: string,
): Promise<VcsOp> {
  if (!entityExists(ctx, entityId)) {
    throw new Error(`Entity ${entityId} not found.`);
  }
  if (!isArchived(ctx, entityId)) {
    throw new Error(`Entity ${entityId} is not archived.`);
  }

  // Re-discover cascade children to also unarchive them.
  const cascadedEntityIds = findChildren(ctx, entityId).filter((cid) =>
    isArchived(ctx, cid),
  );

  const op = await createVcsOp('vcs:entityUnarchive', {
    agentId: ctx.agentId,
    previousHash: ctx.getLastOp()?.hash,
    vcs: {
      entityId,
      cascadedEntityIds:
        cascadedEntityIds.length > 0 ? cascadedEntityIds : undefined,
    },
  });
  ctx.applyOp(op);
  return op;
}

// ---------------------------------------------------------------------------
// Tombstone (hard delete)
// ---------------------------------------------------------------------------

export interface TombstoneOptions {
  reason?: string;
  /** Also tombstone children per cascade rules. Default true. */
  cascade?: boolean;
}

export interface TombstoneResult {
  op: VcsOp;
  cascadedEntityIds: string[];
  factsRetracted: number;
  linksRetracted: number;
}

/**
 * Tombstone (permanently delete) an entity. Retracts every fact and link
 * touching the entity. Records a `tombstoned: true` marker so queries can
 * distinguish "never existed" from "tombstoned." Irreversible.
 *
 * Per the break-refs policy, incoming references (links from other entities
 * pointing at this one) are also retracted. UI layers that render wikilinks
 * by re-reading source content will see them resolve to a tombstoned
 * placeholder (target entity has tombstoned=true but no other facts).
 */
export async function tombstoneEntity(
  ctx: EngineContext,
  entityId: string,
  opts?: TombstoneOptions,
): Promise<TombstoneResult> {
  // Order matters: tombstoned entities have no `type` fact, so the
  // tombstone check must come first to surface a clearer error.
  if (isTombstoned(ctx, entityId)) {
    throw new Error(`Entity ${entityId} is already tombstoned.`);
  }
  if (!entityExists(ctx, entityId)) {
    throw new Error(`Entity ${entityId} not found.`);
  }

  const cascade = opts?.cascade ?? true;
  const childIds = cascade ? findChildren(ctx, entityId) : [];

  // Tombstone children first (each emits its own op for clean audit).
  const cascadedEntityIds: string[] = [];
  for (const childId of childIds) {
    if (!isTombstoned(ctx, childId)) {
      await tombstoneEntity(ctx, childId, { cascade: true });
      cascadedEntityIds.push(childId);
    }
  }

  // Snapshot every fact on this entity (will be retracted by decompose).
  const tombstoneFacts = ctx.store
    .getFactsByEntity(entityId)
    .map((f) => ({ e: f.e, a: f.a, v: f.v }));

  // Snapshot outgoing and incoming links.
  const allLinks = ctx.store.getLinksByEntity(entityId);
  const tombstoneOutLinks = allLinks
    .filter((l) => l.e1 === entityId)
    .map((l) => ({ e1: l.e1, a: l.a, e2: l.e2 }));
  const tombstoneInLinks = allLinks
    .filter((l) => l.e2 === entityId)
    .map((l) => ({ e1: l.e1, a: l.a, e2: l.e2 }));

  const op = await createVcsOp('vcs:entityTombstone', {
    agentId: ctx.agentId,
    previousHash: ctx.getLastOp()?.hash,
    vcs: {
      entityId,
      tombstoneReason: opts?.reason,
      tombstoneFacts: tombstoneFacts.length > 0 ? tombstoneFacts : undefined,
      tombstoneOutLinks:
        tombstoneOutLinks.length > 0 ? tombstoneOutLinks : undefined,
      tombstoneInLinks:
        tombstoneInLinks.length > 0 ? tombstoneInLinks : undefined,
    },
  });
  ctx.applyOp(op);

  return {
    op,
    cascadedEntityIds,
    factsRetracted: tombstoneFacts.length,
    linksRetracted: tombstoneOutLinks.length + tombstoneInLinks.length,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns true if the entity has been tombstoned. Useful for renderers
 * that want to distinguish a missing wikilink target from a deliberately
 * deleted one.
 */
export function isEntityTombstoned(
  ctx: EngineContext,
  entityId: string,
): boolean {
  return isTombstoned(ctx, entityId);
}

/**
 * Returns true if the entity is currently archived.
 */
export function isEntityArchived(
  ctx: EngineContext,
  entityId: string,
): boolean {
  return isArchived(ctx, entityId);
}
