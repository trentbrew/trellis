
import { TenantPool, startServer } from '/Users/trentbrew/TURTLE/Projects/TRELLIS/trellis-node/dist/server/index.js';
import { readConfig, defaultLocalConfig, writeConfig } from '/Users/trentbrew/TURTLE/Projects/TRELLIS/trellis-node/dist/client/index.js';
import { join } from 'path';
import { existsSync } from 'fs';

const dbPath = '/home/sprite/trellis-db/data';
const configDir = '/home/sprite/trellis-db';

writeConfig(defaultLocalConfig(dbPath, {
  apiKey: 'spk_y5ZlYq1mJ-OwXP9mSVrdmKuevKZ1Irc8',
  jwtSecret: 'jws_hNmKTSdV7kjEC3v1fvj8rEt7JTzi_9ub',
  port: 8080,
}), configDir);

const config = readConfig(configDir)!;
// Sprites VMs lack better-sqlite3 native bindings — use WASM sql.js backend.
const pool = new TenantPool(dbPath, { backend: { backend: 'sqljs' } });
await pool.preload();

await startServer({ port: 8080, config, pool, presenceRelay: true });

console.log('Trellis DB running on port 8080');
console.log(`Listening on port 8080`);
