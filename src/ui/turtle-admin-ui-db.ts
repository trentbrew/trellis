/**
 * turtle-admin UI-state (saved views, ontologies) — separate from VCS issues on /api/*.
 * In dev, Vite proxies these paths to :4320; bundled on :3939 we proxy the same way.
 */

export const TURTLE_ADMIN_UI_DB_PORT = 4320;
export const TURTLE_ADMIN_UI_DB_ORIGIN = `http://127.0.0.1:${TURTLE_ADMIN_UI_DB_PORT}`;

/** Paths the @turtle.tech browse runtime hits via TrellisDb (see admin/vite.config.ts). */
export function isUiDbProxyPath(pathname: string): boolean {
  if (pathname === '/health') return true;
  if (pathname === '/query' || pathname === '/ontologies' || pathname.startsWith('/ontologies/'))
    return true;
  if (pathname === '/entities' || pathname.startsWith('/entities/')) return true;
  if (pathname === '/realtime' || pathname.startsWith('/realtime/')) return true;
  return false;
}

/** Forward a request to the local trellis db server (same paths, different port). */
export async function proxyUiDbRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const target = `${TURTLE_ADMIN_UI_DB_ORIGIN}${url.pathname}${url.search}`;
  const headers = new Headers(req.headers);
  headers.delete('host');

  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers,
    redirect: 'manual',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req.body;
    init.duplex = 'half';
  }

  try {
    return await fetch(target, init);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return Response.json(
      {
        error: `UI-state db unreachable at ${TURTLE_ADMIN_UI_DB_ORIGIN} — is trellis db serve running?`,
        detail: message,
      },
      { status: 503 },
    );
  }
}
