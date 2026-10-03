import { describe, it, expect, afterEach } from 'vitest';
import { startNodeServer } from '../../src/server/node-adapter.js';

const noopFetch = async () => new Response('ok');
const noopWs = { open: () => {}, message: () => {}, close: () => {} };

describe('startNodeServer port fallback', () => {
  const servers: Awaited<ReturnType<typeof startNodeServer>>[] = [];

  afterEach(async () => {
    while (servers.length) {
      await servers.pop()!.stop();
    }
  });

  it('uses the next port when the requested one is busy', async () => {
    const first = await startNodeServer({
      port: 0,
      hostname: '127.0.0.1',
      fetch: noopFetch,
      websocket: noopWs,
    });
    servers.push(first);

    const second = await startNodeServer({
      port: first.port,
      hostname: '127.0.0.1',
      fetch: noopFetch,
      websocket: noopWs,
      portFallbackAttempts: 8,
    });
    servers.push(second);

    expect(second.port).toBe(first.port + 1);
  });
});
