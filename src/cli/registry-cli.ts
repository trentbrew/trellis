import { Command } from 'commander';
import chalk from 'chalk';
import { resolveRepoRoot } from './repo-path.js';
import { handleCliError } from './errors.js';
import { RegistryClient } from '../registry/client.js';
import { readLockfile, writeLockfile, createLockfile, removeFromLockfile, findDependents } from '../registry/lockfile.js';
import { resolvePackage } from '../registry/resolver.js';
import { TrellisKernel } from '../core/kernel/trellis-kernel.js';
import { join } from 'path';

const REGISTRY_TYPES = ['workflow', 'agent', 'ontology', 'adapter', 'projection', 'theme', 'affordance'] as const;
type RegistryType = typeof REGISTRY_TYPES[number];

function typeToScope(type: RegistryType): string {
  const map: Record<RegistryType, string> = {
    workflow: 'workflows',
    agent: 'agents',
    ontology: 'ontologies',
    adapter: 'adapters',
    projection: 'projections',
    theme: 'themes',
    affordance: 'affordances',
  };
  return map[type];
}

async function handleAdd(type: string, name: string, rootPath: string): Promise<void> {
  if (!REGISTRY_TYPES.includes(type as RegistryType)) {
    console.error(chalk.red(`Invalid type: ${type}. Must be one of: ${REGISTRY_TYPES.join(', ')}`));
    process.exit(1);
  }

  const scope = typeToScope(type as RegistryType);
  const client = new RegistryClient();
  const lockfile = readLockfile(rootPath) || createLockfile();

  console.log(chalk.dim(`Resolving ${name} from @trellis.computer/${scope}...`));

  const result = await resolvePackage(client, lockfile, scope, name);

  if (!result.success) {
    console.error(chalk.red('Resolution failed:'));
    for (const conflict of result.conflicts) {
      console.error(`  ${chalk.red('✗')} ${conflict.message}`);
    }
    process.exit(1);
  }

  writeLockfile(rootPath, result.lockfile);

  const dbPath = join(rootPath, '.trellis', 'kernel.db');
  const { createKernelBackend } = await import('../core/persist/factory.js');
  const { attachStandardMiddleware } = await import('../core/kernel/boot-middleware.js');
  const { PROVENANCE } = await import('../core/persist/canonical-op.js');
  const backend = await createKernelBackend(dbPath);
  const kernel = new TrellisKernel({
    backend,
    agentId: `agent:${process.env.USER ?? 'unknown'}`,
    provenance: PROVENANCE.cli,
  });
  kernel.boot();
  attachStandardMiddleware(kernel);

  for (const pkg of result.packages) {
    for (const schema of pkg.schemas) {
      try {
        kernel.createOntology({
          '@id': schema['@id'],
          '@type': 'trellis:Schema',
          version: schema.version,
          tier: 'user',
          label: schema['@id'].split(':')[1] || schema['@id'],
          fields: [],
        });
      } catch (err: any) {
        if (err.message?.includes('already exists')) {
          console.log(chalk.dim(`  Schema ${schema['@id']} already registered, skipping`));
        } else {
          throw err;
        }
      }
    }
  }

  console.log(chalk.green(`✓ Installed ${name} from @trellis.computer/${scope}`));
  for (const pkg of result.packages) {
    const label = pkg.name.includes('/') ? pkg.name : `${scope}/${pkg.name}`;
    console.log(`  ${chalk.dim('•')} ${label} ${chalk.cyan(pkg.version)} ${chalk.dim(pkg.content.slice(0, 16))}`);
  }
}

function handleList(type: string | undefined, rootPath: string): void {
  const lockfile = readLockfile(rootPath);

  if (!lockfile || Object.keys(lockfile.resolved).length === 0) {
    console.log(chalk.dim('No packages installed.'));
    return;
  }

  const entries = type
    ? Object.entries(lockfile.resolved).filter(([name]) => name.includes(typeToScope(type as RegistryType) || type))
    : Object.entries(lockfile.resolved);

  if (entries.length === 0) {
    console.log(chalk.dim(`No packages found${type ? ` for type '${type}'` : ''}.`));
    return;
  }

  console.log(chalk.bold(`Installed Packages — ${entries.length}`));
  console.log();

  for (const [name, pkg] of entries) {
    const schemas = Object.keys(pkg.schemas).join(', ') || chalk.dim('(none)');
    console.log(`  ${chalk.cyan(name)}`);
    console.log(`    ${chalk.dim('Version:')}  ${pkg.version}`);
    console.log(`    ${chalk.dim('Content:')}  ${chalk.dim(pkg.content.slice(0, 20))}…`);
    console.log(`    ${chalk.dim('Schemas:')}  ${schemas}`);
    console.log();
  }
}

