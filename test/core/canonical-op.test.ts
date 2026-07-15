/**
 * Tests for canonical op hashing (ADR 0021).
 *
 * The property under test is that an op's hash is recomputable from the
 * persisted op — i.e. `hash` is a real content address, not a unique-ish id.
 * Before ADR 0021 the kernel hashed the caller's payload object while backends
 * stored a differently-shaped one, so none of these held.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { createKernelBackend } from '../../src/core/persist/factory.js';
import {
  verifyOpHash,
  hashKernelOp,
  canonicalOpBody,
  OP_PREIMAGE_VERSION,
  PROVENANCE,
} from '../../src/core/persist/canonical-op.js';
import type { KernelBackend, KernelOp } from '../../src/core/persist/backend.js';

describe('canonical op hashing (ADR 0021)', () => {
  let tmpDir: string;
  let backend: KernelBackend;
  let kernel: TrellisKernel;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'trellis-canonical-'));
    backend = await createKernelBackend(join(tmpDir, 'test.db'));
    kernel = new TrellisKernel({ backend, agentId: 'test-agent' });
    kernel.boot();
  });

  afterEach(() => {
    backend.close?.();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // AC #2 — round-trip through *real* persistence, not in-memory equality.
  describe('mint → persist → read → verify', () => {
    it('verifies an op with facts only', async () => {
      const { op } = await kernel.addFact('e:1', 'name', 'hello');
      const readBack = backend.getByHash(op.hash)!;

      expect(readBack).toBeDefined();
      expect(await verifyOpHash(readBack)).toEqual({
        valid: true,
        legacy: false,
      });
    });

    it('verifies an op with links only', async () => {
      const { op } = await kernel.addLink('e:1', 'knows', 'e:2');
      const readBack = backend.getByHash(op.hash)!;

      expect(await verifyOpHash(readBack)).toEqual({
        valid: true,
        legacy: false,
      });
    });

    it('verifies a delete op — the empty-facts/links case that broke v1', async () => {
      await kernel.addLink('e:1', 'knows', 'e:2');
      const { op } = await kernel.removeLink('e:1', 'knows', 'e:2');
      const readBack = backend.getByHash(op.hash)!;

      // This is precisely the shape the old code got wrong: the caller passed
      // only deleteLinks, the kernel coerced facts/links to [], and the backend
      // stored the coerced shape the preimage never saw.
      expect(await verifyOpHash(readBack)).toEqual({
        valid: true,
        legacy: false,
      });
    });

    it('verifies every op in a multi-op chain', async () => {
      await kernel.addFact('e:1', 'name', 'a');
      await kernel.addFact('e:2', 'name', 'b');
      await kernel.addLink('e:1', 'knows', 'e:2');
      await kernel.removeLink('e:1', 'knows', 'e:2');

      const ops = backend.readAll();
      expect(ops.length).toBe(4);

      for (const op of ops) {
        expect(await verifyOpHash(op), `op ${op.kind} failed`).toEqual({
          valid: true,
          legacy: false,
        });
      }
    });

    it('detects tampering with a persisted fact value', async () => {
      const { op } = await kernel.addFact('e:1', 'name', 'hello');
      const tampered: KernelOp = {
        ...backend.getByHash(op.hash)!,
        facts: [{ e: 'e:1', a: 'name', v: 'TAMPERED' }],
      };

      expect(await verifyOpHash(tampered)).toEqual({
        valid: false,
        legacy: false,
      });
    });
  });

  // AC #1 — one serializer. The stored payload column must BE the hashed bytes.
  describe('single serializer', () => {
    it('stores exactly the canonical body that was hashed', async () => {
      const { op } = await kernel.addFact('e:1', 'name', 'hello');
      const readBack = backend.getByHash(op.hash)!;

      const expected = canonicalOpBody({
        facts: [{ e: 'e:1', a: 'name', v: 'hello' }],
      });
      const actual = canonicalOpBody({
        facts: readBack.facts,
        links: readBack.links,
        deleteFacts: readBack.deleteFacts,
        deleteLinks: readBack.deleteLinks,
      });

      expect(actual).toBe(expected);
    });

    it('is insensitive to caller key order', async () => {
      const a = canonicalOpBody({
        facts: [{ e: 'e:1', a: 'name', v: 'x' }],
        links: [{ e1: 'e:1', a: 'knows', e2: 'e:2' }],
      });
      const b = canonicalOpBody({
        links: [{ e1: 'e:1', a: 'knows', e2: 'e:2' }],
        facts: [{ e: 'e:1', a: 'name', v: 'x' }],
      } as any);

      expect(a).toBe(b);
    });

    it('is insensitive to key order within a fact', async () => {
      const a = canonicalOpBody({ facts: [{ e: 'e:1', a: 'name', v: 'x' }] });
      const b = canonicalOpBody({
        facts: [{ v: 'x', a: 'name', e: 'e:1' } as any],
      });

      expect(a).toBe(b);
    });

    it('normalizes absent arrays identically to empty ones', () => {
      expect(canonicalOpBody({ facts: [{ e: 'e:1', a: 'n', v: 1 }] })).toBe(
        canonicalOpBody({
          facts: [{ e: 'e:1', a: 'n', v: 1 }],
          links: [],
          deleteFacts: [],
          deleteLinks: [],
        }),
      );
    });
  });

  // AC #4 — the `|`-injection regression.
  describe('preimage ambiguity', () => {
    it('distinguishes agentId/previousHash split points', async () => {
      const header = { kind: 'addFacts', timestamp: '2026-07-14T00:00:00.000Z' };
      const payload = { facts: [{ e: 'e:1', a: 'n', v: 1 }] };

      const h1 = await hashKernelOp(
        { ...header, agentId: 'a|b', previousHash: 'c' },
        payload,
      );
      const h2 = await hashKernelOp(
        { ...header, agentId: 'a', previousHash: 'b|c' },
        payload,
      );

      // Under the legacy `|`-joined preimage both produced `…|a|b|c|…`.
      expect(h1).not.toBe(h2);
    });

    it('distinguishes an absent previousHash from an empty one', async () => {
      const header = {
        kind: 'addFacts',
        timestamp: '2026-07-14T00:00:00.000Z',
        agentId: 'a',
      };
      const payload = { facts: [{ e: 'e:1', a: 'n', v: 1 }] };

      const absent = await hashKernelOp({ ...header }, payload);
      const empty = await hashKernelOp({ ...header, previousHash: '' }, payload);

      expect(absent).not.toBe(empty);
    });
  });

  // AC #3 — v1 grandfathering.
  describe('v1 legacy ops', () => {
    it('reports a v1 op as legacy rather than invalid', async () => {
      const v1Op: KernelOp = {
        hash: 'trellis:op:whatever-the-old-code-produced',
        kind: 'addFacts',
        timestamp: '2026-01-01T00:00:00.000Z',
        agentId: 'old-agent',
        facts: [{ e: 'e:1', a: 'name', v: 'legacy' }],
        // no `v` — this is what a pre-ADR-0021 op looks like
      };

      expect(await verifyOpHash(v1Op)).toEqual({ valid: true, legacy: true });
    });

    it('round-trips a v1 op through persistence without throwing', async () => {
      const v1Op: KernelOp = {
        hash: 'trellis:op:legacy-op-hash',
        kind: 'addFacts',
        timestamp: '2026-01-01T00:00:00.000Z',
        agentId: 'old-agent',
        facts: [{ e: 'e:1', a: 'name', v: 'legacy' }],
      };
      backend.append(v1Op);

      const readBack = backend.getByHash('trellis:op:legacy-op-hash')!;
      expect(readBack).toBeDefined();
      expect(readBack.facts).toEqual([{ e: 'e:1', a: 'name', v: 'legacy' }]);
    });

    it('does not relabel a v1 op as v2 when persisting it', async () => {
      // Ops ingested from an older peer arrive via appendBatch → append.
      // Stamping the current version onto them would make them claim to be
      // verifiable, and they would then fail verification rather than being
      // grandfathered.
      const v1Op: KernelOp = {
        hash: 'trellis:op:peer-legacy-op',
        kind: 'addFacts',
        timestamp: '2026-01-01T00:00:00.000Z',
        agentId: 'old-peer',
        facts: [{ e: 'e:9', a: 'name', v: 'from-old-peer' }],
      };
      backend.append(v1Op);

      const readBack = backend.getByHash('trellis:op:peer-legacy-op')!;
      expect(readBack.v).toBeUndefined();
      expect(await verifyOpHash(readBack)).toEqual({
        valid: true,
        legacy: true,
      });
    });
  });

  describe('minted ops', () => {
    it('carry the current preimage version', async () => {
      const { op } = await kernel.addFact('e:1', 'name', 'hello');
      expect(op.v).toBe(OP_PREIMAGE_VERSION);
      expect(backend.getByHash(op.hash)!.v).toBe(OP_PREIMAGE_VERSION);
    });
  });

  // ---------------------------------------------------------------------
  // Phase B — provenance (ADR 0021 §2)
  // ---------------------------------------------------------------------

  describe('op-level provenance', () => {
    it('falls back to the kernel default when no surface says otherwise', async () => {
      const { op } = await kernel.addFact('e:1', 'name', 'hello');
      expect(op.provenance).toEqual({ actorType: 'machine', origin: 'sdk' });
    });

    it('honours a kernel-level default (the CLI pattern)', async () => {
      const cliKernel = new TrellisKernel({
        backend,
        agentId: 'cli-agent',
        provenance: PROVENANCE.cli,
        autoReplay: false,
      });
      const { op } = await cliKernel.addFact('e:2', 'name', 'x');

      expect(op.provenance).toEqual({ actorType: 'user', origin: 'cli' });
    });

    it('lets a per-call ctx override the kernel default (the HTTP/MCP pattern)', async () => {
      // One kernel serves several surfaces, so origin must be per-call.
      const { op: mcpOp } = await kernel.addFact('e:3', 'name', 'x', {
        provenance: PROVENANCE.mcp,
      });
      const { op: httpOp } = await kernel.addFact('e:4', 'name', 'y', {
        provenance: PROVENANCE.http,
      });

      expect(mcpOp.provenance).toEqual({ actorType: 'ai', origin: 'mcp' });
      expect(httpOp.provenance).toEqual({ actorType: 'machine', origin: 'http' });
    });

    it('round-trips provenance through persistence and verifies', async () => {
      const { op } = await kernel.addFact('e:5', 'name', 'x', {
        provenance: PROVENANCE.mcp,
      });
      const readBack = backend.getByHash(op.hash)!;

      expect(readBack.provenance).toEqual({ actorType: 'ai', origin: 'mcp' });
      expect(await verifyOpHash(readBack)).toEqual({
        valid: true,
        legacy: false,
      });
    });

    it('is covered by the hash — swapping origin invalidates it', async () => {
      const { op } = await kernel.addFact('e:6', 'name', 'x', {
        provenance: PROVENANCE.mcp,
      });
      const forged: KernelOp = {
        ...backend.getByHash(op.hash)!,
        provenance: PROVENANCE.cli,
      };

      // Provenance that can be altered without invalidating the hash is
      // decoration, not provenance.
      expect(await verifyOpHash(forged)).toEqual({
        valid: false,
        legacy: false,
      });
    });

    it('distinguishes ops differing only in actorType', async () => {
      const header = {
        kind: 'addFacts',
        timestamp: '2026-07-14T00:00:00.000Z',
        agentId: 'a',
      };
      const facts = [{ e: 'e:1', a: 'n', v: 1 }];

      const asAi = await hashKernelOp(header, {
        facts,
        provenance: { actorType: 'ai', origin: 'mcp' },
      });
      const asUser = await hashKernelOp(header, {
        facts,
        provenance: { actorType: 'user', origin: 'mcp' },
      });

      expect(asAi).not.toBe(asUser);
    });
  });

  // AC #6 — value-level provenance.
  describe('value-level provenance (Fact.meta)', () => {
    it('round-trips meta.confidence through persist → read → verify', async () => {
      const { op } = await kernel.addFact('e:7', 'name', 'maybe', undefined, {
        confidence: 0.62,
      });
      const readBack = backend.getByHash(op.hash)!;

      expect(readBack.facts![0]!.meta).toEqual({ confidence: 0.62 });
      expect(await verifyOpHash(readBack)).toEqual({
        valid: true,
        legacy: false,
      });
    });

    it('round-trips full meta with sources', async () => {
      const meta = {
        confidence: 0.9,
        dataTypeId: 'semtype:string',
        sources: [
          {
            authors: ['ada'],
            location: { uri: 'https://example.com/a' },
            loadedAt: '2026-07-14T00:00:00.000Z',
          },
        ],
      };
      const { op } = await kernel.mutate('addFacts', {
        facts: [{ e: 'e:8', a: 'claim', v: 'x', meta }],
      });
      const readBack = backend.getByHash(op.hash)!;

      expect(readBack.facts![0]!.meta).toEqual(meta);
      expect(await verifyOpHash(readBack)).toEqual({
        valid: true,
        legacy: false,
      });
    });

    it('is covered by the hash — editing confidence invalidates it', async () => {
      const { op } = await kernel.addFact('e:9', 'name', 'x', undefined, {
        confidence: 0.5,
      });
      const forged: KernelOp = {
        ...backend.getByHash(op.hash)!,
        facts: [{ e: 'e:9', a: 'name', v: 'x', meta: { confidence: 1.0 } }],
      };

      expect(await verifyOpHash(forged)).toEqual({
        valid: false,
        legacy: false,
      });
    });

    it('distinguishes a fact with meta from the same fact without', async () => {
      const header = {
        kind: 'addFacts',
        timestamp: '2026-07-14T00:00:00.000Z',
        agentId: 'a',
      };
      const bare = await hashKernelOp(header, {
        facts: [{ e: 'e:1', a: 'n', v: 1 }],
      });
      const withMeta = await hashKernelOp(header, {
        facts: [{ e: 'e:1', a: 'n', v: 1, meta: { confidence: 0.5 } }],
      });

      expect(bare).not.toBe(withMeta);
    });

    it('is insensitive to key order inside meta and sources', () => {
      const a = canonicalOpBody({
        facts: [
          {
            e: 'e:1',
            a: 'n',
            v: 1,
            meta: {
              confidence: 0.5,
              sources: [{ authors: ['x'], loadedAt: 't' }],
            },
          },
        ],
      });
      const b = canonicalOpBody({
        facts: [
          {
            e: 'e:1',
            a: 'n',
            v: 1,
            meta: {
              sources: [{ loadedAt: 't', authors: ['x'] }],
              confidence: 0.5,
            } as any,
          },
        ],
      });

      expect(a).toBe(b);
    });
  });
});
