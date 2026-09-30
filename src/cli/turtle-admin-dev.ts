/**
 * Discover and optionally boot turtle-admin (Vite :3940 + UI db :4320).
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import chalk from 'chalk';
import { DEFAULT_TURTLE_ADMIN_URL, probeUrl } from './admin.js';
import { bundledTurtleAdminAvailable } from '../ui/turtle-admin-static.js';

const DB_HEALTH_URL = 'http://127.0.0.1:4320/health';
const AUTOSTART_WAIT_MS = 120_000;
const POLL_MS = 400;

function isTurtleAdminDir(dir: string): boolean {
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string };
    return pkg.name === 'turtle-admin';
  } catch {
    return false;
  }
}

/** Resolve turtle-admin checkout (os/admin next to kernel or desk). */
export function findTurtleAdminDir(repoRoot: string): string | null {
  const explicit = process.env.TURTLE_ADMIN_PATH?.trim();
  if (explicit && isTurtleAdminDir(explicit)) return explicit;

  const parent = dirname(repoRoot);
  for (const dir of [join(repoRoot, 'admin'), join(parent, 'admin')]) {
    if (isTurtleAdminDir(dir)) return dir;
  }
  return null;
}

function spawnBackground(cwd: string, command: string, args: string[]): ChildProcess {
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });
  child.unref();
  return child;
}

async function waitForProbe(
  url: string,
  probe: (u: string) => Promise<boolean>,
  deadlineMs: number,
): Promise<boolean> {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    if (await probe(url)) return true;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return false;
}

export type TurtleAdminBoot = {
  children: ChildProcess[];
};

/**
 * If turtle-admin is not up, start `bun run dev:db` and `bun run dev` when a checkout is found.
 * Returns child processes to optionally kill on shutdown.
 */
export async function ensureTurtleAdminReachable(
  repoRoot: string,
  probe: (url: string) => Promise<boolean> = probeUrl,
): Promise<TurtleAdminBoot> {
  const children: ChildProcess[] = [];
  const uiUrl = process.env.TURTLE_ADMIN_URL?.trim() || DEFAULT_TURTLE_ADMIN_URL;

  if (bundledTurtleAdminAvailable() || process.env.TRELLIS_ADMIN_NO_AUTOSTART === '1') {
    return { children };
  }
  if (await probe(uiUrl)) {
    return { children };
  }

  const adminDir = findTurtleAdminDir(repoRoot);
  if (!adminDir) {
    return { children };
  }

  console.log(chalk.dim(`  Starting turtle-admin from ${adminDir}…`));

  if (!(await probe(DB_HEALTH_URL))) {
    children.push(spawnBackground(adminDir, 'bun', ['run', 'dev:db']));
    const dbOk = await waitForProbe(DB_HEALTH_URL, probe, 20_000);
    if (!dbOk) {
      console.log(chalk.yellow('  trellis db (:4320) did not become ready — UI state may be limited'));
    }
  }

  children.push(spawnBackground(adminDir, 'bun', ['run', 'dev']));

  const uiOk = await waitForProbe(uiUrl, probe, AUTOSTART_WAIT_MS);
  if (uiOk) {
    console.log(chalk.dim(`  turtle-admin ready at ${uiUrl}`));
  } else {
    console.log(
      chalk.yellow(
        `  turtle-admin did not respond on ${uiUrl} — still trying playground / kernel UI`,
      ),
    );
  }

  return { children };
}

export function stopTurtleAdminChildren(children: ChildProcess[]): void {
  for (const child of children) {
    try {
      if (child.pid) process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch {
      try {
        child.kill('SIGTERM');
      } catch {
        /* already gone */
      }
    }
  }
}
