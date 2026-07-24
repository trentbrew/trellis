/**
 * Minimal HTTP + SSE dashboard for agent lanes.
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { TrellisVcsEngine } from '../engine.js';
import type { VcsOp } from '../vcs/types.js';
import { loadLaneMeta, saveLaneMeta } from '../vcs/lane.js';
import { startNodeServer } from '../server/node-adapter.js';
import { buildLanesSnapshot } from './lanes-snapshot.js';
import { buildCausalGraphSnapshot } from './causal-graph-snapshot.js';
import { PROVENANCE } from '../core/persist/canonical-op.js';
import { resolveRuntimeThemeCss } from './theme/resolve-runtime-theme-css.js';
import {
  liveReloadClientSource,
  startUiDevWatch,
  uiDevOutDir,
  type UiDevReloadReason,
} from './ui-dev.js';

export interface LanesDashboardOptions {
  rootPath: string;
  port?: number;
  pollMs?: number;
  /** esbuild watch + SSE live reload; also enabled by TRELLIS_UI_DEV=1 */
  dev?: boolean;
}

export interface LanesDashboardHandle {
  port: number;
  stop: () => void;
}

function findLanesHtml(): string {
  const candidates: string[] = [];
  const push = (p: string) => {
    if (!candidates.includes(p)) candidates.push(p);
  };

  try {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    push(join(moduleDir, 'lanes.html'));
    push(join(moduleDir, '..', 'ui', 'lanes.html'));
  } catch {
    // ignore
  }

  let cwd = process.cwd();
  for (let i = 0; i < 8; i++) {
    push(join(cwd, 'src', 'ui', 'lanes.html'));
    push(join(cwd, 'dist', 'ui', 'lanes.html'));
    const parent = dirname(cwd);
    if (parent === cwd) break;
    cwd = parent;
  }

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error('Could not find lanes.html — run from trellis-node or build dist.');
}

