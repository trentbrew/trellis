
import { startLedgerServerFromEnv } from '/Users/trentbrew/TURTLE/Projects/TRELLIS/trellis-node/src/server/ledger-serve.ts';

process.env.LEDGER_API_KEY = '35e97363c1e85b7813266eb916d2fba5a4c5e48595c21be9';
process.env.LEDGER_DATA_DIR = '/home/sprite/trellis-ledger/data';

await startLedgerServerFromEnv({ port: 8080 });
console.log('Trellis ledger sprite listening on port 8080');
