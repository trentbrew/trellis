/**
 * Static turtle-admin SPA shipped inside `dist/ui/turtle-admin/` (from os/admin build).
 * Same origin as the operator API — no separate :3940 dev server for end users.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function locateTurtleAdminIndex(): string | null {
  const candidates: string[] = [];
  const push = (p: string) => {
    if (!candidates.includes(p)) candidates.push(p);
  };

  try {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    push(join(moduleDir, 'turtle-admin', 'index.html'));
    push(join(moduleDir, '..', 'ui', 'turtle-admin', 'index.html'));
    push(join(moduleDir, 'ui', 'turtle-admin', 'index.html'));
  } catch {
    // ignore
  }

  let cwd = process.cwd();
  for (let i = 0; i < 8; i++) {
    push(join(cwd, 'dist', 'ui', 'turtle-admin', 'index.html'));
    push(join(cwd, 'src', 'ui', 'turtle-admin', 'index.html'));
    const parent = dirname(cwd);
    if (parent === cwd) break;
    cwd = parent;
  }

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

let cachedRoot: string | null | undefined;

/** Directory containing `index.html` for the bundled turtle-admin client, if shipped. */
export function turtleAdminStaticRoot(): string | null {
  if (cachedRoot !== undefined) return cachedRoot;
  const index = locateTurtleAdminIndex();
  cachedRoot = index ? dirname(index) : null;
  return cachedRoot;
}

export function bundledTurtleAdminAvailable(): boolean {
  return turtleAdminStaticRoot() !== null;
}

function contentType(filePath: string): string {
  return MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function resolveSafeFile(root: string, urlPath: string): string | null {
  const rel = urlPath.replace(/^\/+/, '') || 'index.html';
  const abs = resolve(root, rel);
  const rootResolved = resolve(root);
  if (!abs.startsWith(rootResolved)) return null;
  return abs;
}

/**
 * Serve a file from the turtle-admin build, or `index.html` for SPA client routes.
 * Only for GET/HEAD; returns null when the bundle is not installed.
 */
export function serveTurtleAdminStatic(
  req: Request,
  urlPath: string,
  baseHeaders: Record<string, string>,
): Response | null {
  const root = turtleAdminStaticRoot();
  if (!root) return null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: baseHeaders });
  }

  const candidate = resolveSafeFile(root, urlPath);
  let toServe = join(root, 'index.html');
  if (candidate && existsSync(candidate)) {
    try {
      if (statSync(candidate).isFile()) toServe = candidate;
    } catch {
      // fall through to index.html
    }
  }

  if (!existsSync(toServe)) {
    return new Response('turtle-admin index missing', { status: 500, headers: baseHeaders });
  }

  const body = req.method === 'HEAD' ? null : readFileSync(toServe);
  const cache =
    urlPath.includes('/_app/immutable/') ? 'public, max-age=31536000, immutable' : 'no-cache';
  return new Response(body, {
    headers: {
      ...baseHeaders,
      'Content-Type': contentType(toServe),
      'Cache-Control': cache,
    },
  });
}

/** Minimal health for turtle-admin TrellisProvider when UI-state db is not running. */
export function turtleAdminHealthStub(headers: Record<string, string>): Response {
  return Response.json({ ok: true, mode: 'operator-api-only' }, { headers });
}
