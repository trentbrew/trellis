import { Command } from 'commander';
import chalk from 'chalk';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { scaffoldPackage, validatePackage, updatePackageVersion, publishPackage, writeIndex, generateIndex } from '../registry/publish.js';
import { handleCliError } from './errors.js';

const REGISTRY_TYPES = ['workflow', 'agent', 'ontology', 'adapter', 'projection', 'theme', 'affordance'] as const;

export function registerPublishCommands(program: Command): void {
  const pub = program
    .command('publish')
    .description('Publish packages to the Trellis registry');

  pub
    .command('init')
    .description('Scaffold a new registry package')
    .argument('<type/name>', 'Package path (e.g. workflows/feature-development)')
    .option('-r, --registry <path>', 'Path to local registry clone', '.')
    .action((pkgPath: string, opts) => {
      try {
        const parts = pkgPath.split('/');
        if (parts.length !== 2) {
          console.error(chalk.red('Usage: trellis publish init <type>/<name> (e.g. workflows/feature-development)'));
          process.exit(1);
        }
        const [type, name] = parts;
        const filePath = scaffoldPackage(type, name, resolve(opts.registry));
        console.log(chalk.green(`✓ Scaffolded ${type}/${name}`));
        console.log(`  ${chalk.dim('File:')}  ${filePath}`);
        console.log(`  ${chalk.dim('Edit:')}  Add schemas, then run trellis publish validate`);
      } catch (err) {
        handleCliError(err);
      }
    });

  pub
    .command('validate')
    .description('Validate a package file and verify content hash')
    .argument('<file>', 'Path to package JSON file')
    .action((file: string) => {
      try {
        const result = validatePackage(resolve(file));
        if (result.valid && result.body) {
          console.log(chalk.green(`✓ Valid: ${result.body.name}@${result.body.version}`));
          console.log(`  ${chalk.dim('Content:')} ${result.body.content}`);
          console.log(`  ${chalk.dim('Schemas:')} ${result.body.schemas.length}`);
          if (result.body.depends && Object.keys(result.body.depends).length > 0) {
            console.log(`  ${chalk.dim('Depends:')}`);
            for (const [dep, range] of Object.entries(result.body.depends)) {
              console.log(`    ${dep} ${range}`);
            }
          }
        } else {
          console.error(chalk.red('Validation failed:'));
          for (const err of result.errors) {
            console.error(`  ${chalk.red('✗')} ${err}`);
          }
          process.exit(1);
        }
      } catch (err) {
        handleCliError(err);
      }
    });

  pub
    .command('version')
    .description('Bump version of a package file')
    .argument('<file>', 'Path to package JSON file')
    .argument('<version>', 'New semver version (e.g. 1.0.0)')
    .action((file: string, version: string) => {
      try {
        const body = updatePackageVersion(resolve(file), version);
        console.log(chalk.green(`✓ Updated ${body.name} to v${version}`));
        console.log(`  ${chalk.dim('Content:')} ${body.content}`);
      } catch (err) {
        handleCliError(err);
      }
    });

  pub
    .command('index')
    .description('Regenerate INDEX.json from the registry directory')
    .option('-r, --registry <path>', 'Path to local registry clone', '.')
    .action((opts: any) => {
      try {
        const dir = resolve(opts.registry);
        if (!existsSync(dir)) {
          console.error(chalk.red(`Directory not found: ${dir}`));
          process.exit(1);
        }
        writeIndex(dir);
        const index = generateIndex(dir);
        const pkgCount = Object.values(index.packages).reduce((sum, types) => sum + Object.keys(types).length, 0);
        console.log(chalk.green(`✓ INDEX.json regenerated (${pkgCount} packages)`));
      } catch (err) {
        handleCliError(err);
      }
    });

  const publishCmd = pub
    .command('publish')
    .description('Publish a package to the registry')
    .argument('<file>', 'Path to package JSON file')
    .option('-r, --registry <path>', 'Path to local registry clone', '.')
    .action((file: string, opts: any) => {
      try {
        const filePath = resolve(file);
        const result = validatePackage(filePath);
        if (!result.valid || !result.body) {
          console.error(chalk.red('Validation failed. Run trellis publish validate first.'));
          for (const err of result.errors) {
            console.error(`  ${chalk.red('✗')} ${err}`);
          }
          process.exit(1);
        }

        const body = result.body;
        const parts = body.name.replace('@trellis.computer/', '').split('/');
        const [type, name] = parts;

        publishPackage(resolve(opts.registry), type, name, filePath);
        console.log(chalk.green(`✓ Published ${body.name}@${body.version}`));
        console.log(`  ${chalk.dim('Type:')}     ${type}`);
        console.log(`  ${chalk.dim('Name:')}    ${name}`);
        console.log(`  ${chalk.dim('Schemas:')} ${body.schemas.length}`);
        console.log();
        console.log(chalk.dim('Next: git add, commit, and push the registry repo'));
      } catch (err) {
        handleCliError(err);
      }
    });
}
