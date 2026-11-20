/**
 * ADR 0065 — POST /batch (one op, command id in provenance) and links in reads.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { startServer } from '../../src/server/server.js';
import { TenantPool } from '../../src/server/tenancy.js';
import { defaultLocalConfig } from '../../src/client/config.js';
import type { TrellisHttpServer } from '../../src/server/server-shared.js';
import { BatchError, compileBatch, parseBatch, type BatchReader } from '../../src/server/batch.js';
import type { Fact, Link } from '../../src/core/store/eav-store.js';
import type { KernelMiddleware } from '../../src/core/kernel/middleware.js';

// ---------------------------------------------------------------- compiler

function reader(facts: Fact[] = [], links: Link[] = []): BatchReader {
  return {
    factsOf: (id) => facts.filter((f) => f.e === id),
    linksOf: (id) => links.filter((l) => l.e1 === id || l.e2 === id),
    ontologies: () => [],
  };
}
const NOW = () => '2026-11-19T00:00:00.000Z';

describe('compileBatch', () => {
  it('create then update in one batch is one net set of facts', () => {
    const b = compileBatch(
      [
        { op: 'create', id: 'task:1', type: 'Task', attributes: { title: 'A', status: 'todo' } },
        { op: 'update', id: 'task:1', attributes: { status: 'done' } },
      ],
      reader(),
      undefined,
      NOW,
    );
    expect(b.created).toEqual(['task:1']);
    expect(b.deleteFacts).toEqual([]);
    const attrs = Object.fromEntries(b.facts.map((f) => [f.a, f.v]));
    expect(attrs).toEqual({ type: 'Task', createdAt: NOW(), title: 'A', status: 'done', updatedAt: NOW() });
    expect(b.kind).toBe('addFacts');
  });

  it('update replaces stored values: old fact deleted, new one added', () => {
    const stored: Fact[] = [
      { e: 'task:1', a: 'type', v: 'Task' },
      { e: 'task:1', a: 'status', v: 'todo' },
    ];
    const b = compileBatch([{ op: 'update', id: 'task:1', attributes: { status: 'done' } }], reader(stored), undefined, NOW);
    expect(b.deleteFacts).toEqual([{ e: 'task:1', a: 'status', v: 'todo' }]);
    expect(b.facts).toContainEqual({ e: 'task:1', a: 'status', v: 'done' });
  });

  it('refuses an existing id (409) and a missing one (404), naming the action', () => {
    const stored: Fact[] = [{ e: 'task:1', a: 'type', v: 'Task' }];
    const err = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return e as BatchError;
      }
      throw new Error('expected a BatchError');
    };
    const dup = err(() => compileBatch([{ op: 'create', id: 'task:1', type: 'Task' }], reader(stored)));
    expect([dup.status, dup.index]).toEqual([409, 0]);
    const missing = err(() =>
      compileBatch([{ op: 'create', id: 'task:2', type: 'Task' }, { op: 'delete', id: 'task:9' }], reader(stored)),
    );
    expect([missing.status, missing.index]).toEqual([404, 1]);
  });

  it('delete removes facts and links in both directions', () => {
    const stored: Fact[] = [
      { e: 'person:a', a: 'type', v: 'Person' },
      { e: 'org:x', a: 'type', v: 'Org' },
    ];
    const links: Link[] = [
      { e1: 'person:a', a: 'memberOf', e2: 'org:x' },
      { e1: 'org:x', a: 'owner', e2: 'person:a' },
    ];
    const b = compileBatch([{ op: 'delete', id: 'person:a' }], reader(stored, links));
    expect(b.deleteFacts).toEqual([{ e: 'person:a', a: 'type', v: 'Person' }]);
    expect(b.deleteLinks).toHaveLength(2);
  });

  it('link and unlink net out; unlinking a stored link deletes it', () => {
    const links: Link[] = [{ e1: 'a', a: 'rel', e2: 'b' }];
    const b = compileBatch(
      [
        { op: 'link', source: 'a', attribute: 'rel', target: 'c' },
        { op: 'unlink', source: 'a', attribute: 'rel', target: 'c' },
        { op: 'unlink', source: 'a', attribute: 'rel', target: 'b' },
      ],
      reader([], links),
    );
    expect(b.links).toEqual([]);
    expect(b.deleteLinks).toEqual([{ e1: 'a', a: 'rel', e2: 'b' }]);
    expect(b.kind).toBe('deleteLinks');
  });

  it('checks permissions per action with the entity type', () => {
    const seen: string[] = [];
    compileBatch(
      [{ op: 'create', id: 'x:1', type: 'X' }, { op: 'update', id: 'x:1', attributes: { a: 1 } }],
      reader(),
      (type, verb) => seen.push(`${verb} ${type}`),
    );
    expect(seen).toEqual(['create X', 'update X']);
  });

  it('parseBatch rejects malformed bodies with the index', () => {
    expect(() => parseBatch({ actions: [] })).toThrow(/non-empty/);
    expect(() => parseBatch({ actions: [{ op: 'create', id: 'a' }] })).toThrow(/actions\[0\]: create needs a type/);
    expect(() => parseBatch({ actions: [{ op: 'nope' }] })).toThrow(/unknown op/);
    expect(parseBatch({ commandId: 'cmd:1', actions: [{ op: 'delete', id: 'a' }] }).commandId).toBe('cmd:1');
  });
});

// ---------------------------------------------------------------- HTTP

const TMP = join(dirname(fileURLToPath(import.meta.url)), `__tmp_batch-${process.pid}-${Date.now().toString(36)}`);
const DB_PATH = join(TMP, 'data');
let server: TrellisHttpServer;
let pool: TenantPool;
let base: string;

beforeAll(async () => {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  pool = new TenantPool(DB_PATH, { backend: { backend: 'sqljs' } });
  const kernel = await pool.preload();
  // Refuses any op touching `poison:*`, as schema validation would.
  const poison: KernelMiddleware = {
    name: 'test-poison',
    handleOp: async (op, ctx, next) => {
      if (op.facts?.some((f) => f.e.startsWith('poison:'))) throw new Error('poisoned');
      return next(op, ctx);
    },
  };
  kernel.addMiddleware(poison);
  server = await startServer({ port: 0, config: defaultLocalConfig(DB_PATH), pool });
  base = `http://127.0.0.1:${server.port}`;
});

afterAll(async () => {
  if (server) await Promise.resolve(server.stop(true));
  if (existsSync(TMP)) rmSync(TMP, { recursive: true });
});

const post = (body: unknown) =>
  fetch(`${base}/batch`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('POST /batch', () => {
  it('writes several entities and a link as one op carrying the command id', async () => {
    const before = pool.get().readAllOps().length;
    const res = await post({
      commandId: 'cmd:test:1',
      actions: [
        { op: 'create', id: 'org:x', type: 'Org', attributes: { name: 'X' } },
        { op: 'create', id: 'person:a', type: 'Person', attributes: { name: 'A' } },
        { op: 'link', source: 'person:a', attribute: 'memberOf', target: 'org:x' },
      ],
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { op: string; commandId: string; created: string[] };
    expect(body.created).toEqual(['org:x', 'person:a']);
    const ops = pool.get().readAllOps();
    expect(ops.length).toBe(before + 1);
    const op = ops.at(-1)!;
    expect(op.hash).toBe(body.op);
    expect(op.provenance).toMatchObject({ origin: 'http', commandId: 'cmd:test:1' });
    expect(op.links).toEqual([{ e1: 'person:a', a: 'memberOf', e2: 'org:x' }]);
  });

  it('writes nothing when middleware refuses the op', async () => {
    const before = pool.get().readAllOps().length;
    const res = await post({
      actions: [
        { op: 'create', id: 'fine:1', type: 'Thing' },
        { op: 'create', id: 'poison:1', type: 'Thing' },
      ],
    });
    expect(res.status).toBe(422);
    expect(pool.get().readAllOps().length).toBe(before);
    expect(pool.get().getEntity('fine:1')).toBeNull();
  });

  it('writes nothing when a later action is invalid', async () => {
    const res = await post({ actions: [{ op: 'create', id: 'fine:2', type: 'Thing' }, { op: 'update', id: 'missing:1', attributes: { a: 1 } }] });
    expect(res.status).toBe(404);
    expect(((await res.json()) as { index: number }).index).toBe(1);
    expect(pool.get().getEntity('fine:2')).toBeNull();
  });
});

describe('links in reads (?links=1)', () => {
  it('adds @links to a read and to list pages only when asked', async () => {
    const plain = (await (await fetch(`${base}/entities/person:a`)).json()) as Record<string, unknown>;
    expect(plain['@links']).toBeUndefined();
    const withLinks = (await (await fetch(`${base}/entities/person:a?links=1`)).json()) as Record<string, unknown>;
    expect(withLinks['@links']).toEqual([{ e1: 'person:a', a: 'memberOf', e2: 'org:x' }]);
    const list = (await (await fetch(`${base}/entities?type=Org&links=1`)).json()) as { data: Record<string, unknown>[] };
    expect(list.data[0]!['@links']).toEqual([{ e1: 'person:a', a: 'memberOf', e2: 'org:x' }]);
  });
});
