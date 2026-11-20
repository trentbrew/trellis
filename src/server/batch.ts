/**
 * Trellis Server — batch writes (ADR 0065).
 *
 * Compiles a list of entity actions (create, update, delete, link, unlink)
 * into one kernel op. Actions apply in order to a batch-local view of the
 * entities they touch (stored facts and links, then earlier actions), and the
 * net difference against the store is what `mutate()` receives, so the batch
 * is validated and written as one op: all or nothing.
 *
 * Entity rules match the single-entity routes: create stamps `type` and
 * `createdAt`, refuses an existing id, and drops realtime-tier attributes
 * (ADR 0018); update replaces each attribute's values and stamps `updatedAt`;
 * delete removes every fact and link.
 *
 * @module trellis/server
 */

import type { Atom, Fact, Link } from '../core/store/eav-store.js';
import type { KernelOpKind } from '../core/persist/backend.js';
import type { SchemaDefinition } from '../core/ontology/types.js';
import {
  filterDurableAttributes,
  findSchemaForType,
} from '../core/ontology/sync-policy.js';

export const MAX_BATCH_ACTIONS = 1000;

export type BatchAction =
  | {
      op: 'create';
      id: string;
      type: string;
      attributes?: Record<string, unknown>;
      links?: Array<{ attribute: string; targetEntityId: string }>;
    }
  | { op: 'update'; id: string; attributes: Record<string, unknown> }
  | { op: 'delete'; id: string }
  | { op: 'link' | 'unlink'; source: string; attribute: string; target: string };

export type BatchVerb = 'create' | 'update' | 'delete';

/** What the compiler reads: the store as it is, before the batch. */
export interface BatchReader {
  factsOf(entityId: string): Fact[];
  linksOf(entityId: string): Link[];
  ontologies(): Iterable<SchemaDefinition>;
}

export class BatchError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
    readonly index?: number,
  ) {
    super(message);
    this.name = 'BatchError';
  }
}

export interface CompiledBatch {
  kind: KernelOpKind;
  facts: Fact[];
  links: Link[];
  deleteFacts: Fact[];
  deleteLinks: Link[];
  /** Ids the batch created, in order. */
  created: string[];
}

const factKey = (f: Fact) => `${f.e}\u0000${f.a}\u0000${JSON.stringify(f.v)}`;
const linkKey = (l: Link) => `${l.e1}\u0000${l.a}\u0000${l.e2}`;
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Reject a malformed action up front, naming its index. */
export function parseBatch(body: unknown): { commandId?: string; actions: BatchAction[] } {
  if (!body || typeof body !== 'object') throw new BatchError('body must be a JSON object', 400);
  const { commandId, actions } = body as { commandId?: unknown; actions?: unknown };
  if (commandId !== undefined && commandId !== null && !str(commandId)) {
    throw new BatchError('commandId must be a non-empty string', 400);
  }
  if (!Array.isArray(actions) || actions.length === 0) throw new BatchError('actions must be a non-empty array', 400);
  if (actions.length > MAX_BATCH_ACTIONS) {
    throw new BatchError(`at most ${MAX_BATCH_ACTIONS} actions per batch (got ${actions.length})`, 400);
  }
  const out: BatchAction[] = actions.map((raw, index) => {
    const a = (raw ?? {}) as Record<string, unknown>;
    const bad = (why: string): never => {
      throw new BatchError(`actions[${index}]: ${why}`, 400, index);
    };
    const attrs = (v: unknown, required: boolean) => {
      if (v === undefined && !required) return undefined;
      if (!v || typeof v !== 'object' || Array.isArray(v)) return bad('attributes must be an object');
      return v as Record<string, unknown>;
    };
    switch (a.op) {
      case 'create': {
        const id = str(a.id) ?? bad('create needs an id');
        const type = str(a.type) ?? bad('create needs a type');
        const links = a.links === undefined ? undefined : Array.isArray(a.links) ? a.links : bad('links must be an array');
        for (const l of links ?? []) {
          const link = l as Record<string, unknown>;
          if (!str(link?.attribute) || !str(link?.targetEntityId)) bad('each link needs attribute and targetEntityId');
        }
        return { op: 'create', id, type, attributes: attrs(a.attributes, false), links: links as never };
      }
      case 'update':
        return { op: 'update', id: str(a.id) ?? bad('update needs an id'), attributes: attrs(a.attributes, true)! };
      case 'delete':
        return { op: 'delete', id: str(a.id) ?? bad('delete needs an id') };
      case 'link':
      case 'unlink':
        return {
          op: a.op,
          source: str(a.source) ?? bad(`${a.op} needs a source`),
          attribute: str(a.attribute) ?? bad(`${a.op} needs an attribute`),
          target: str(a.target) ?? bad(`${a.op} needs a target`),
        };
      default:
        return bad(`unknown op ${JSON.stringify(a.op)} (create, update, delete, link, unlink)`);
    }
  });
  return { commandId: str(commandId) ?? undefined, actions: out };
}

/**
 * Compile actions into one op's worth of facts and links. `assert` is the
 * per-type permission check (throws to refuse), called once per action.
 */
