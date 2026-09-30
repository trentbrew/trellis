/**
 * Who may talk to `trellis admin` (ADR 0053 d1). The admin serves an
 * unauthenticated operator API, so "local" is enforced at three layers:
 *
 * - bind: loopback unless the operator passes `--host`
 * - Host header: loopback names only while loopback-bound, so a DNS-rebinding page
 *   (same-origin to the browser, so no `Origin` on GETs) is refused
 * - Origin: CORS is reflected for loopback origins plus `--allow-origin`, and a write
 *   from any other origin is refused outright — withholding CORS headers alone
 *   still lets a "simple" cross-site POST run
 */

export const LOOPBACK_BIND = '127.0.0.1';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export interface LocalAccessPolicy {
  /** True when bound to loopback; enables the Host-header check. */
  loopbackOnly: boolean;
  /** Extra origins allowed beyond loopback, e.g. `http://192.168.1.20:5173`. */
  allowOrigins: readonly string[];
}

export function isLoopbackBind(host: string): boolean {
  return LOOPBACK_HOSTNAMES.has(host) || host.startsWith('127.');
}

function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTNAMES.has(hostname) || /^127\.\d+\.\d+\.\d+$/.test(hostname);
}

/** Normalizes `--allow-origin` values so `http://x:5173/` matches `http://x:5173`. */
export function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, '');
  }
}

function isAllowedOrigin(origin: string, policy: LocalAccessPolicy): boolean {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && isLoopbackHostname(parsed.hostname)) {
    return true;
  }
  return policy.allowOrigins.includes(parsed.origin);
}

export type AccessDecision =
  | { ok: true; corsOrigin: string | null }
  | { ok: false; status: number; error: string };

/** Decide whether to serve `req`, and which origin (if any) to grant CORS. */
export function checkLocalAccess(req: Request, policy: LocalAccessPolicy): AccessDecision {
  if (policy.loopbackOnly) {
    const hostname = new URL(req.url).hostname;
    if (!isLoopbackHostname(hostname)) {
      return { ok: false, status: 403, error: `host "${hostname}" not allowed (loopback-bound admin)` };
    }
  }

  const origin = req.headers.get('origin');
  const allowed = origin != null && isAllowedOrigin(origin, policy);
  const isWrite = req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS';

  if (isWrite) {
    if (origin != null && !allowed) {
      return { ok: false, status: 403, error: `origin ${origin} not allowed — see trellis admin --allow-origin` };
    }
    const type = req.headers.get('content-type') ?? '';
    if (!type.toLowerCase().startsWith('application/json')) {
      return { ok: false, status: 415, error: 'writes require Content-Type: application/json' };
    }
  }

  return { ok: true, corsOrigin: allowed ? origin : null };
}

/** CORS headers for a granted origin; empty for same-origin or refused origins. */
export function corsHeadersFor(corsOrigin: string | null, preflight = false): Record<string, string> {
  if (!corsOrigin) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    Vary: 'Origin',
    ...(preflight
      ? {
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '600',
        }
      : {}),
  };
}
