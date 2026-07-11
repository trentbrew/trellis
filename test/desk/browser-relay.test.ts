import { describe, test, expect, afterEach } from 'vitest';
import { createBrowserRelay } from '../../src/desk/browser-relay.js';
import { runBrowserVerifyViaRelay } from '../../src/desk/browser-verify-client.js';
import { DEFAULT_BROWSER_SMOKE_STEPS } from '../../src/desk/browser-types.js';

describe('browser relay', () => {
  let relay: Awaited<ReturnType<typeof createBrowserRelay>>;

  afterEach(async () => {
    if (relay) await relay.close();
  });

  test('health reports extension disconnected initially', async () => {
    relay = await createBrowserRelay({ port: 0 });
    const res = await fetch(`${relay.url}/health`);
    expect(res.ok).toBe(true);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      extensionConnected: false,
    });
  });

  test('verify returns 503 without extension', async () => {
    relay = await createBrowserRelay({ port: 0 });
    const res = await fetch(`${relay.url}/browser/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps: DEFAULT_BROWSER_SMOKE_STEPS }),
    });
    expect(res.status).toBe(503);
  });

  test('relay forwards verify job to extension websocket', async () => {
    relay = await createBrowserRelay({ port: 0 });
    const wsModule = await import('ws');
    const ws = new wsModule.WebSocket(`${relay.url.replace('http', 'ws')}/browser`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'register', role: 'extension', version: 1 }));
      });
      ws.on('error', reject);
      setTimeout(resolve, 50);
    });

    expect(relay.extensionConnected()).toBe(true);

    const verifyDone = new Promise<void>((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(String(data));
        if (msg.type === 'verify:job') {
          ws.send(
            JSON.stringify({
              type: 'verify:result',
              jobId: msg.jobId,
              result: {
                ok: true,
                steps: [],
                durationMs: 12,
                tabUrl: 'http://localhost:4000/',
              },
            }),
          );
          resolve();
        }
      });
    });

    const result = await runBrowserVerifyViaRelay({
      relayUrl: relay.url,
      suiteId: 'browser-smoke',
      steps: DEFAULT_BROWSER_SMOKE_STEPS,
    });

    await verifyDone;

    expect(result.ok).toBe(true);
    expect(result.tabUrl).toBe('http://localhost:4000/');
    ws.close();
  });
});