export function compileBatch(
  actions: BatchAction[],
  reader: BatchReader,
  assert: (type: string, verb: BatchVerb) => void = () => {},
  now: () => string = () => new Date().toISOString(),
): CompiledBatch {
  // Batch-local view: facts per touched entity, and every link seen.
  const original = new Map<string, Fact[]>();
  const current = new Map<string, Fact[]>();
  const originalLinks = new Map<string, Link>();
  const currentLinks = new Map<string, Link>();
  const linksLoaded = new Set<string>();
  // Links an action removed, so loading an entity's links later can't revive them.
  const removedLinks = new Set<string>();
  const created: string[] = [];

  const facts = (id: string): Fact[] => {
    if (!current.has(id)) {
      const stored = reader.factsOf(id);
      original.set(id, stored);
      current.set(id, [...stored]);
    }
    return current.get(id)!;
  };
  const loadLinks = (id: string) => {
    if (linksLoaded.has(id)) return;
    linksLoaded.add(id);
    for (const l of reader.linksOf(id)) {
      const k = linkKey(l);
      if (!originalLinks.has(k)) {
        originalLinks.set(k, l);
        // A link an earlier action removed stays removed.
        if (!removedLinks.has(k)) currentLinks.set(k, l);
      }
    }
  };
  const typeOf = (id: string) => facts(id).find((f) => f.a === 'type')?.v as string | undefined;
  const schemaFor = (type: string) => findSchemaForType(reader.ontologies(), type);

  actions.forEach((action, index) => {
    const fail = (why: string, status: 404 | 409): never => {
      throw new BatchError(`actions[${index}]: ${why}`, status, index);
    };
    switch (action.op) {
      case 'create': {
        const list = facts(action.id);
        if (list.length > 0) fail(`${action.id} already exists`, 409);
        assert(action.type, 'create');
        const attrs = filterDurableAttributes(
          Object.fromEntries(Object.entries(action.attributes ?? {}).filter(([, v]) => v !== undefined)),
          schemaFor(action.type),
        ) as Record<string, Atom>;
        list.push({ e: action.id, a: 'type', v: action.type });
        if (attrs.createdAt === undefined) list.push({ e: action.id, a: 'createdAt', v: now() });
        for (const [a, v] of Object.entries(attrs)) list.push({ e: action.id, a, v });
        for (const l of action.links ?? []) {
          const link = { e1: action.id, a: l.attribute, e2: l.targetEntityId };
          currentLinks.set(linkKey(link), link);
          removedLinks.delete(linkKey(link));
        }
        created.push(action.id);
        return;
      }
      case 'update': {
        const type = typeOf(action.id) ?? fail(`${action.id} not found`, 404);
        assert(type, 'update');
        const attrs = filterDurableAttributes(
          Object.fromEntries(Object.entries(action.attributes).filter(([, v]) => v !== undefined)),
          schemaFor(type),
        ) as Record<string, Atom>;
        const stamp = attrs.updatedAt === undefined ? { ...attrs, updatedAt: now() } : attrs;
        const replaced = new Set(Object.keys(stamp));
        const next = facts(action.id).filter((f) => !replaced.has(f.a));
        for (const [a, v] of Object.entries(stamp)) next.push({ e: action.id, a, v });
        current.set(action.id, next);
        return;
      }
      case 'delete': {
        const type = typeOf(action.id) ?? fail(`${action.id} not found`, 404);
        assert(type, 'delete');
        current.set(action.id, []);
        loadLinks(action.id);
        for (const [k, l] of [...currentLinks]) {
          if (l.e1 === action.id || l.e2 === action.id) {
            currentLinks.delete(k);
            removedLinks.add(k);
          }
        }
        return;
      }
      case 'link':
      case 'unlink': {
        loadLinks(action.source);
        const link = { e1: action.source, a: action.attribute, e2: action.target };
        const k = linkKey(link);
        if (action.op === 'link') {
          currentLinks.set(k, link);
          removedLinks.delete(k);
        } else {
          currentLinks.delete(k);
          removedLinks.add(k);
        }
        return;
      }
    }
  });

  // Net difference against the store.
  const addFacts: Fact[] = [];
  const deleteFacts: Fact[] = [];
  for (const [id, now_] of current) {
    const before = original.get(id) ?? [];
    const beforeKeys = new Set(before.map(factKey));
    const afterKeys = new Set(now_.map(factKey));
    for (const f of now_) if (!beforeKeys.has(factKey(f))) addFacts.push(f);
    for (const f of before) if (!afterKeys.has(factKey(f))) deleteFacts.push(f);
  }
  const addLinks = [...currentLinks].filter(([k]) => !originalLinks.has(k)).map(([, l]) => l);
  // delete loads both directions and unlink loads the source, so every stored
  // link the batch removed is in originalLinks.
  const deleteLinks = [...originalLinks].filter(([k]) => !currentLinks.has(k)).map(([, l]) => l);

  const kind: KernelOpKind = addFacts.length
    ? 'addFacts'
    : addLinks.length
      ? 'addLinks'
      : deleteFacts.length
        ? 'deleteFacts'
        : 'deleteLinks';
  return { kind, facts: addFacts, links: addLinks, deleteFacts, deleteLinks, created };
}

/** Whether a compiled batch changes anything. */
export const isEmptyBatch = (b: CompiledBatch) =>
  !b.facts.length && !b.links.length && !b.deleteFacts.length && !b.deleteLinks.length;
