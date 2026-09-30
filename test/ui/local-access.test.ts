import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { request } from 'http';
import { join } from 'path';
import { tmpdir } from 'os';
import { TrellisVcsEngine } from '../../src/engine.js';
import { startLanesDashboard, type LanesDashboardHandle } from '../../src/ui/lanes-dashboard.js';
import {
  checkLocalAccess,
  corsHeadersFor,
  isLoopbackBind,
  normalizeOrigin,
  type LocalAccessPolicy,
} from '../../src/ui/local-access.js';

const loopback: LocalAccessPolicy = { loopbackOnly: true, allowOrigins: [] };

function req(url: string, init: RequestInit & { headers?: Record<string, string> } = {}): Request {
  return new Request(url, init);
}

describe('checkLocalAccess (ADR 0053 d1)', () => {
  it('refuses non-loopback Host headers while loopback-bound (DNS rebinding)', () => {
    const d = checkLocalAccess(req('http://evil.example:3939/api/issues'), loopback);
    expect(d).toMatchObject({ ok: false, status: 403 });
  });

  it('accepts loopback hosts, including IPv6', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      expect(checkLocalAccess(req(`http://${host}:3939/api/issues`), loopback).ok).toBe(true);
    }
  });

  it('skips the Host check when the operator chose a non-loopback bind', () => {
    const lan: LocalAccessPolicy = { loopbackOnly: false, allowOrigins: [] };
    expect(checkLocalAccess(req('http://192.168.1.20:3939/api/issues'), lan).ok).toBe(true);
  });

  it('grants CORS to loopback origins only by default', () => {
    const local = checkLocalAccess(
      req('http://127.0.0.1:3939/api/issues', { headers: { origin: 'http://localhost:3940' } }),
      loopback,
    );
    expect(local).toEqual({ ok: true, corsOrigin: 'http://localhost:3940' });

    const foreign = checkLocalAccess(
      req('http://127.0.0.1:3939/api/issues', { headers: { origin: 'https://evil.example' } }),
      loopback,
    );
    expect(foreign).toEqual({ ok: true, corsOrigin: null });
  });

  it('refuses writes from foreign origins even though the browser would send them', () => {
    const d = checkLocalAccess(
      req('http://127.0.0.1:3939/api/tml-mutations', {
        method: 'POST',
        headers: { origin: 'https://evil.example', 'content-type': 'text/plain' },
        body: '{}',
      }),
      loopback,
    );
    expect(d).toMatchObject({ ok: false, status: 403 });
  });

  it('requires JSON for writes, so a cross-site write always preflights', () => {
    const d = checkLocalAccess(
      req('http://127.0.0.1:3939/api/tml-mutations', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: '{}',
      }),
      loopback,
    );
    expect(d).toMatchObject({ ok: false, status: 415 });
  });

  it('honors --allow-origin, normalized', () => {
    const policy: LocalAccessPolicy = {
      loopbackOnly: true,
      allowOrigins: [normalizeOrigin('http://studio.test:5173/')],
    };
    const d = checkLocalAccess(
      req('http://127.0.0.1:3939/api/tml-mutations', {
        method: 'POST',
        headers: { origin: 'http://studio.test:5173', 'content-type': 'application/json' },
        body: '{}',
      }),
      policy,
    );
    expect(d).toEqual({ ok: true, corsOrigin: 'http://studio.test:5173' });
  });

  it('never emits a wildcard origin', () => {
    expect(corsHeadersFor(null)).toEqual({ Vary: 'Origin' });
    expect(corsHeadersFor('http://localhost:3940', true)['Access-Control-Allow-Origin']).toBe(
      'http://localhost:3940',
    );
  });

  it('classifies bind addresses', () => {
    expect(isLoopbackBind('127.0.0.1')).toBe(true);
    expect(isLoopbackBind('localhost')).toBe(true);
    expect(isLoopbackBind('::1')).toBe(true);
    expect(isLoopbackBind('0.0.0.0')).toBe(false);
    expect(isLoopbackBind('::')).toBe(false);
  });
});

/** Raw request so the Host header can be forged, which fetch refuses to do. */
function raw(
  port: number,
  opts: { method?: string; path: string; headers?: Record<string, string>; body?: string },
): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  return new Promise((resolve, reject) => {
    const r = request(
      { host: '127.0.0.1', port, method: opts.method ?? 'GET', path: opts.path, headers: opts.headers },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
      },
    );
    r.on('error', reject);
    if (opts.body) r.write(opts.body);
    r.end();
  });
}

describe('trellis admin HTTP surface (ADR 0053)', () => {
  let root: string;
  let handle: LanesDashboardHandle;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'admin-access-'));
    const engine = new TrellisVcsEngine({ rootPath: root });
    await engine.initRepo({ indexWorkspace: false });
    handle = await startLanesDashboard({ rootPath: root, port: 0 });
  });

  afterAll(() => {
    handle?.stop();
    rmSync(root, { recursive: true, force: true });
  });

  it('binds loopback by default', () => {
    expect(handle.host).toBe('127.0.0.1');
  });

  it('serves loopback reads', async () => {
    const res = await raw(handle.port, { path: '/api/issues', headers: { host: `127.0.0.1:${handle.port}` } });
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('refuses a rebinding Host header', async () => {
    const res = await raw(handle.port, { path: '/api/issues', headers: { host: 'evil.example' } });
    expect(res.status).toBe(403);
  });

  it('preflights loopback origins with a reflected origin, not *', async () => {
    const res = await raw(handle.port, {
      method: 'OPTIONS',
      path: '/api/tml-mutations',
      headers: { host: `localhost:${handle.port}`, origin: 'http://localhost:3940' },
    });
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3940');
  });

  it('refuses a cross-site "simple" POST', async () => {
    const res = await raw(handle.port, {
      method: 'POST',
      path: '/api/tml-mutations',
      headers: {
        host: `127.0.0.1:${handle.port}`,
        origin: 'https://evil.example',
        'content-type': 'text/plain',
      },
      body: JSON.stringify({ action: 'issueCreate', args: { title: 'pwned' } }),
    });
    expect(res.status).toBe(403);
    const issues = await raw(handle.port, { path: '/api/issues', headers: { host: `127.0.0.1:${handle.port}` } });
    expect(JSON.parse(issues.body)).toEqual([]);
  });

  it('keeps promote CLI-only and hands back the command', async () => {
    const res = await raw(handle.port, {
      method: 'POST',
      path: '/api/tml-mutations',
      headers: { host: `127.0.0.1:${handle.port}`, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'promote', args: { id: 'lane-1' } }),
    });
    expect(res.status).toBe(403);
    expect(JSON.parse(res.body).command).toBe('trellis lane promote lane-1');
  });

  it('still accepts local JSON writes', async () => {
    const res = await raw(handle.port, {
      method: 'POST',
      path: '/api/tml-mutations',
      headers: { host: `127.0.0.1:${handle.port}`, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'issueCreate', args: { title: 'Local write' } }),
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body).issueId).toBeTruthy();
  });
});
