#!/usr/bin/env bun
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRealtimeRelay } from '../src/realtime/relay-server.ts';
import { BlobStore } from '../src/vcs/blob-store.ts';

const port = Number(process.env.RELAY_PORT ?? 8231);
const blobDir =
  process.env.RELAY_BLOB_DIR ?? join(import.meta.dir, '..', '.trellis-relay-blobs');
mkdirSync(blobDir, { recursive: true });
const store = new BlobStore(blobDir);
const relay = await createRealtimeRelay({
  port,
  path: '/rt',
  blobStore: () => store,
});
console.log(`presence relay listening on ws://localhost:${relay.port}/rt`);
console.log(`blob HTTP: http://localhost:${relay.port}/blob`);
console.log(`blobs on disk: ${store.listHashes().length}`);
