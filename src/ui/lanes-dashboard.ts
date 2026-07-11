/**
 * Minimal HTTP + SSE dashboard for agent lanes.
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TrellisVcsEngine } from '../engine.js';
import { startNodeServer } from '../server/node-adapter.js';
import { buildLanesSnapshot } from './lanes-snapshot.js';

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

export async function startLanesDashboard(
  opts: LanesDashboardOptions,
): Promise<LanesDashboardHandle> {
  const engine = new TrellisVcsEngine({ rootPath: opts.rootPath });
  engine.open();

  const lanesHtml = readFileSync(findLanesHtml(), 'utf-8');
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
      const stream = new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          let closed = false;

          const push = () => {
            if (closed) return;
            try {
              engine.open();
              const snap = buildLanesSnapshot(engine, opts.rootPath);
              controller.enqueue(
                enc.encode(`data: ${JSON.stringify(snap)}\n\n`),
              );
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
      return new Response(lanesHtml, {
        headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
      });
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
