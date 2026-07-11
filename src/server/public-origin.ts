/**
 * Resolve the public origin for OAuth metadata behind reverse proxies (Sprites, etc.).
 *
 * @module trellis/server
 */

/** Public base URL (scheme + host, no path) for well-known OAuth documents. */
export function requestPublicOrigin(req: Request, url: URL): string {
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost =
    req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ??
    req.headers.get('host') ??
    url.host;

  if (forwardedHost) {
    let proto = forwardedProto;
    if (!proto && /\.sprites\.app$/i.test(forwardedHost.split(':')[0] ?? '')) {
      proto = 'https';
    }
    if (proto) {
      return `${proto}://${forwardedHost}`;
    }
  }

  return url.origin;
}
