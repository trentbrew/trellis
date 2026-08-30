#!/usr/bin/env tsx
/**
 * Seed Bible genealogy claims into a Trellis kernel DB (idempotent).
 */
import { readConfig } from 'trellis/client';
import { TenantPool } from 'trellis/server';
import { attachStandardMiddleware } from 'trellis/core';
import { seedGenealogies } from 'trellis/bible-claims';

const config = readConfig('.');
if (!config?.dbPath) {
  console.error('No .trellis-db.json — run from a Trellis project root');
  process.exit(1);
}

const backendOpts =
  process.env.TRELLIS_BACKEND === 'sqljs'
    ? { backend: 'sqljs' as const }
    : process.env.TRELLIS_BACKEND === 'better-sqlite'
      ? { backend: 'better-sqlite' as const }
      : undefined;

const pool = new TenantPool(
  config.dbPath,
  backendOpts ? { backend: backendOpts } : undefined,
);
await pool.preload();

const kernel = pool.get(null);
const result = await seedGenealogies(kernel);
attachStandardMiddleware(kernel);
pool.closeAll();

console.log('✓ Bible genealogy seed complete');
console.log(`  ontologies: ${result.ontologiesRegistered}`);
console.log(`  persons:    ${result.personsCreated}`);
console.log(`  traditions: ${result.traditionsCreated}`);
console.log(`  claims:     ${result.claimsCreated}`);
console.log(`  attacks:    ${result.attacksLinked}`);
