/**
 * Shared local presence relay for cross-browser / cross-device demo sync.
 *
 *   node scripts/demo-relay.mjs              # ws://localhost:8231/rt
 *   RELAY_PORT=8232 node scripts/demo-relay.mjs
 *
 * Point demos at it with VITE_PRESENCE_RELAY_URL / NEXT_PUBLIC_PRESENCE_RELAY_URL
 *   = ws://localhost:8231/rt
 *
 * Blob surface (ADR 0016): GET/HEAD /blob/:sha256, PUT /blob, GET /blob (list),
 * PUT /blob/:hash/meta — enabled by default for local demos. Disable with RELAY_BLOBS=0.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRealtimeRelay } from 'trellis/server';
import { BlobStore } from 'trellis/vcs';

const port = Number(process.env.PORT ?? process.env.RELAY_PORT ?? 8231);
const blobsEnabled = process.env.RELAY_BLOBS !== '0';

const blobDir =
  process.env.RELAY_BLOB_DIR ??
  join(process.cwd(), '.trellis-relay-blobs');

/** @type {import('../src/realtime/relay-server.ts').StandaloneRealtimeRelayOptions} */
const opts = { port, path: '/rt' };

if (blobsEnabled) {
  mkdirSync(blobDir, { recursive: true });
  const store = new BlobStore(blobDir);
  opts.blobStore = () => store;
  console.log(`blob store: ${join(blobDir, 'blobs')} (RELAY_BLOBS=0 to disable)`);
}

const relay = await createRealtimeRelay(opts);

console.log(`presence relay listening on ws://localhost:${relay.port}/rt`);
if (blobsEnabled) {
  console.log(`blob HTTP: http://localhost:${relay.port}/blob/:sha256`);
}
console.log('demos auto-wire when started via just run / just presence-relay');

const shutdown = async () => {
  await relay.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
