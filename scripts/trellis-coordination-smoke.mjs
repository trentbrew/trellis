#!/usr/bin/env node
/**
 * Smoke check for Trellis agent coordination (hooks + kernel defaults).
 *
 * Usage:
 *   node scripts/trellis-coordination-smoke.mjs
 *   node scripts/trellis-coordination-smoke.mjs --repo /path/to/project
 */
import { existsSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ensureShipTmp } from './ship-utils.mjs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const cursorHooks = join(homedir(), '.cursor', 'hooks');
const repoArg = process.argv.indexOf('--repo');
const targetRepo =
  repoArg >= 0 ? process.argv[repoArg + 1] : process.cwd();

const requiredHooks = [
  'trellis-session-lane.mjs',
  'trellis-session-start.mjs',
  'trellis-bind-role.mjs',
  'trellis-lane-guard.mjs',
];

let failed = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failed += 1;
}

console.log('Trellis coordination smoke\n');

console.log('Global Cursor hooks');
for (const hook of requiredHooks) {
  const path = join(cursorHooks, hook);
  if (existsSync(path)) ok(hook);
  else fail(`missing ${path} — install from desk or copy trellis-node templates`);
}

console.log('\nKernel tests');
try {
  execSync(
    'bun test test/vcs/init-config-defaults.test.ts test/vcs/phase2-coordination.test.ts test/git/git-sync.test.ts',
    { cwd: repoRoot, stdio: 'pipe', encoding: 'utf8' },
  );
  ok('coordination unit tests');
} catch (err) {
  fail('coordination unit tests failed');
  if (err.stdout) console.error(err.stdout.slice(-800));
  if (err.stderr) console.error(err.stderr.slice(-800));
}

console.log('\nInit config defaults (ephemeral)');
const smokeTmp = ensureShipTmp(repoRoot);
const smokeRoot = join(smokeTmp, `trellis-coord-smoke-${process.pid}`);
try {
  rmSync(smokeRoot, { recursive: true, force: true });
  mkdirSync(smokeRoot, { recursive: true });
  execSync(`bun "${join(repoRoot, 'src/cli/index.ts')}" init -p "${smokeRoot}" --minimal --no-interactive`, {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const config = JSON.parse(
    readFileSync(join(smokeRoot, '.trellis', 'config.json'), 'utf8'),
  );
  if (config.lanes?.worktreeBind === true) ok('worktreeBind default');
  else fail('worktreeBind not true in fresh init');
  if (config.git?.syncOnPromote === true) ok('git.syncOnPromote default');
  else fail('git.syncOnPromote not true in fresh init');
} catch (err) {
  fail(`ephemeral init failed: ${err.message}`);
} finally {
  rmSync(smokeRoot, { recursive: true, force: true });
}

if (existsSync(join(targetRepo, '.trellis', 'config.json'))) {
  console.log(`\nTarget repo: ${targetRepo}`);
  const config = JSON.parse(
    readFileSync(join(targetRepo, '.trellis', 'config.json'), 'utf8'),
  );
  if (config.lanes?.worktreeBind === true) ok('worktreeBind enabled');
  else fail('worktreeBind not enabled — merge into .trellis/config.json');
  if (config.git?.syncOnPromote !== false) ok('git.syncOnPromote enabled');
  else fail('git.syncOnPromote disabled');
} else {
  console.log(`\nTarget repo ${targetRepo}: no .trellis/config.json (skipped)`);
}

console.log('');
if (failed > 0) {
  console.error(`Smoke failed (${failed} check(s))`);
  process.exit(1);
}
console.log('Smoke passed');
