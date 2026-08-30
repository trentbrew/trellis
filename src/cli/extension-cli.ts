/**
 * trellis extension — grounded-extension reasoning over claim graphs.
 */
import type { Command } from 'commander';
import chalk from 'chalk';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { TrellisKernel } from '../core/kernel/trellis-kernel.js';
import { createKernelBackend } from '../core/persist/factory.js';
import { PROVENANCE } from '../core/persist/canonical-op.js';
import {
  computeGroundedExtension,
  type AttackEdge,
} from '../reasoning/index.js';
import { extensionFromKernel } from '../reasoning/extension-query.js';
import { BIBLE_PROJECTIONS, seedGenealogies } from '../../examples/bible-claims/index.js';

const TOY_CLAIMS = ['C1', 'C2', 'C3'] as const;
const TOY_ATTACKS: AttackEdge[] = [{ attacker: 'C2', target: 'C1' }];

async function runToyFixture(): Promise<void> {
  const result = computeGroundedExtension(TOY_CLAIMS, TOY_ATTACKS);
  console.log(chalk.bold('Toy fixture (C2 attacks C1):'));
  console.log(`  accepted:  ${[...result.accepted].join(', ') || '(none)'}`);
  console.log(`  defeated:  ${[...result.defeated].join(', ') || '(none)'}`);
  console.log(`  undecided: ${[...result.undecided].join(', ') || '(none)'}`);
}

async function runBibleDemo(worldview: string): Promise<void> {
  const tmpDir = mkdtempSync(join(tmpdir(), 'trellis-extension-demo-'));
  const backend = await createKernelBackend(join(tmpDir, 'kernel.db'));
  const kernel = new TrellisKernel({
    backend,
    agentId: 'extension-cli',
    provenance: PROVENANCE.cli,
    snapshotThreshold: 0,
  });
  kernel.boot();

  try {
    const seed = await seedGenealogies(kernel);
    console.log(
      chalk.dim(
        `Seeded ${seed.claimsCreated} claims, ${seed.attacksLinked} attack links`,
      ),
    );

    const projection = BIBLE_PROJECTIONS[worldview];
    if (!projection) {
      console.error(
        chalk.red(
          `Unknown worldview '${worldview}'. Use bible:matthew-view or bible:luke-view.`,
        ),
      );
      process.exit(1);
    }

    const result = extensionFromKernel(kernel, worldview, BIBLE_PROJECTIONS);
    console.log(chalk.bold(`Grounded extension — ${projection.name}`));
    console.log(`  scope:     ${result.claims.length} claims`);
    console.log(`  accepted:  ${result.accepted.size}`);
    console.log(`  defeated:  ${result.defeated.size}`);
    console.log(`  undecided: ${result.undecided.size}`);
    console.log('');
    for (const claim of result.claims) {
      const status = result.accepted.has(claim.id)
        ? chalk.green('IN')
        : result.defeated.has(claim.id)
          ? chalk.red('OUT')
          : chalk.yellow('?');
      console.log(`  ${status}  ${claim.title}`);
    }
  } finally {
    kernel.close();
    backend.close?.();
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

export function registerExtensionCommands(program: Command): void {
  const extensionCmd = program
    .command('extension')
    .description('Grounded-extension reasoning over claim attack graphs');

  extensionCmd
    .command('compute')
    .description('Compute grounded extension for claims')
    .option('--toy', 'Run built-in toy fixture (C2 attacks C1)')
    .option(
      '--demo <name>',
      'Run embedded demo dataset (bible)',
    )
    .option(
      '--worldview <id>',
      'Projection / tradition id (default: bible:matthew-view)',
      'bible:matthew-view',
    )
    .action(async (opts) => {
      if (opts.toy) {
        await runToyFixture();
        return;
      }

      if (opts.demo === 'bible') {
        await runBibleDemo(String(opts.worldview));
        return;
      }

      console.error(
        chalk.red('Specify --toy or --demo bible. Kernel-backed queries coming later.'),
      );
      process.exit(1);
    });
}
