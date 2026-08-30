import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import { buildSandboxBootstrap, resolveSandboxAssetsDir } from './pack.js';
import type { SandboxHostOptions } from './types.js';

const MIME: Record<string, string> = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
};

function mimeFor(filePath: string): string {
  return MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? (JSON.parse(data) as Record<string, unknown>) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export function startSandboxHost(options: SandboxHostOptions): http.Server {
  const {
    port = Number(process.env.PORT ?? 4321),
    trellisRoot,
    assetsDir = resolveSandboxAssetsDir(trellisRoot),
    host = '127.0.0.1',
    onListen,
  } = options;

  const distDir = path.join(trellisRoot, 'dist');
  let wcGraphBase: string | null = null;

  const server = http.createServer(async (req, res) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const url = new URL(req.url ?? '/', `http://${host}`);
    const pathname = url.pathname;

    if (pathname === '/' || pathname === '/index.html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(fs.readFileSync(path.join(assetsDir, 'index.html')));
      return;
    }

    if (pathname === '/sandbox-shell.css') {
      const cssPath = path.join(assetsDir, 'sandbox-shell.css');
      if (fs.existsSync(cssPath)) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.end(fs.readFileSync(cssPath));
        return;
      }
    }

    const serveBootstrap = () => {
      try {
        const bootstrap = buildSandboxBootstrap(trellisRoot, assetsDir);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(bootstrap));
      } catch (err) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: (err as Error).message ?? String(err),
          }),
        );
      }
    };

    if (pathname === '/api/bootstrap' || pathname === '/bootstrap.json') {
      serveBootstrap();
      return;
    }

    if (pathname === '/api/wc-target' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        if (!body.base || typeof body.base !== 'string') {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'body.base required' }));
          return;
        }
        wcGraphBase = body.base;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, base: wcGraphBase }));
      } catch (err) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: (err as Error).message ?? 'invalid json' }));
      }
      return;
    }

    if (pathname === '/api/graph' && req.method === 'GET') {
      if (!wcGraphBase) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'WebContainer graph server not registered yet' }));
        return;
      }
      const target = `${wcGraphBase.replace(/\/$/, '')}/api/graph`;
      try {
        const upstream = await fetch(target);
        const body = await upstream.text();
        res.statusCode = upstream.status;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(body);
      } catch (err) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: 'Graph proxy failed',
            message: (err as Error).message ?? String(err),
            target,
          }),
        );
      }
      return;
    }

    if (pathname === '/api/dist-pack') {
      req.url = '/api/bootstrap';
      server.emit('request', req, res);
      return;
    }

    if (pathname.startsWith('/dist/')) {
      const rel = pathname.slice('/dist/'.length);
      const filePath = path.resolve(distDir, rel);
      if (!filePath.startsWith(distDir)) {
        res.statusCode = 403;
        res.end();
        return;
      }
      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      res.setHeader('Content-Type', mimeFor(filePath));
      res.end(fs.readFileSync(filePath));
      return;
    }

    res.statusCode = 404;
    res.end('Not found');
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  Port ${port} is already in use.`);
      console.error(`  Kill the old server:  lsof -ti :${port} | xargs kill -9`);
      console.error(`  Or use another port:   PORT=${port + 1} trellis sandbox\n`);
      process.exit(1);
    }
    throw err;
  });

  server.listen(port, host, () => {
    const url = `http://${host}:${port}`;
    onListen?.(url);
  });

  return server;
}
