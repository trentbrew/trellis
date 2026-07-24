/**
 * trellis ledger-sprite — deploy production ledger handler (TRL-243).
 */
import type { Command } from 'commander';
import chalk from 'chalk';
import { resolveRepoRoot } from './repo-path.js';
import { deployLedgerSprite } from '../server/deploy-ledger.js';

export function registerLedgerSpriteCommands(program: Command): void {
  const ledgerSprite = program
    .command('ledger-sprite')
    .description('Deploy ledger HTTP handler to Fly Sprites');

  ledgerSprite
    .command('deploy')
    .description('Deploy /v0/ledger handler to a sprite')
    .requiredOption('--name <name>', 'Sprite slug (3–32 chars)')
    .option('--port <port>', 'HTTP port', '8080')
    .option('--stub', 'Write local config without provisioning sprite')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const result = await deployLedgerSprite({
        name: opts.name,
        port: Number(opts.port),
        configDir: rootPath,
        stub: opts.stub,
        onProgress: (msg) => console.log(chalk.dim(msg)),
      });

      console.log(chalk.green(`✓ Ledger sprite deployed`));
      console.log(`  ${chalk.dim('URL:')}    ${result.url}`);
      console.log(`  ${chalk.dim('Key:')}    ${result.apiKey}`);
      console.log(
        chalk.dim(
          '  Store key: export TRELLIS_REMOTE_KEY=… or trellis remote provision',
        ),
      );
    });
}
