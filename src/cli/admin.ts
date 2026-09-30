/**
 * trellis admin — operator console (AffordanceShell + TML).
 * Spec: TRL-175 (kernel) · TRL-180 (playground probe / v1.1).
 */

import type { Command } from 'commander';
import chalk from 'chalk';
import { resolveRepoRoot } from './repo-path.js';
import { openBrowser } from './open-browser.js';
import { isLoopbackBind } from '../ui/local-access.js';
import {
  ensureTurtleAdminReachable,
  stopTurtleAdminChildren,
} from './turtle-admin-dev.js';

const DEFAULT_PLAYGROUND_URL = 'http://127.0.0.1:3000/vcs';
/** turtle-admin Vite dev server (`os/admin`, `just run` → :3940). */
export const DEFAULT_TURTLE_ADMIN_URL = 'http://127.0.0.1:3940';
const PROBE_TIMEOUT_MS = 500;

export async function probeUrl(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      redirect: 'follow',
    });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function collectOrigins(value: string, previous: string[]): string[] {
  return [...previous, value];
}

/** Loopback binds print as 127.0.0.1; wildcard binds too, since that's where to browse. */
export function urlHost(host: string): string {
  if (host === '0.0.0.0' || host === '::' || host === '127.0.0.1' || host === 'localhost') return '127.0.0.1';
  return host.includes(':') ? `[${host}]` : host;
}

/** ADR 0053 d1: say so, loudly, when the unauthenticated API is reachable off-box. */
export function warnIfExposed(host: string): void {
  if (isLoopbackBind(host)) return;
  console.log(
    chalk.yellow(
      `  ⚠ bound to ${host}: anyone who can reach this address can read the repo and write issues (no auth).`,
    ),
  );
}

export type AdminOpenTarget = { url: string; label: string };

/**
 * Pick which URL `trellis admin` opens in the browser (API always stays on kernelUrl).
 * Priority: TRELLIS_ADMIN_URL → turtle-admin :3940 → playground /vcs → kernel /.
 */
export async function resolveAdminOpenTarget(
  kernelUrl: string,
  probe: (url: string) => Promise<boolean> = probeUrl,
): Promise<AdminOpenTarget> {
  const override = process.env.TRELLIS_ADMIN_URL?.trim();
  if (override) {
    return { url: override, label: 'TRELLIS_ADMIN_URL' };
  }

  const turtleAdmin =
    process.env.TURTLE_ADMIN_URL?.trim() || DEFAULT_TURTLE_ADMIN_URL;
  if (await probe(turtleAdmin)) {
    return { url: turtleAdmin, label: 'turtle-admin' };
  }

  const playground =
    process.env.TRELLIS_PLAYGROUND_URL?.trim() || DEFAULT_PLAYGROUND_URL;
  if (await probe(playground)) {
    return { url: playground, label: 'playground /vcs' };
  }

  return { url: kernelUrl, label: 'kernel / (bundled UI)' };
}

export function registerAdminCommands(program: Command): void {
  const adminOpts = (cmd: Command) =>
    cmd
      .option('-p, --path <path>', 'Repository path', '.')
      .option('--port <port>', 'HTTP port', '3939')
      .option('--poll <ms>', 'Snapshot poll interval (ms)', '1000')
      .option('--no-open', 'Do not auto-open browser')
      .option(
        '--host <addr>',
        'Bind address (default 127.0.0.1). Anything else exposes an unauthenticated API (ADR 0053)',
      )
      .option(
        '--allow-origin <origin>',
        'Extra browser origin allowed CORS + writes, beyond loopback (repeatable)',
        collectOrigins,
        [] as string[],
      );

  const runAdmin = async (opts: {
    path: string;
    port: string;
    poll: string;
    open?: boolean;
    dev?: boolean;
    host?: string;
    allowOrigin?: string[];
  }) => {
    const rootPath = resolveRepoRoot(opts.path);
    const port = parseInt(opts.port, 10) || 3939;
    const pollMs = parseInt(opts.poll, 10) || 1000;
    const dev = !!opts.dev;

    const { startLanesDashboard } = await import('../ui/lanes-dashboard.js');

    try {
      const handle = await startLanesDashboard({
        rootPath,
        port,
        pollMs,
        dev,
        host: opts.host,
        allowOrigins: opts.allowOrigin,
      });
      const kernelUrl = `http://${urlHost(handle.host)}:${handle.port}/`;

      console.log(chalk.dim(`  Kernel dashboard on ${handle.host}:${handle.port}`));
      warnIfExposed(handle.host);
      if (dev) {
        console.log(chalk.dim('  UI dev: esbuild watch → .trellis/ui-dev/ · SSE /__dev/reload'));
      }
      console.log(chalk.dim('  SSE: /api/lanes/stream (ops) · TML boards use ?events=snapshot'));

      let turtleBoot = { children: [] as import('node:child_process').ChildProcess[] };

      if (opts.open !== false) {
        turtleBoot = await ensureTurtleAdminReachable(rootPath);
        const { url: openUrl, label: targetLabel } = await resolveAdminOpenTarget(kernelUrl);
        console.log(chalk.green(`✓ Trellis admin → ${chalk.bold(openUrl)}`));
        console.log(chalk.dim(`  open target: ${targetLabel}`));
        if (targetLabel === 'kernel / (bundled UI)') {
          console.log(
            chalk.dim(
              '  hint: use desk CLI (`just trellis admin` from os/) or start turtle-admin (`cd admin && just run`)',
            ),
          );
        }
        openBrowser(openUrl);
      } else {
        console.log(chalk.green(`✓ Trellis admin (no-open) → ${chalk.bold(kernelUrl)}`));
      }

      console.log(chalk.dim('  Press Ctrl+C to stop\n'));

      process.on('SIGINT', () => {
        stopTurtleAdminChildren(turtleBoot.children);
        handle.stop();
        console.log(chalk.dim('\nAdmin stopped.'));
        process.exit(0);
      });
    } catch (err: unknown) {
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
  };

  adminOpts(
    program
      .command('admin')
      .description(
        'Live operator console (lanes / issues / op-log). Opens turtle-admin :3940, else playground /vcs, else kernel /. Env: TRELLIS_ADMIN_URL, TURTLE_ADMIN_URL, TRELLIS_PLAYGROUND_URL',
      )
      .option('--dev', 'UI dev mode: esbuild watch + SSE live reload (or TRELLIS_UI_DEV=1)'),
  ).action((opts) => runAdmin(opts));

  adminOpts(
    program
      .command('admin-dev')
      .description('Admin with UI dev mode (esbuild watch + SSE live reload on :3939)'),
  ).action((opts) => runAdmin({ ...opts, dev: true }));
}
