/**
 * `trellis sandbox` — browser WebContainer host for the Trellis CLI demo.
 */

import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';

import { buildSandboxBootstrap } from '../wc/pack.js';
import { startSandboxHost } from '../wc/host.js';
import { resolveRepoRoot } from './repo-path.js';

function findTrellisPackageRoot(startPath: string): string {
  let dir = path.resolve(startPath);
  while (true) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: string };
      if (pkg.name === 'trellis') return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolveRepoRoot(startPath);
}

export function registerSandboxCommands(program: import('commander').Command): void {
  const sandbox = program
    .command('sandbox')
    .description('WebContainer sandbox — Trellis CLI + graph in the browser');

  sandbox
    .command('serve')
    .description('Start the WebContainer sandbox host (COOP/COEP + bootstrap API)')
    .option('-p, --port <port>', 'Port', '4321')
    .option('--host <host>', 'Bind host', '127.0.0.1')
    .option('-P, --path <path>', 'Trellis package root (default: auto-detect)', '.')
    .action((opts) => {
      const trellisRoot = findTrellisPackageRoot(opts.path);
      const port = Number(opts.port);

      startSandboxHost({
        port,
        host: opts.host,
        trellisRoot,
        onListen: (url) => {
          console.log('');
          console.log(chalk.bold('  Trellis WebContainer sandbox'));
          console.log(`  ${chalk.cyan('→')} ${url}`);
          console.log(chalk.dim('  Requires: npm run build'));
          console.log('');
        },
      });
    });

  sandbox
    .command('pack')
    .description('Write WebContainer bootstrap JSON for static deploy (Vercel)')
    .option('-P, --path <path>', 'Trellis package root (default: auto-detect)', '.')
    .option('-o, --output <file>', 'Output file (default: stdout)')
    .option('--sourcemaps', 'Include dist sourcemaps (larger payload)', false)
    .option('--no-prune', 'Keep every vendored build variant (adds ~18 MB)')
    .action((opts) => {
      const trellisRoot = findTrellisPackageRoot(opts.path);
      const bootstrap = buildSandboxBootstrap(trellisRoot, {
        sourcemaps: opts.sourcemaps,
        prune: opts.prune,
      });
      const json = JSON.stringify(bootstrap);
      if (opts.output) {
        fs.mkdirSync(path.dirname(path.resolve(opts.output)), { recursive: true });
        fs.writeFileSync(opts.output, json);
        const mb = (Buffer.byteLength(json) / (1024 * 1024)).toFixed(2);
        console.error(`wrote ${opts.output} (${mb} MB)`);
      } else {
        process.stdout.write(json);
      }
    });

  sandbox
    .command('help')
    .description('Show sandbox usage')
    .action(() => {
      console.log(`
  trellis sandbox serve [--port 4321]
  trellis sandbox pack -o public/bootstrap.json

  Opens a browser terminal running the Trellis CLI inside StackBlitz WebContainer.
  Host-vendored node_modules + native stubs avoid in-browser npm install.
  \`pack\` writes bootstrap JSON for static deploy (Vercel).

  Legacy alias: npm run test:wc
`);
    });
}
