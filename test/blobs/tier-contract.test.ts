/**
 * Contract suite for the blob tier seam (ADR 0016 / 0017).
 *
 * One suite run against every rung. A new tier is correct when it passes this
 * unchanged — that is the point of having an interface at all.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { MemoryBlobTier } from '../../src/blobs/memory.js';
import { OpfsBlobTier } from '../../src/blobs/opfs.js';
import { relayTier } from '../../src/blobs/relay.js';
import { diskTier } from '../../src/blobs/node.js';
import { createBlobLadder } from '../../src/blobs/ladder.js';
import { hashBlob, type BlobTier } from '../../src/blobs/tier.js';
import { BlobStore } from '../../src/vcs/blob-store.js';
import { createBlobClient } from '../../src/realtime/blob-client.js';
import { createFakeOpfsRoot } from './fake-opfs.js';

const bytes = (text: string) => new TextEncoder().encode(text);

/** An in-memory stand-in for the relay's `/blob` HTTP surface. */
function fakeRelayFetch(): typeof fetch {
  const stored = new Map<string, Uint8Array>();
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const hash = url.pathname.replace('/blob/', '').replace('/blob', '');
    const method = init?.method ?? 'GET';

    if (method === 'PUT') {
      const body = new Uint8Array(init?.body as ArrayBuffer);
      const digest = await hashBlob(body);
      stored.set(digest, body);
      return new Response(JSON.stringify({ hash: digest }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }
    const found = stored.get(hash);
    if (!found) return new Response(null, { status: 404 });
    if (method === 'HEAD') return new Response(null, { status: 200 });
    return new Response(found as unknown as BodyInit, { status: 200 });
  }) as typeof fetch;
}

type TierFactory = { label: string; create: () => BlobTier; cleanup?: () => void };

const factories: TierFactory[] = [
  { label: 'memory', create: () => new MemoryBlobTier() },
  {
    label: 'opfs',
    create: () => {
      const root = createFakeOpfsRoot();
      return new OpfsBlobTier({ getRoot: async () => root });
    },
  },
  {
    label: 'relay',
    create: () =>
      relayTier(
        createBlobClient({ baseUrl: 'http://relay.test', fetch: fakeRelayFetch() }),
      ),
  },
];

// Disk needs a temp dir per test, so it is registered with its own cleanup.
let diskDir: string | null = null;
factories.push({
  label: 'disk',
  create: () => {
    diskDir = mkdtempSync(join(tmpdir(), `trellis-blob-tier--${process.pid}-${Date.now().toString(36)}`));
    return diskTier(new BlobStore(diskDir));
  },
  cleanup: () => {
    if (diskDir) rmSync(diskDir, { recursive: true, force: true });
    diskDir = null;
  },
});

describe.each(factories)('BlobTier contract — $label', ({ create, cleanup }) => {
  let tier: BlobTier;

  beforeEach(() => {
    tier = create();
  });
  afterEach(() => cleanup?.());

  it('round-trips content', async () => {
    const hash = await tier.put(bytes('hello blobs'));
    const back = await tier.get(hash);
    expect(back).not.toBeNull();
    expect(new TextDecoder().decode(back!)).toBe('hello blobs');
  });

  it('addresses content by SHA-256, agreeing with hashBlob', async () => {
    const content = bytes('addressed');
    expect(await tier.put(content)).toBe(await hashBlob(content));
  });

  it('is idempotent — same bytes, same address', async () => {
    const first = await tier.put(bytes('same'));
    const second = await tier.put(bytes('same'));
    expect(first).toBe(second);
  });

  it('reports absence rather than throwing', async () => {
    const missing = 'f'.repeat(64);
    expect(await tier.get(missing)).toBeNull();
    expect(await tier.has(missing)).toBe(false);
  });

  it('reports presence after a put', async () => {
    const hash = await tier.put(bytes('present'));
    expect(await tier.has(hash)).toBe(true);
  });

  it('preserves bytes exactly, including non-UTF8', async () => {
    const content = new Uint8Array([0, 255, 128, 1, 0, 7]);
    const back = await tier.get(await tier.put(content));
    expect(Array.from(back!)).toEqual(Array.from(content));
  });

  it('does not alias distinct content', async () => {
    const a = await tier.put(bytes('alpha'));
    const b = await tier.put(bytes('beta'));
    expect(a).not.toBe(b);
    expect(new TextDecoder().decode((await tier.get(a))!)).toBe('alpha');
  });
});

