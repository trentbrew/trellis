/**
 * Minimal HTTP + SSE dashboard for agent lanes.
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TrellisVcsEngine } from '../engine.js';
import type { VcsOp } from '../vcs/types.js';
import { startNodeServer } from '../server/node-adapter.js';
import { buildLanesSnapshot } from './lanes-snapshot.js';
import { PROVENANCE } from '../core/persist/canonical-op.js';

export interface LanesDashboardOptions {
  rootPath: string;
  port?: number;
  pollMs?: number;
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

export async function startLanesDashboard(
  opts: LanesDashboardOptions,
): Promise<LanesDashboardHandle> {
  const engine = new TrellisVcsEngine({ rootPath: opts.rootPath, provenance: PROVENANCE.http });
  engine.open();

  const lanesHtmlPath = findLanesHtml();
  const readHtml = () => readFileSync(lanesHtmlPath, 'utf-8');
  const pollMs = opts.pollMs ?? 1000;
  const requestedPort = opts.port ?? 3939;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  };

  const fetchHandler = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (path === '/api/lanes') {
      engine.open();
      return Response.json(buildLanesSnapshot(engine, opts.rootPath), { headers });
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

      const stream = new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          let closed = false;
          let lastOpHash: string | undefined = since;
          let sentInitial = false;

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
              send('snapshot', buildLanesSnapshot(engine, opts.rootPath));
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

    if (path === '/' || path === '/lanes' || path === '/lanes.html') {
      return new Response(readHtml(), {
        headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
      });
    }

    // TML v0 test bed (sterile route) — see docs/specs/tml-v0.md
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
      // Serve the TML runtime. Authored as typed TS; built on the fly so it works
      // in dev without a build step (esbuild is a dep).
      //
      // BUNDLE, not transform. `transform` only strips types — it leaves import
      // specifiers untouched, so the browser received bare relative paths and any
      // import outside this one file 404'd. That capped the runtime at whatever it
      // could do with zero imports. Bundling lets it pull in the real kernel
      // pieces (EAVStore / decompose / QueryEngine), which is what a materializing
      // peer needs; those are browser-safe and measure ~5.7 KB gzipped together.
      const tsPath = findUiAsset('tml-runtime.ts');
      if (!tsPath) {
        return new Response('tml-runtime.ts not found — run from trellis-node.', {
          status: 404,
          headers,
        });
      }
      try {
        const { build } = await import('esbuild');
        const out = await build({
          entryPoints: [tsPath],
          bundle: true,
          write: false,
          format: 'esm',
          target: 'es2020',
          platform: 'browser',
          // Keep it debuggable in dev; this is a test bed, not a shipped asset.
          minify: false,
        });
        return new Response(out.outputFiles[0]!.text, {
          headers: {
            ...headers,
            'Content-Type': 'text/javascript; charset=utf-8',
            'Cache-Control': 'no-cache',
          },
        });
      } catch (err) {
        return new Response('tml-runtime build failed: ' + String(err), {
          status: 500,
          headers,
        });
      }
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
    websocket: { open: () => {}, message: () => {}, close: () => {} },
  });

  return {
    port: server.port,
    stop: () => server.stop(),
  };
}
