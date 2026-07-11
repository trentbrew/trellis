/**
 * Desk browser relay — HTTP verify jobs + WebSocket extension bridge.
 *
 * CLI POSTs to /browser/verify; connected extension executes steps in the live tab.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import type {
  BrowserRelayMessage,
  BrowserVerifyRequest,
  BrowserVerifyResponse,
} from './browser-types.js';
import { DEFAULT_BROWSER_RELAY_PORT } from './browser-types.js';

interface RelaySocket {
  readyState: number;
  readonly OPEN: number;
  send(data: string): void;
  close(): void;
  on(event: 'message', cb: (data: unknown) => void): void;
  on(event: 'close', cb: () => void): void;
}

export interface BrowserRelayOptions {
  port?: number;
  host?: string;
  WebSocketServerImpl?: unknown;
}

export interface BrowserRelay {
  port: number;
  url: string;
  extensionConnected(): boolean;
  close(): Promise<void>;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function writeJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

export async function createBrowserRelay(
  opts: BrowserRelayOptions = {},
): Promise<BrowserRelay> {
  const port = opts.port ?? DEFAULT_BROWSER_RELAY_PORT;
  const host = opts.host ?? '127.0.0.1';

  let extensionSocket: RelaySocket | null = null;
  const pendingJobs = new Map<
    string,
    {
      resolve: (result: BrowserVerifyResponse) => void;
      reject: (err: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  const wssModule = await import('ws');
  const WSS =
    (opts.WebSocketServerImpl as typeof wssModule.WebSocketServer | undefined) ??
    wssModule.WebSocketServer;

  const wss = new WSS({ noServer: true });

  wss.on('connection', (socket: RelaySocket) => {
    socket.on('message', (data) => {
      let msg: BrowserRelayMessage;
      try {
        msg = JSON.parse(String(data)) as BrowserRelayMessage;
      } catch {
        return;
      }

      if (msg.type === 'register' && msg.role === 'extension') {
        extensionSocket?.close();
        extensionSocket = socket;
        return;
      }

      if (msg.type === 'verify:result') {
        const pending = pendingJobs.get(msg.jobId);
        if (!pending) return;
        clearTimeout(pending.timer);
        pendingJobs.delete(msg.jobId);
        pending.resolve(msg.result);
        return;
      }

      if (msg.type === 'ping') {
        socket.send(
          JSON.stringify({
            type: 'pong',
            extensionConnected: extensionSocket === socket,
          } satisfies BrowserRelayMessage),
        );
      }
    });

    socket.on('close', () => {
      if (extensionSocket === socket) extensionSocket = null;
    });
  });

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${host}:${port}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS);
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      writeJson(res, 200, {
        ok: true,
        relay: '/browser',
        extensionConnected: Boolean(
          extensionSocket && extensionSocket.readyState === extensionSocket.OPEN,
        ),
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/browser/verify') {
      if (!extensionSocket || extensionSocket.readyState !== extensionSocket.OPEN) {
        writeJson(res, 503, {
          ok: false,
          error:
            'Trellis extension not connected. Load the extension and ensure relay is running.',
          steps: [],
          durationMs: 0,
        });
        return;
      }

      let body: BrowserVerifyRequest;
      try {
        body = (await readJsonBody(req)) as BrowserVerifyRequest;
      } catch {
        writeJson(res, 400, {
          ok: false,
          error: 'Invalid JSON body',
          steps: [],
          durationMs: 0,
        });
        return;
      }

      if (!body.steps?.length) {
        writeJson(res, 400, {
          ok: false,
          error: 'Missing verify steps',
          steps: [],
          durationMs: 0,
        });
        return;
      }

      const jobId = body.jobId ?? randomUUID();
      const timeoutMs = body.timeoutMs ?? 30_000;

      try {
        const result = await new Promise<BrowserVerifyResponse>((resolve, reject) => {
          const timer = setTimeout(() => {
            pendingJobs.delete(jobId);
            reject(new Error(`Verify timed out after ${timeoutMs}ms`));
          }, timeoutMs);

          pendingJobs.set(jobId, { resolve, reject, timer });

          const job: BrowserRelayMessage = {
            type: 'verify:job',
            jobId,
            suiteId: body.suiteId,
            steps: body.steps,
          };
          extensionSocket!.send(JSON.stringify(job));
        });

        writeJson(res, result.ok ? 200 : 422, { ...result, jobId });
      } catch (err) {
        writeJson(res, 504, {
          ok: false,
          jobId,
          error: err instanceof Error ? err.message : 'Verify failed',
          steps: [],
          durationMs: 0,
        });
      }
      return;
    }

    res.writeHead(404, CORS);
    res.end('Not found');
  });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', `http://${host}:${port}`);
    if (url.pathname !== '/browser') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, host, () => resolve());
    server.on('error', reject);
  });

  const address = server.address();
  const actualPort =
    typeof address === 'object' && address && 'port' in address
      ? address.port
      : port;

  const url = `http://${host}:${actualPort}`;

  return {
    port: actualPort,
    url,
    extensionConnected: () =>
      Boolean(extensionSocket && extensionSocket.readyState === extensionSocket.OPEN),
    close: async () => {
      for (const [, pending] of pendingJobs) {
        clearTimeout(pending.timer);
        pending.reject(new Error('Relay shutting down'));
      }
      pendingJobs.clear();
      extensionSocket?.close();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
