/**
 * Production entrypoint for ledger sprite deploy bundle.
 */
import { join } from 'node:path';
import { LedgerStore } from './ledger-store.js';
import { resolveLedgerApiKey, startLedgerServer } from './ledger-handler.js';

export async function startLedgerServerFromEnv(opts?: {
  port?: number;
  dataDir?: string;
}): Promise<void> {
  const dataRoot =
    opts?.dataDir ??
    process.env.LEDGER_DATA_DIR ??
    join(process.cwd(), 'data');
  const store = new LedgerStore(dataRoot);
  await startLedgerServer({
    store,
    apiKey: resolveLedgerApiKey(),
    port: opts?.port ?? Number(process.env.PORT ?? 8080),
    hostname: '0.0.0.0',
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startLedgerServerFromEnv().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