describe('blob ladder', () => {
  it('walks up to a colder tier on a miss', async () => {
    const local = new MemoryBlobTier('local');
    const remote = new MemoryBlobTier('remote');
    const hash = await remote.put(bytes('only remote'));

    const ladder = createBlobLadder([local, remote]);
    expect(new TextDecoder().decode((await ladder.get(hash))!)).toBe('only remote');
  });

  it('re-warms warmer tiers on the way back', async () => {
    const local = new MemoryBlobTier('local');
    const remote = new MemoryBlobTier('remote');
    const hash = await remote.put(bytes('warm me'));

    expect(await local.has(hash)).toBe(false);
    await createBlobLadder([local, remote]).get(hash);
    expect(await local.has(hash)).toBe(true);
  });

  it('writes every tier so a fresh put is backed up', async () => {
    const local = new MemoryBlobTier('local');
    const remote = new MemoryBlobTier('remote');
    const hash = await createBlobLadder([local, remote]).put(bytes('backed up'));

    expect(await local.has(hash)).toBe(true);
    expect(await remote.has(hash)).toBe(true);
  });

  it('survives a failing rung and reports it', async () => {
    const local = new MemoryBlobTier('local');
    const broken: BlobTier = {
      name: 'broken',
      get: async () => {
        throw new Error('offline');
      },
      has: async () => {
        throw new Error('offline');
      },
      put: async () => {
        throw new Error('offline');
      },
    };
    const errors: string[] = [];
    const ladder = createBlobLadder([local, broken], {
      onTierError: (tier, operation) => errors.push(`${tier}:${operation}`),
    });

    const hash = await ladder.put(bytes('resilient'));
    expect(new TextDecoder().decode((await ladder.get(hash))!)).toBe('resilient');
    expect(errors).toContain('broken:put');
  });

  it('throws only when every tier fails', async () => {
    const broken = (name: string): BlobTier => ({
      name,
      get: async () => null,
      has: async () => false,
      put: async () => {
        throw new Error('nope');
      },
    });
    const ladder = createBlobLadder([broken('a'), broken('b')]);
    await expect(ladder.put(bytes('doomed'))).rejects.toThrow(/Every blob tier failed/);
  });

  it('rejects an empty ladder', () => {
    expect(() => createBlobLadder([])).toThrow(/at least one tier/);
  });
});

describe('OPFS persistence', () => {
  it('is unknown until asked — never assumed', async () => {
    const tier = new OpfsBlobTier({ getRoot: async () => createFakeOpfsRoot() });
    expect(tier.persisted).toBeNull();
  });

  it('records a granted request', async () => {
    const tier = new OpfsBlobTier({
      getRoot: async () => createFakeOpfsRoot(),
      isPersisted: async () => false,
      requestPersistence: async () => true,
    });
    expect(await tier.requestPersistence()).toBe(true);
    expect(tier.persisted).toBe(true);
  });

  it('records a denial rather than throwing — the tier is then a cache', async () => {
    const tier = new OpfsBlobTier({
      getRoot: async () => createFakeOpfsRoot(),
      isPersisted: async () => false,
      requestPersistence: async () => false,
    });
    expect(await tier.requestPersistence()).toBe(false);
    expect(tier.persisted).toBe(false);
  });

  it('skips the request when storage is already durable', async () => {
    let asked = false;
    const tier = new OpfsBlobTier({
      getRoot: async () => createFakeOpfsRoot(),
      isPersisted: async () => true,
      requestPersistence: async () => {
        asked = true;
        return false;
      },
    });
    expect(await tier.requestPersistence()).toBe(true);
    expect(asked).toBe(false);
  });

  it('deletes a blob', async () => {
    const tier = new OpfsBlobTier({ getRoot: async () => createFakeOpfsRoot() });
    const hash = await tier.put(bytes('temporary'));
    expect(await tier.delete(hash)).toBe(true);
    expect(await tier.has(hash)).toBe(false);
    expect(await tier.delete(hash)).toBe(false);
  });
});
