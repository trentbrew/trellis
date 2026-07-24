/**
 * trellis admin — operator console (AffordanceShell + TML).
 * Spec: TRL-175 (kernel) · TRL-180 (playground probe / v1.1).
 */

import type { Command } from 'commander';
import chalk from 'chalk';
import { resolveRepoRoot } from './repo-path.js';
import { openBrowser } from './open-browser.js';

const DEFAULT_PLAYGROUND_URL = 'http://127.0.0.1:3000/vcs';
const PROBE_TIMEOUT_MS = 500;

async function probeUrl(url: string): Promise<boolean> {
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

export function registerAdminCommands(program: Command): void {
  const adminOpts = (cmd: Command) =>
    cmd
      .option('-p, --path <path>', 'Repository path', '.')
      .option('--port <port>', 'HTTP port', '3939')
      .option('--poll <ms>', 'Snapshot poll interval (ms)', '1000')
      .option('--no-open', 'Do not auto-open browser');

  const runAdmin = async (opts: { path: string; port: string; poll: string; open?: boolean; dev?: boolean }) => {
    const rootPath = resolveRepoRoot(opts.path);
    const port = parseInt(opts.port, 10) || 3939;
    const pollMs = parseInt(opts.poll, 10) || 1000;
    const dev = !!opts.dev;

    const { startLanesDashboard } = await import('../ui/lanes-dashboard.js');

    try {
      const handle = await startLanesDashboard({ rootPath, port, pollMs, dev });
      const kernelUrl = `http://127.0.0.1:${handle.port}/`;

      console.log(chalk.dim(`  Kernel dashboard on :${handle.port}`));
      if (dev) {
        console.log(chalk.dim('  UI dev: esbuild watch → .trellis/ui-dev/ · SSE /__dev/reload'));
      }
      console.log(chalk.dim('  SSE: /api/lanes/stream (ops) · TML boards use ?events=snapshot'));

      let openUrl = kernelUrl;
      let targetLabel = 'kernel /';

      if (opts.open !== false) {
        const override = process.env.TRELLIS_ADMIN_URL?.trim();
        if (override) {
          openUrl = override;
          targetLabel = 'TRELLIS_ADMIN_URL';
        } else {
          const playground =
            process.env.TRELLIS_PLAYGROUND_URL?.trim() || DEFAULT_PLAYGROUND_URL;
          const ok = await probeUrl(playground);
          if (ok) {
            openUrl = playground;
            targetLabel = 'playground /vcs';
          } else {
            openUrl = kernelUrl;
            targetLabel = 'kernel / (playground unreachable)';
          }
        }
        console.log(chalk.green(`✓ Trellis admin → ${chalk.bold(openUrl)}`));
        console.log(chalk.dim(`  open target: ${targetLabel}`));
        openBrowser(openUrl);
      } else {
        console.log(chalk.green(`✓ Trellis admin (no-open) → ${chalk.bold(kernelUrl)}`));
      }

      console.log(chalk.dim('  Press Ctrl+C to stop\n'));

      process.on('SIGINT', () => {
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
        'Live operator console (lanes / issues / op-log). Opens playground /vcs when reachable; else kernel /. Env: TRELLIS_ADMIN_URL, TRELLIS_PLAYGROUND_URL',
      )
      .option('--dev', 'UI dev mode: esbuild watch + SSE live reload (or TRELLIS_UI_DEV=1)'),
  ).action((opts) => runAdmin(opts));

  adminOpts(
    program
      .command('admin-dev')
      .description('Admin with UI dev mode (esbuild watch + SSE live reload on :3939)'),
  ).action((opts) => runAdmin({ ...opts, dev: true }));
}
