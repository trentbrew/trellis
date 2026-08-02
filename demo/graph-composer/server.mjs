/**
 * Graph composer demo server.
 *
 * Serves demo/graph-composer statically plus /sql-wasm/* → the bundled
 * sql.js WASM files (the kernel's SqlJsKernelBackend locates the wasm at
 * `/sql-wasm/<file>` in browsers).
 *
 * Run `pnpm demo:composer` (build + serve), then open
 * http://localhost:4350
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const SQLJS_DIST = fileURLToPath(
  new URL('../../node_modules/sql.js/dist/', import.meta.url),
);
const PORT = Number(process.env.PORT ?? 4350);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (url.pathname.startsWith('/sql-wasm/')) {
      const name = url.pathname.replace('/sql-wasm/', '');
      const file = join(SQLJS_DIST, normalize(name));
      if (!file.startsWith(SQLJS_DIST)) throw new Error('bad path');
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
      return;
    }
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = join(ROOT, normalize(path));
    if (!file.startsWith(ROOT)) throw new Error('bad path');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  }
});

server.listen(PORT, () => {
  console.log(`graph composer → http://localhost:${PORT}`);
});
