---
title: Blob serving on the realtime relay
description: Content-addressed blob HTTP endpoints on the relay server + browser client for asset distribution.
created: 2026-07-10
updated: 2026-07-10
issue: TRL-XX
parent: null
related:
  - ../ARCHITECTURE.md
  - ../../src/vcs/blob-store.ts
  - ../../src/realtime/relay-server.ts
---

# Blob serving on the realtime relay

**Status:** spec
**Issue:** TRL-47
**Phase:** byte-tier primitive
**Out of scope:** Auth (deferred), GC policy (deferred), multi-region replication

## Goal

Expose the existing `BlobStore` as HTTP endpoints on the realtime relay, providing a reusable content-addressed asset distribution primitive for all Trellis applications (sprite-client, Raster, game engines, etc.).

```bash
# Relay already runs at ws://localhost:8231/rt
# Add HTTP routes on the same server:
GET  /blob/:sha256  → blob bytes (404 if not found)
PUT  /blob          → upload bytes, return sha256
```

**Principle:** Trellis owns semantics, the relay moves bytes. Content addressing means the server holds no authority — it just hands back whatever hashes to X.

## Architecture

```text
Browser / Client                    Relay Server (trellis-node)
─────────────────                    ─────────────────────────
fetch('/blob/abc123...')   ──────►  HTTP handler
                                      ├─ BlobStore.get(hash)
                                      └─ Return bytes or 404

fetch('/blob', { method: 'PUT',
  body: bytes })             ──────►  HTTP handler
                                      ├─ BlobStore.put(bytes)
                                      └─ Return { hash: 'sha256...' }
```

### Existing code to reuse

| Piece                 | Location                       | Role                                               |
| --------------------- | ------------------------------ | -------------------------------------------------- |
| `BlobStore`           | `src/vcs/blob-store.ts`        | Content-addressed storage (put/get/has, SHA-256)   |
| `createRealtimeRelay` | `src/realtime/relay-server.ts` | HTTP server with health check, already has routing |
| `attachRealtimeRelay` | `src/realtime/relay-server.ts` | Mount on existing HTTP server                      |

### Additions

| Component               | Owner                               | Description                                                                     |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| **HTTP blob handlers**  | `src/realtime/relay-server.ts`      | GET `/blob/:sha256` + PUT `/blob` routes next to health check                   |
| **Browser blob client** | `src/realtime/blob-client.ts` (new) | `fetchBlob(hash)` + `putBlob(bytes)` wrapper, exported via `browser/` condition |
| **CORS headers**        | `src/realtime/relay-server.ts`      | Reuse `RELAY_HEALTH_CORS` for blob routes                                       |

## Why this is unblocked (vs TRL-20)

TRL-20 (full durable client) is blocked on the hard part: graph sync, live subscriptions, auth-filtered queries. Blobs are **dumb bytes keyed by a hash** — no semantics, no subscriptions, no permission filtering. This is the easy 10%, not the stuck 90%.

Content addressing means the bytes are their own identity. The server holds no authority, it just hands back whatever hashes to X. This aligns with the principle: "Trellis owns semantics, the relay moves bytes."

## API specification

### `GET /blob/:sha256`

Retrieves blob content by hash.

**Request:**

```
GET /blob/abc123def456...
```

**Response (success):**

```
Status: 200
Content-Type: application/octet-stream
Content-Length: <bytes>
Access-Control-Allow-Origin: *

<binary blob bytes>
```

**Response (not found):**

```
Status: 404
Content-Type: application/json

{ "error": "not_found", "hash": "abc123..." }
```

**Response (invalid hash format):**

```
Status: 400
Content-Type: application/json

{ "error": "invalid_hash", "hash": "not-a-sha256" }
```

### `PUT /blob`

Uploads blob content and returns its SHA-256 hash.

**Request:**

```
PUT /blob
Content-Type: application/octet-stream
Content-Length: <bytes>

<binary blob bytes>
```

**Response (success):**

```
Status: 200
Content-Type: application/json
Access-Control-Allow-Origin: *

{ "hash": "abc123def456..." }
```

**Response (idempotent):**

If the blob already exists (same hash), still return 200 with the hash — BlobStore.put is idempotent.

**Response (invalid request):**

```
Status: 400
Content-Type: application/json

{ "error": "invalid_request" }
```

## Browser blob client

Create `src/realtime/blob-client.ts` with:

