import { TenantPool, startServer, BlobStore } from 'trellis/server';
import { readConfig, defaultLocalConfig, writeConfig } from 'trellis/client';
import { join } from 'path';
import { existsSync } from 'fs';

const dbPath = '/home/sprite/trellis-db/data';
const configDir = '/home/sprite/trellis-db';

writeConfig(defaultLocalConfig(dbPath, {
  apiKey: 'test_key',
  jwtSecret: 'test_secret',
  port: 8080,
}), configDir);

const config = readConfig(configDir)!;
const pool = new TenantPool(dbPath, { backend: { backend: 'sqljs' } });
await pool.preload();

await startServer({
  port: 8080,
  config,
  pool,
  presenceRelay: {
    path: '/rt',
    blobStore: () => new BlobStore('/home/sprite/trellis-db'),
  },
});

console.log('Trellis DB running on port 8080');
console.log('Listening on port 8080');