/** Locate a sibling TML UI asset (tml-lanes.html, tml-runtime.js) next to lanes.html. */
function findUiAsset(name: string): string | null {
  const candidates: string[] = [];
  try {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    candidates.push(join(moduleDir, name));
    candidates.push(join(moduleDir, '..', 'ui', name));
  } catch {
    // ignore
  }
  let cwd = process.cwd();
  for (let i = 0; i < 8; i++) {
    candidates.push(join(cwd, 'src', 'ui', name));
    candidates.push(join(cwd, 'dist', 'ui', name));
    const parent = dirname(cwd);
    if (parent === cwd) break;
    cwd = parent;
  }
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function resolveDevMode(opts: LanesDashboardOptions): boolean {
  if (opts.dev === true) return true;
  if (opts.dev === false) return false;
  const env = process.env.TRELLIS_UI_DEV?.trim().toLowerCase();
  return env === '1' || env === 'true' || env === 'yes';
}

async function bundleUiModule(tsPath: string): Promise<string> {
  const { build } = await import('esbuild');
  const out = await build({
    entryPoints: [tsPath],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2020',
    platform: 'browser',
    minify: false,
  });
  return out.outputFiles[0]!.text;
}

function readDevBundle(outDir: string, jsName: string): string | null {
  const p = join(outDir, jsName);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf-8');
}

function injectDevLiveReload(html: string): string {
  const tag = '<script type="module" src="/__dev/live-reload.js"></script>';
  if (html.includes('/__dev/live-reload.js')) return html;
  return html.replace('</body>', `  ${tag}\n</body>`);
}

export async function startLanesDashboard(
  opts: LanesDashboardOptions,
): Promise<LanesDashboardHandle> {
  const engine = new TrellisVcsEngine({ rootPath: opts.rootPath, provenance: PROVENANCE.http });
  engine.open();
  const trellisDir = join(opts.rootPath, '.trellis');
  const uiDev = resolveDevMode(opts);
  const devOutDir = uiDevOutDir(opts.rootPath);

  const reloadClients = new Set<(reason: UiDevReloadReason) => void>();
  const broadcastReload = (reason: UiDevReloadReason) => {
    for (const send of reloadClients) {
      try {
        send(reason);
      } catch {
        reloadClients.delete(send);
      }
    }
  };

  let uiDevHandle: Awaited<ReturnType<typeof startUiDevWatch>> | null = null;
  if (uiDev) {
    uiDevHandle = await startUiDevWatch(opts.rootPath, broadcastReload);
  }

  const lanesHtmlPath = findLanesHtml();
  const readHtml = () => readFileSync(lanesHtmlPath, 'utf-8');
  const pollMs = opts.pollMs ?? 1000;
  const requestedPort = opts.port ?? 3939;
  let boundPort = requestedPort;
  let viewers = 0;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  };

  const snapshot = () =>
    buildLanesSnapshot(engine, opts.rootPath, { port: boundPort, viewers });

  const serveBundledJs = async (jsName: string, tsName: string): Promise<Response> => {
    if (uiDev) {
      const cached = readDevBundle(devOutDir, jsName);
      if (cached != null) {
        return new Response(cached, {
          headers: {
            ...headers,
            'Content-Type': 'text/javascript; charset=utf-8',
            'Cache-Control': 'no-cache',
          },
        });
      }
    }
    const tsPath = findUiAsset(tsName);
    if (!tsPath) {
      return new Response(`${tsName} not found — run from trellis-node.`, {
        status: 404,
        headers,
      });
    }
    try {
      const text = await bundleUiModule(tsPath);
      return new Response(text, {
        headers: {
          ...headers,
          'Content-Type': 'text/javascript; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    } catch (err) {
      return new Response(`${basename(tsName, '.ts')} build failed: ${String(err)}`, {
        status: 500,
        headers,
      });
    }
  };

  const fetchHandler = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (uiDev && path === '/__dev/live-reload.js') {
      return new Response(liveReloadClientSource(), {
        headers: {
          ...headers,
          'Content-Type': 'text/javascript; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    if (uiDev && path === '/__dev/reload') {
      const stream = new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          const send = (reason: UiDevReloadReason) => {
            controller.enqueue(enc.encode(`event: ${reason}\ndata: ${reason}\n\n`));
          };
          reloadClients.add(send);
          req.signal.addEventListener('abort', () => {
            reloadClients.delete(send);
            try {
              controller.close();
            } catch {
              // already closed
            }
          });
        },
      });
      return new Response(stream, {
        headers: {
          ...headers,
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
        },
      });
    }

    if (!uiDev && path.startsWith('/__dev/')) {
      return new Response('Not Found', { status: 404, headers });
    }

    if (path === '/api/lanes') {
      engine.open();
      return Response.json(snapshot(), { headers });
    }

    if (path === '/api/causal-graph') {
      engine.open();
      return Response.json(buildCausalGraphSnapshot(engine), { headers });
    }

    const laneOpsMatch = path.match(/^\/api\/lanes\/([^/]+)\/ops$/);
    if (laneOpsMatch) {
      engine.open();
      try {
        const { ops, meta } = engine.summarizeLane(decodeURIComponent(laneOpsMatch[1]));
        return Response.json(
          {
            laneId: meta.id,
            agentId: meta.agentId,
            issueId: meta.issueId,
            ops: ops.map((op) => ({
              hash: op.hash,
              type: op.kind,
              at: op.timestamp,
              agentId: op.agentId,
              laneId: op.laneId,
              message: op.vcs?.message,
              path: op.vcs?.filePath ?? op.vcs?.oldFilePath,
              issueId: op.vcs?.issueId,
            })),
          },
          { headers },
        );
      } catch {
        return new Response('Not Found', { status: 404, headers });
      }
    }

    if (path === '/api/lanes/stream') {
      // TRL-108: the client is a peer. It receives real ops, not a snapshot it
      // has to diff. `since` (or Last-Event-ID on reconnect) resumes the op
      // stream; an unknown hash replays from the start.
      const since =
        url.searchParams.get('since') ??
        req.headers.get('last-event-id') ??
        undefined;

      // `?events=snapshot` — send projections only, skip the op frames.
      //
      // A consumer that renders from snapshots (the TML page) still opened the
      // op stream, so a cold connect serialized ~9.6k ops into ~9.6k SSE frames
      // that the client parsed and threw away, because it only listens for
      // `snapshot`. That was the TML page's "slowness": work on both ends for
      // data nobody read. Op consumers are unaffected and still get everything.
      const wantOps = url.searchParams.get('events') !== 'snapshot';
      // Count snapshot-mode peers once per admin tab (ops stream is a second pipe).
      const countAsViewer = !wantOps;

      const stream = new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          let closed = false;
          let lastOpHash: string | undefined = since;
          let sentInitial = false;
          if (countAsViewer) viewers += 1;

          const send = (event: string, data: unknown, id?: string) => {
            const idLine = id ? `id: ${id}\n` : '';
            controller.enqueue(
              enc.encode(
                `${idLine}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
              ),
            );
          };

          /** Ops after `lastOpHash`. Unknown hash ⇒ replay all (peer is behind or forked). */
          const opsSince = (all: VcsOp[]): VcsOp[] => {
            if (!lastOpHash) return all;
            const idx = all.findIndex((o) => o.hash === lastOpHash);
            return idx >= 0 ? all.slice(idx + 1) : all;
          };

          const push = () => {
            if (closed) return;
            try {
              engine.open();
              const all = engine.getOps();
              const fresh = opsSince(all);

              // Idle means silence. Previously this re-sent the entire snapshot
              // once a second regardless of whether anything had happened.
              if (!fresh.length && sentInitial) return;

              // Projections (lanes/issues) are still server-derived — see the
              // TRL-108 writeup: a read-only peer either gets projections or
              // materializes the store itself, and that is SPEC-v1.1's call.
              send('snapshot', snapshot());
              if (wantOps) for (const op of fresh) send('op', op, op.hash);

              if (all.length) lastOpHash = all[all.length - 1]!.hash;
              sentInitial = true;
            } catch (err) {
              controller.enqueue(
                enc.encode(
                  `event: error\ndata: ${JSON.stringify({ message: String(err) })}\n\n`,
                ),
              );
            }
          };

          push();
          const timer = setInterval(push, pollMs);

          req.signal.addEventListener('abort', () => {
            closed = true;
            if (countAsViewer) viewers = Math.max(0, viewers - 1);
            clearInterval(timer);
            try {
              controller.close();
            } catch {
              // already closed
            }
          });
        },
      });

      return new Response(stream, {
        headers: {
          ...headers,
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
        },
      });
    }

    // Legacy lanes board (TRL-191) — index `/` is now admin
    if (path === '/lanes' || path === '/lanes.html') {
      return new Response(readHtml(), {
        headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
      });
    }

    // Operator console (TRL-191) — AffordanceShell + Operate sidebar; index + /admin alias
    if (path === '/admin' || path === '/admin.html') {
      return new Response(null, {
        status: 302,
        headers: {
          ...headers,
          Location: `/${url.search}`,
        },
      });
    }

    if (path === '/') {
      const htmlPath = findUiAsset('admin.html');
      if (!htmlPath) {
        return new Response('admin.html not found — run from trellis-node.', {
          status: 404,
          headers,
        });
      }
      let html = readFileSync(htmlPath, 'utf-8');
      if (uiDev) html = injectDevLiveReload(html);
      return new Response(html, {
        headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
      });
    }

    // Fractal mark — same asset as fractal-playground /logo.png (CSS mask in admin)
    if (path === '/logo.png') {
      const logoPath = findUiAsset('logo.png');
      if (!logoPath) {
        return new Response('logo.png not found', { status: 404, headers });
      }
      return new Response(readFileSync(logoPath), {
        headers: {
          ...headers,
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // System visualizer (Phase C scrubber) — e2e host on lane watch :3939
    if (path === '/client' || path === '/client.html') {
      const htmlPath = findUiAsset('client.html');
      if (!htmlPath) {
        return new Response('client.html not found — run from trellis-node.', {
          status: 404,
          headers,
        });
      }
      return new Response(readFileSync(htmlPath, 'utf-8'), {
        headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
      });
    }

    // TML v0 test bed (sterile route) — see docs/specs/tml-v0.md
    if (path === '/theme/runtime-theme.css') {
      const cssPath = resolveRuntimeThemeCss(opts.rootPath);
      if (!cssPath) {
        return new Response('runtime-theme.css not found — run from trellis-node.', {
          status: 404,
          headers,
        });
      }
      return new Response(readFileSync(cssPath, 'utf-8'), {
        headers: {
          ...headers,
          'Content-Type': 'text/css; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    if (path === '/tml-lanes') {
      const htmlPath = findUiAsset('tml-lanes.html');
      if (!htmlPath) {
        return new Response('TML test page not found — build or run from trellis-node.', {
          status: 404,
          headers,
        });
      }
      return new Response(readFileSync(htmlPath, 'utf-8'), {
        headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
      });
    }

    if (path === '/tml-runtime.js') {
      return serveBundledJs('tml-runtime.js', 'tml-runtime.ts');
    }

    if (path === '/admin-datatable.js') {
      return serveBundledJs('admin-datatable.js', 'admin-datatable.ts');
    }

    if (path === '/admin-shell.js') {
      return serveBundledJs('admin-shell.js', 'admin-shell.ts');
    }

    if (path === '/admin-causal-graph.js') {
      return serveBundledJs('admin-causal-graph.js', 'admin-causal-graph.ts');
    }

    if (path === '/admin-datatable.css') {
      const cssPath = findUiAsset('admin-datatable.css');
      if (!cssPath) {
        return new Response('admin-datatable.css not found — run from trellis-node.', {
          status: 404,
          headers,
        });
      }
      return new Response(readFileSync(cssPath, 'utf-8'), {
        headers: {
          ...headers,
          'Content-Type': 'text/css; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    if (path === '/api/tml-mutations' && req.method === 'POST') {
      let body: { action?: string; args?: Record<string, unknown> };
      try {
        body = await req.json();
      } catch {
        return new Response(JSON.stringify({ error: 'invalid json' }), {
          status: 400,
          headers,
        });
      }
      const { action, args } = body;
      try {
        if (action === 'promote') {
          await engine.promoteLane(String(args?.id), { dryRun: false });
        } else if (action === 'updateLaneMeta') {
          const id = String(args?.id || '');
          if (!id) {
            return new Response(JSON.stringify({ error: 'id required' }), {
              status: 400,
              headers,
            });
          }
          const meta = loadLaneMeta(trellisDir, id);
          if (!meta) {
            return new Response(JSON.stringify({ error: `unknown lane: ${id}` }), {
              status: 400,
              headers,
            });
          }
          if ('targetBranch' in (args || {})) {
            const tb = args?.targetBranch;
            if (typeof tb !== 'string' || !tb.trim()) {
              return new Response(JSON.stringify({ error: 'targetBranch required' }), {
                status: 400,
                headers,
              });
            }
            meta.targetBranch = tb.trim();
          }
          if ('issueId' in (args || {})) {
            const raw = args?.issueId;
            if (raw == null || raw === '') {
              delete meta.issueId;
            } else {
              const plain = String(raw).replace(/^issue:/, '').trim();
              if (!/^TRL-\d+$/i.test(plain)) {
                return new Response(JSON.stringify({ error: 'invalid issueId' }), {
                  status: 400,
                  headers,
                });
              }
              const m = plain.match(/^trl-(\d+)$/i);
              meta.issueId = m ? `issue:TRL-${m[1]}` : `issue:${plain}`;
            }
          }
          meta.updatedAt = new Date().toISOString();
          saveLaneMeta(trellisDir, meta);
        } else {
          return new Response(JSON.stringify({ error: `unknown action: ${action}` }), {
            status: 400,
            headers,
          });
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 400,
          headers,
        });
      }
    }

    return new Response('Not Found', { status: 404, headers });
  };

  const server = await startNodeServer({
    port: requestedPort,
    fetch: fetchHandler,
    websocket: { open: () => { }, message: () => { }, close: () => { } },
  });
  boundPort = server.port;

  return {
    port: server.port,
    stop: () => {
      void uiDevHandle?.stop();
      server.stop();
    },
  };
}
