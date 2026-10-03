/**
 * Node.js HTTP + WebSocket adapter for the Trellis server.
 *
 * Runs the same request handler as the Bun.serve path, but via Node's
 * `node:http` module and the `ws` library. Used when the host runtime is
 * Node (or WebContainer) rather than Bun.
 *
 * Optional dependency: `ws`. Install only if you intend to run Trellis
 * outside of Bun.
 *
 * @module trellis/server
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { Server as NodeHttpServer } from 'http';

/** Default consecutive ports to try when `port` is busy (`trellis admin`, lane watch). */
export const DEFAULT_PORT_FALLBACK_ATTEMPTS = 32;

import type { RealtimeRelayOptions } from '../realtime/relay-server.js';
import type { TrellisHttpServer } from './server-shared.js';

export interface NodeAdapterOptions {
  port: number;
  hostname?: string;
  /**
   * Fetch-style request handler. Receives a standard `Request`, returns a
   * standard `Response`. The HTTP routing module already produces these.
   */
  fetch: (req: Request) => Promise<Response>;
  /** Hooks invoked for each WebSocket lifecycle event. */
  websocket: {
    open: (ws: WsLike) => void | Promise<void>;
    message: (ws: WsLike, data: string | Buffer) => void | Promise<void>;
    close: (ws: WsLike) => void;
  };
  /**
   * Mount a presence relay on `/rt` (or custom path). Coexists with the graph
   * subscription socket at `/realtime` when upgrades are path-scoped.
   * Pass full {@link RealtimeRelayOptions} to enable `/blob` via `blobStore`.
   */
  attachPresenceRelay?: boolean | RealtimeRelayOptions;
  /**
   * When > 1, try `port`, then `port + 1`, … on `EADDRINUSE` (ignored when `port` is 0).
   */
  portFallbackAttempts?: number;
}

/**
 * Minimal interface satisfied by both Bun's WebSocket and the `ws` library's
 * WebSocket. The subscription manager only uses `readyState` and `send`.
 */
export interface WsLike {
  readyState: number;
  send(data: string): void;
}

function listenOnce(
  httpServer: NodeHttpServer,
  port: number,
  hostname?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException) => {
      cleanup();
      reject(err);
    };
    const onListening = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      httpServer.removeListener('error', onError);
      httpServer.removeListener('listening', onListening);
    };
    httpServer.once('error', onError);
    httpServer.once('listening', onListening);
    httpServer.listen(port, hostname);
  });
}

export async function startNodeServer(
  opts: NodeAdapterOptions,
): Promise<TrellisHttpServer> {
  const http = await import('http');

  const httpServer = http.createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      // Blob routes may be claimed by attachRealtimeRelay's prepended listener
      // (PUT is async — check the claim flag, not just headersSent).
      const claimed = Boolean(
        (req as IncomingMessage & { [key: symbol]: boolean })[
          Symbol.for('trellis.blobClaimed')
        ],
      );
      if (claimed || res.headersSent || res.writableEnded) {
        return;
      }
      try {
        const fetchReq = await toFetchRequest(req);
        const fetchRes = await opts.fetch(fetchReq);
        await writeFetchResponse(res, fetchRes);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal Server Error', message: msg }));
      }
    },
  );

  let wss: any = null;
  try {
    const { WebSocketServer } = await import('ws');
    wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (req: IncomingMessage, socket: any, head: any) => {
      const reqPath = (req.url ?? '').split('?')[0];
      if (reqPath !== '/realtime') return;
      wss.handleUpgrade(req, socket, head, (ws: any) => {
        wss.emit('connection', ws, req);
      });
    });

    wss.on('connection', (ws: any) => {
      Promise.resolve(opts.websocket.open(ws)).catch(() => {});
      ws.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
        const data = Array.isArray(raw)
          ? Buffer.concat(raw).toString()
          : raw instanceof ArrayBuffer
            ? Buffer.from(raw).toString()
            : raw.toString();
        Promise.resolve(opts.websocket.message(ws, data)).catch(() => {});
      });
      ws.on('close', () => opts.websocket.close(ws));
    });
  } catch {
    // HTTP-only fallback (e.g. WebContainer graph UI — no WebSocket needed).
    httpServer.on('upgrade', (_req, socket) => {
      socket.destroy();
    });
  }

  const maxAttempts =
    opts.port === 0 ? 1 : Math.max(1, opts.portFallbackAttempts ?? 1);
  let boundPort = opts.port;
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = opts.port + i;
    try {
      await listenOnce(httpServer, candidate, opts.hostname);
      boundPort = candidate;
      break;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'EADDRINUSE' || i >= maxAttempts - 1) throw err;
    }
  }

  if (opts.attachPresenceRelay) {
    const { attachRealtimeRelay } = await import('../realtime/relay-server.js');
    const relayOpts =
      typeof opts.attachPresenceRelay === 'object'
        ? opts.attachPresenceRelay
        : { path: '/rt' };
    await attachRealtimeRelay(httpServer, relayOpts);
  }

  // After listen() resolves, read the actually-bound address — handles the
  // common "port 0" case where the OS picks an ephemeral port.
  const addr = httpServer.address();
  if (typeof addr === 'object' && addr) boundPort = addr.port;
  const boundHost =
    typeof addr === 'object' && addr ? addr.address : opts.hostname;

  return wrapNodeServer(httpServer, wss, boundPort, boundHost);
}

async function toFetchRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? 'localhost';
  const protocol = (req as any).socket?.encrypted ? 'https' : 'http';
  const url = `${protocol}://${host}${req.url ?? '/'}`;
  const method = req.method ?? 'GET';

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else if (value != null) {
      headers.set(key, value);
    }
  }

  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody
    ? new Uint8Array(await readBody(req))
    : undefined;
  return new Request(url, { method, headers, body });
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function writeFetchResponse(
  res: ServerResponse,
  fetchRes: Response,
): Promise<void> {
  res.statusCode = fetchRes.status;
  fetchRes.headers.forEach((value, key) => res.setHeader(key, value));
  if (!fetchRes.body) {
    res.end();
    return;
  }
  const reader = fetchRes.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}

function wrapNodeServer(
  httpServer: NodeHttpServer,
  wss: any,
  port: number,
  hostname?: string,
): TrellisHttpServer {
  return {
    port,
    hostname: hostname ?? 'localhost',
    stop(closeActiveConnections?: boolean): Promise<void> {
      return new Promise((resolve, reject) => {
        const closeHttp = () => {
          httpServer.close((err?: Error) => (err ? reject(err) : resolve()));
        };
        if (!wss) {
          closeHttp();
          return;
        }
        if (closeActiveConnections) {
          for (const client of wss.clients) client.terminate();
        }
        wss.close(() => closeHttp());
      });
    },
  };
}
