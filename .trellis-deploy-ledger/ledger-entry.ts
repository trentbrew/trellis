
import { startLedgerServerFromEnv } from '/Users/trentbrew/TURTLE/Projects/TRELLIS/trellis-node/src/server/ledger-serve.ts';

process.env.LEDGER_API_KEY = '41f39bf0eafb337a5e6d47d01b5734002ad848c4ba0165da';
process.env.LEDGER_DATA_DIR = '/home/sprite/trellis-ledger/data';

await startLedgerServerFromEnv({ port: 8080 });
console.log('Trellis ledger sprite listening on port 8080');
