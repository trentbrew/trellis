#!/usr/bin/env node
/**
 * Pre-publish gate: coordination smoke + manifest pin check.
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

console.log('Ship check\n');

try {
  execSync('node scripts/trellis-coordination-smoke.mjs', {
    cwd: repoRoot,
    stdio: 'inherit',
  });
} catch {
  process.exit(1);
}

try {
  execSync('node scripts/sync-downstream.mjs --check', {
    cwd: repoRoot,
    stdio: 'inherit',
  });
} catch {
  console.error('\nRun: node scripts/sync-downstream.mjs');
  process.exit(1);
}

console.log('\n✓ Ship check passed');
