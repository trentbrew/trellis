/**
 * Start a repo-local trellis db for turtle-admin UI state (port 4320).
 */

import { existsSync, mkdirSync } from 'node:fs';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { probeUrl } from './admin.js';
import {
  TURTLE_ADMIN_UI_DB_ORIGIN,
  TURTLE_ADMIN_UI_DB_PORT,
} from '../ui/turtle-admin-ui-db.js';

const POLL_MS = 400;
const START_TIMEOUT_MS = 25_000;

function trellisCliEntry(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../../bin/trellis.mjs');
}

function uiDbConfigDir(repoRoot: string): string {
  return join(repoRoot, '.trellis', 'admin-ui');
}

function spawnSyncCli(args: string[], cwd: string): void {
  const res = spawnSync(process.execPath, [trellisCliEntry(), ...args], {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
  if (res.status !== 0) {
    throw new Error(`trellis ${args.join(' ')} failed (exit ${res.status ?? '?'})`);
  }
}

function spawnBackground(args: string[], cwd: string): ChildProcess {
  const child = spawn(process.execPath, [trellisCliEntry(), ...args], {
    cwd,
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });
  child.unref();
  return child;
}

async function waitForDb(): Promise<boolean> {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await probeUrl(`${TURTLE_ADMIN_UI_DB_ORIGIN}/health`)) return true;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return false;
}

/** Ensure `.trellis/admin-ui` db exists and is listening on :4320. */
export async function ensureBundledAdminUiDb(repoRoot: string): Promise<ChildProcess[]> {
  const children: ChildProcess[] = [];
  if (process.env.TRELLIS_ADMIN_NO_UI_DB === '1') return children;

  if (await probeUrl(`${TURTLE_ADMIN_UI_DB_ORIGIN}/health`)) {
    return children;
  }

  const configDir = uiDbConfigDir(repoRoot);
  mkdirSync(configDir, { recursive: true });
  const configFile = join(configDir, '.trellis-db.json');

  if (!existsSync(configFile)) {
    console.log(chalk.dim(`  Initializing UI-state db in ${configDir}…`));
    spawnSyncCli(
      ['db', 'init', '--port', String(TURTLE_ADMIN_UI_DB_PORT), '--path', join(configDir, 'data')],
      configDir,
    );
  }

  console.log(chalk.dim(`  Starting UI-state db on :${TURTLE_ADMIN_UI_DB_PORT}…`));
  children.push(
    spawnBackground(
      ['db', 'serve', '--port', String(TURTLE_ADMIN_UI_DB_PORT), '--config-dir', configDir],
      configDir,
    ),
  );

  const ok = await waitForDb();
  if (!ok) {
    console.log(
      chalk.yellow(
        `  UI-state db did not become ready on :${TURTLE_ADMIN_UI_DB_PORT} — saved views may not work`,
      ),
    );
  }

  return children;
}
