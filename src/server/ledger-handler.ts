/**
 * HTTP handler for /v0/ledger/* — production sprite peer (TRL-243).
 */
import { startNodeServer } from './node-adapter.js';
import { LedgerStore } from './ledger-store.js';
import type { TrellisHttpServer } from './server-shared.js';

export interface LedgerHandlerOptions {
  store: LedgerStore;
  /** When set, require Authorization: Bearer <key> */
  apiKey?: string;
}

export function resolveLedgerApiKey(): string | undefined {
  const key = process.env.LEDGER_API_KEY?.trim();
  return key || undefined;
}

function authorize(req: Request, apiKey?: string): Response | null {
  if (!apiKey) return null;
  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${apiKey}`;
  if (header !== expected) {
    return json({ error: 'unauthorized' }, 401);
  }
  return null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function createLedgerFetchHandler(
  opts: LedgerHandlerOptions,
): (req: Request) => Promise<Response> {
  const { store, apiKey } = opts;

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const denied = authorize(req, apiKey);
    if (denied) return denied;

    if (url.pathname === '/health' && req.method === 'GET') {
      return json({ ok: true, service: 'trellis-ledger' });
    }

    if (url.pathname === '/v0/ledger/tail' && req.method === 'GET') {
      const repoId = url.searchParams.get('repoId') ?? '';
      if (!repoId) return json({ error: 'repoId required' }, 400);
      const tip = store.getTail(repoId);
      if (!tip) return new Response('{}', { status: 404 });
      return json(tip);
    }

    if (url.pathname === '/v0/ledger/repos' && req.method === 'GET') {
      return json(store.listRepos());
    }

    if (url.pathname === '/v0/ledger/push' && req.method === 'POST') {
      let payload: Record<string, unknown>;
      try {
        payload = (await req.json()) as Record<string, unknown>;
      } catch {
        return json({ error: 'invalid json' }, 400);
      }
      const repoId = payload.repoId;
      const tailHash = payload.tailHash;
      const checkpoint = payload.checkpoint;
      if (typeof repoId !== 'string' || typeof tailHash !== 'string' || typeof checkpoint !== 'string') {
        return json({ error: 'invalid push payload' }, 400);
      }
      const result = store.push({
        repoId,
        previousTail:
          typeof payload.previousTail === 'string' ? payload.previousTail : undefined,
        tailHash,
        format: typeof payload.format === 'string' ? payload.format : 'jsonl',
        byteLength:
          typeof payload.byteLength === 'number'
            ? payload.byteLength
            : Buffer.byteLength(checkpoint, 'utf-8'),
        lineCount:
          typeof payload.lineCount === 'number'
            ? payload.lineCount
            : checkpoint.split('\n').filter((l) => l.trim()).length,
        checkpoint,
      });
      if (!result.ok) {
        return new Response('tail mismatch', { status: 409 });
      }
      return json({ ok: true });
    }

    const checkpointMatch = url.pathname.match(/^\/v0\/ledger\/checkpoints\/(.+)$/);
    if (checkpointMatch && req.method === 'GET') {
      const tailHash = decodeURIComponent(checkpointMatch[1]!);
      const body = store.findCheckpointByHash(tailHash);
      if (!body) return new Response('missing', { status: 404 });
      return new Response(body, {
        status: 200,
        headers: { 'content-type': 'application/jsonl' },
      });
    }

    return json({ error: 'not found' }, 404);
  };
}

export async function startLedgerServer(opts: {
  store: LedgerStore;
  apiKey?: string;
  port?: number;
  hostname?: string;
}): Promise<TrellisHttpServer> {
  const fetch = createLedgerFetchHandler({
    store: opts.store,
    apiKey: opts.apiKey,
  });
  return startNodeServer({
    port: opts.port ?? 0,
    hostname: opts.hostname ?? '127.0.0.1',
    fetch,
    websocket: {
      open: () => { },
      message: () => { },
      close: () => { },
    },
  });
}