function handleRemove(type: string, name: string, rootPath: string, force: boolean): void {
  const lockfile = readLockfile(rootPath);

  if (!lockfile) {
    console.log(chalk.dim('No lockfile found. Nothing to remove.'));
    return;
  }

  const scope = typeToScope(type as RegistryType);
  const pkgName = `@trellis.computer/${scope}`;

  if (!lockfile.resolved[pkgName]) {
    console.log(chalk.yellow(`Package ${pkgName} is not installed.`));
    return;
  }

  const dependents = findDependents(lockfile, pkgName);
  if (dependents.length > 0 && !force) {
    console.error(chalk.red(`Cannot remove ${pkgName}: still required by:`));
    for (const dep of dependents) {
      console.error(`  ${chalk.red('•')} ${dep}`);
    }
    console.error(chalk.dim('Use --force to override.'));
    process.exit(1);
  }

  removeFromLockfile(lockfile, pkgName);
  writeLockfile(rootPath, lockfile);
  console.log(chalk.green(`✓ Removed ${pkgName}`));
}

export function registerRegistryCommands(program: Command): void {
  const registry = program
    .command('registry')
    .description('Manage registry packages from @trellis.computer');

  registry
    .command('add')
    .description('Install a package from the @trellis.computer registry')
    .argument('<type>', `Type: ${REGISTRY_TYPES.join(', ')}`)
    .argument('<name>', 'Package name')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (type: string, name: string, opts: any) => {
      try {
        await handleAdd(type, name, resolveRepoRoot(opts.path));
      } catch (err) {
        handleCliError(err);
      }
    });

  registry
    .command('list')
    .description('List installed packages from the lockfile')
    .argument('[type]', `Optional filter: ${REGISTRY_TYPES.join(', ')}`)
    .option('-p, --path <path>', 'Repository path', '.')
    .action((type: string | undefined, opts: any) => {
      try {
        handleList(type, resolveRepoRoot(opts.path));
      } catch (err) {
        handleCliError(err);
      }
    });

  registry
    .command('remove')
    .description('Uninstall a package')
    .argument('<type>', `Type: ${REGISTRY_TYPES.join(', ')}`)
    .argument('<name>', 'Package name')
    .option('-p, --path <path>', 'Repository path', '.')
    .option('-f, --force', 'Force removal even if dependents exist', false)
    .action((type: string, name: string, opts: any) => {
      try {
        handleRemove(type, name, resolveRepoRoot(opts.path), opts.force);
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command('add')
    .description('Install a package from the @trellis.computer registry')
    .argument('<type>', `Type: ${REGISTRY_TYPES.join(', ')}`)
    .argument('<name>', 'Package name')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (type: string, name: string, opts: any) => {
      try {
        await handleAdd(type, name, resolveRepoRoot(opts.path));
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command('list')
    .description('List installed registry packages')
    .argument('[type]', `Optional type filter: ${REGISTRY_TYPES.join(', ')}`)
    .option('-p, --path <path>', 'Repository path', '.')
    .action((type: string | undefined, opts: any) => {
      try {
        handleList(type, resolveRepoRoot(opts.path));
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command('remove')
    .description('Uninstall a registry package')
    .argument('<type>', `Type: ${REGISTRY_TYPES.join(', ')}`)
    .argument('<name>', 'Package name')
    .option('-p, --path <path>', 'Repository path', '.')
    .option('-f, --force', 'Force removal', false)
    .action((type: string, name: string, opts: any) => {
      try {
        handleRemove(type, name, resolveRepoRoot(opts.path), opts.force);
      } catch (err) {
        handleCliError(err);
      }
    });
}
