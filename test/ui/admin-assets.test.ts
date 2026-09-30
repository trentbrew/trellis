import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TrellisVcsEngine } from '../../src/engine.js';
import { startLanesDashboard, type LanesDashboardHandle } from '../../src/ui/lanes-dashboard.js';

/**
 * Every asset admin.html / tml-lanes.html loads must be served. From source these
 * bundle the TS on request; the built package serves dist/ui prebuilds instead.
 */
describe('trellis admin assets', () => {
  let root: string;
  let handle: LanesDashboardHandle;
  const get = (path: string) => fetch(`http://127.0.0.1:${handle.port}${path}`);

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'admin-assets-'));
    const engine = new TrellisVcsEngine({ rootPath: root });
    await engine.initRepo({ indexWorkspace: false });
    handle = await startLanesDashboard({ rootPath: root, port: 0 });
  });

  afterAll(() => {
    handle?.stop();
    rmSync(root, { recursive: true, force: true });
  });

  it.each(['/admin-shell.js', '/admin-datatable.js', '/admin-causal-graph.js', '/tml-runtime.js'])(
    'serves %s as a browser module',
    async (path) => {
      const res = await get(path);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('javascript');
      expect(await res.text()).not.toMatch(/from ['"]node:/);
    },
    30_000,
  );

  it.each([
    '/theme/runtime-theme.css',
    '/theme/foundation.css',
    '/theme/semantic.css',
    '/theme/components.css',
    '/@trellis.computer/ui/dist/index.mjs',
    '/favicon.ico',
  ])('serves %s', async (path) => {
    expect((await get(path)).status).toBe(200);
  });

  it.each(['/theme/..%2F..%2Fpackage.json', '/@trellis.computer/ui/dist/..%2Findex.mjs'])(
    'refuses traversal: %s',
    async (path) => {
      expect((await get(path)).status).toBe(404);
    },
  );
});