```typescript
export interface BlobClientOptions {
  relayUrl: string; // e.g. 'http://localhost:8231'
}

export class BlobClient {
  constructor(opts: BlobClientOptions) {}

  async get(hash: string): Promise<Uint8Array | null> {
    const res = await fetch(`${this.relayUrl}/blob/${hash}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  async put(bytes: Uint8Array): Promise<string> {
    const res = await fetch(`${this.relayUrl}/blob`, {
      method: 'PUT',
      body: bytes,
    });
    if (!res.ok) throw new Error(`Blob upload failed: ${res.status}`);
    const { hash } = await res.json();
    return hash;
  }

  async has(hash: string): Promise<boolean> {
    const res = await fetch(`${this.relayUrl}/blob/${hash}`, {
      method: 'HEAD',
    });
    return res.ok;
  }
}
```

Export via `src/realtime/index.ts` with `browser/` conditional export:

```typescript
export { BlobClient } from './blob-client.js';
```

Add to `package.json` exports:

```json
"browser": {
  "./realtime": {
    "default": "./dist/realtime/index.js",
    "types": "./dist/realtime/index.d.ts"
  }
}
```

## Server implementation

Modify `src/realtime/relay-server.ts`:

1. Add blob routes to the HTTP request handler in `createRealtimeRelay`:

```typescript
const server = createServer((req, res) => {
  const reqPath = (req.url ?? '/').split('?')[0];

  // Existing health check
  if (reqPath === '/' || reqPath === '/health') {
    // ... existing health check logic
    return;
  }

  // New blob routes
  if (reqPath.startsWith('/blob/')) {
    const hash = reqPath.slice('/blob/'.length);
    if (!/^[a-f0-9]{64}$/.test(hash)) {
      res.writeHead(400, {
        'content-type': 'application/json',
        ...RELAY_HEALTH_CORS,
      });
      res.end(JSON.stringify({ error: 'invalid_hash', hash }));
      return;
    }
    const blob = blobStore.get(hash);
    if (!blob) {
      res.writeHead(404, {
        'content-type': 'application/json',
        ...RELAY_HEALTH_CORS,
      });
      res.end(JSON.stringify({ error: 'not_found', hash }));
      return;
    }
    res.writeHead(200, {
      'content-type': 'application/octet-stream',
      'content-length': blob.length,
      ...RELAY_HEALTH_CORS,
    });
    res.end(blob);
    return;
  }

  if (reqPath === '/blob' && req.method === 'PUT') {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const bytes = Buffer.concat(chunks);
        const hash = await blobStore.put(bytes);
        res.writeHead(200, {
          'content-type': 'application/json',
          ...RELAY_HEALTH_CORS,
        });
        res.end(JSON.stringify({ hash }));
      } catch (err) {
        res.writeHead(500, {
          'content-type': 'application/json',
          ...RELAY_HEALTH_CORS,
        });
        res.end(JSON.stringify({ error: 'upload_failed' }));
      }
    });
    return;
  }

  // Existing 404
  res.writeHead(404).end('not found');
});
```

2. Inject `BlobStore` into relay options:

```typescript
export interface RealtimeRelayOptions {
  path?: string;
  persistence?: false | (() => RelayPersistence);
  replayGraceMs?: number;
  WebSocketServerImpl?: unknown;
  blobStore?: BlobStore; // NEW
}
```

3. Pass blobStore through to the HTTP handler context.

## Deferred concerns (future issues)

| Concern          | Why deferred                                                                     |
| ---------------- | -------------------------------------------------------------------------------- |
| **Auth**         | Local-first relay has no auth; cloud relay can add API key validation later      |
| **Size limits**  | Prototype unlimited; add `maxBlobSize` option later                              |
| **GC policy**    | BlobStore has no GC; add LRU or reference-counted GC later                       |
| **OPFS cache**   | Browser cache can be added in client or app layer (threlte-skeleton integration) |
| **Multi-region** | Single relay for now; edge replication is cloud concern                          |

## Acceptance criteria

- [ ] `GET /blob/:sha256` returns blob bytes when hash exists, 404 when not
- [ ] `GET /blob/:sha256` returns 400 for invalid hash format (not 64 hex chars)
- [ ] `PUT /blob` accepts binary body, returns `{ hash }` with SHA-256
- [ ] `PUT /blob` is idempotent (same hash returned for duplicate content)
- [ ] Blob routes include CORS headers (`Access-Control-Allow-Origin: *`)
- [ ] `BlobClient` class exported via `trellis/realtime` (browser condition)
- [ ] `BlobClient.get(hash)` returns `Uint8Array` or `null`
- [ ] `BlobClient.put(bytes)` returns SHA-256 hash string
- [ ] `BlobClient.has(hash)` returns boolean
- [ ] Unit tests for HTTP handlers (mock BlobStore, inject into relay)
- [ ] Integration test: start relay, upload blob via PUT, retrieve via GET
- [ ] Docs: update `ARCHITECTURE.md` with blob serving section

## Test plan

```bash
# Unit tests
bun test test/realtime/blob-server.test.ts

# Integration test
bun test test/realtime/blob-server.integration.ts
```

Integration test sketch:

```typescript
import { createRealtimeRelay } from '../src/realtime/relay-server.js';
import { BlobStore } from '../src/vcs/blob-store.js';
import { BlobClient } from '../src/realtime/blob-client.js';

test('blob upload and download', async () => {
  const blobStore = new BlobStore('/tmp/test-trellis-blobs');
  const relay = await createRealtimeRelay({
    port: 0,
    blobStore,
  });

  const client = new BlobClient({ relayUrl: `http://localhost:${relay.port}` });
  const bytes = new TextEncoder().encode('hello world');
  const hash = await client.put(bytes);

  const retrieved = await client.get(hash);
  assertEquals(new TextDecoder().decode(retrieved), 'hello world');

  await relay.close();
});
```

## References

- BlobStore: `src/vcs/blob-store.ts`
- Relay server: `src/realtime/relay-server.ts`
- TurtleDB Cloud C0 spec: `docs/planning/turtle-cloud-c0-spec.md` (blob store mention in architecture)
