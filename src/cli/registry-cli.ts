import { Command } from 'commander';
import chalk from 'chalk';
import { resolveRepoRoot } from './repo-path.js';
import { handleCliError } from './errors.js';
import { RegistryClient } from '../registry/client.js';
import { readLockfile, writeLockfile, createLockfile, removeFromLockfile, findDependents } from '../registry/lockfile.js';
import { resolvePackage } from '../registry/resolver.js';
import { TrellisKernel } from '../core/kernel/trellis-kernel.js';
import type { Atom } from '../core/store/eav-store.js';
import { join } from 'path';

const REGISTRY_TYPES = ['workflow', 'agent', 'adapter', 'projection', 'theme', 'affordance', 'ui', 'ontology'] as const;
type RegistryType = typeof REGISTRY_TYPES[number];

function typeToScope(type: RegistryType): string {
  const map: Record<RegistryType, string> = {
    workflow: 'workflows',
    agent: 'agents',
    ontology: 'ontology',
    adapter: 'adapters',
    projection: 'projections',
    theme: 'theme',
    affordance: 'affordances',
    ui: 'ui',
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

  const pkgName = result.packages[0]?.name || `@trellis.computer/${scope}/${name}`;
  result.lockfile.root.depends[pkgName] = 'latest';
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

    if (pkg.agent) {
      const agentId = `agent:${name}`;
      const attrs: Record<string, Atom> = {};
      if (pkg.agent.model) attrs.model = pkg.agent.model;
      if (pkg.agent.provider) attrs.provider = pkg.agent.provider;
      if (pkg.agent.systemPrompt) attrs.systemPrompt = pkg.agent.systemPrompt;
      if (pkg.agent.capabilities) attrs.capabilities = JSON.stringify(pkg.agent.capabilities);
      if (pkg.agent.temperature !== undefined) attrs.temperature = pkg.agent.temperature;
      if (pkg.agent.maxTokens !== undefined) attrs.maxTokens = pkg.agent.maxTokens;
      attrs.name = name;
      attrs.status = 'active';

      const existing = kernel.getEntity(agentId);
      if (existing) {
        console.log(chalk.dim(`  Agent ${agentId} already exists, updating`));
        await kernel.updateEntity(agentId, attrs);
      } else {
        await kernel.createEntity(agentId, 'core:Agent', attrs);
        console.log(chalk.dim(`  Created agent entity ${agentId}`));
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

async function handleRemove(type: string, name: string, rootPath: string, force: boolean): Promise<void> {
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

  // Unregister schemas from the graph
  const pkg = lockfile.resolved[pkgName];
  const schemaIds = Object.keys(pkg.schemas);
  if (schemaIds.length > 0) {
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

    for (const schemaId of schemaIds) {
      try {
        kernel.deleteOntology(schemaId);
        console.log(chalk.dim(`  Unregistered schema ${schemaId}`));
      } catch (err: any) {
        console.log(chalk.yellow(`  Could not unregister ${schemaId}: ${err.message}`));
      }
    }
  }

  removeFromLockfile(lockfile, pkgName);
  writeLockfile(rootPath, lockfile);
  console.log(chalk.green(`✓ Removed ${pkgName}`));
}

function parseDepRef(depRef: string): { type: string; name: string } | null {
  if (!depRef.startsWith('@trellis.computer/')) return null;
  const rest = depRef.slice('@trellis.computer/'.length);
  const slashIdx = rest.indexOf('/');
  if (slashIdx === -1) return null;
  return { type: rest.slice(0, slashIdx), name: rest.slice(slashIdx + 1) };
}

async function handleUpdate(
  scope: string | undefined,
  locked: boolean,
  rootPath: string,
): Promise<void> {
  const oldLockfile = readLockfile(rootPath);

  if (!oldLockfile) {
    if (locked) {
      console.log(chalk.dim('Lockfile required. Nothing to update.'));
      return;
    }
    console.log(chalk.dim('No lockfile found. Nothing to update.'));
    return;
  }

  const directDeps = Object.entries(oldLockfile.root.depends);
  if (directDeps.length === 0) {
    console.log(chalk.dim('No direct dependencies declared. Nothing to update.'));
    return;
  }

  const client = new RegistryClient();
  const newLockfile = createLockfile();
  newLockfile.root.depends = { ...oldLockfile.root.depends };

  const changed: Array<{ depRef: string; oldVer: string; newVer: string }> = [];
  const added: Array<{ depRef: string; version: string }> = [];

  for (const [depRef, constraint] of directDeps) {
    const parsed = parseDepRef(depRef);

    if (!parsed) {
      if (oldLockfile.resolved[depRef]) {
        newLockfile.resolved[depRef] = oldLockfile.resolved[depRef];
      }
      continue;
    }

    if (scope) {
      const scopePlural = typeToScope(scope as RegistryType);
      if (parsed.type !== scopePlural) {
        if (oldLockfile.resolved[depRef]) {
          newLockfile.resolved[depRef] = oldLockfile.resolved[depRef];
        }
        continue;
      }
    }

    process.stdout.write(`  ${chalk.dim(depRef)} (${constraint})... `);

    const result = await resolvePackage(client, newLockfile, parsed.type, parsed.name, constraint);

    if (!result.success) {
      console.log(chalk.red('FAILED'));
      console.error(chalk.red(`  ✗ Failed to update ${depRef}:`));
      for (const c of result.conflicts) {
        console.error(`    ${c.message}`);
      }
      process.exit(1);
    }

    console.log(chalk.green('done'));

    for (const pkg of result.packages) {
      const old = oldLockfile.resolved[pkg.name];
      if (old && old.version !== pkg.version) {
        changed.push({ depRef: pkg.name, oldVer: old.version, newVer: pkg.version });
      } else if (!old) {
        added.push({ depRef: pkg.name, version: pkg.version });
      }
    }
  }

  const removed: string[] = [];
  for (const name of Object.keys(oldLockfile.resolved)) {
    if (!newLockfile.resolved[name]) {
      removed.push(name);
    }
  }

  writeLockfile(rootPath, newLockfile);

  console.log();
  console.log(chalk.green('✓ Lockfile updated'));
  console.log();

  if (changed.length > 0) {
    console.log(chalk.bold('  Version changes:'));
    for (const c of changed) {
      console.log(`    ${chalk.cyan(c.depRef)} ${chalk.yellow(c.oldVer)} → ${chalk.green(c.newVer)}`);
    }
    console.log();
  }

  if (added.length > 0) {
    console.log(chalk.bold('  New packages:'));
    for (const a of added) {
      console.log(`    ${chalk.green('+')} ${chalk.cyan(a.depRef)} ${chalk.dim(a.version)}`);
    }
    console.log();
  }

  if (removed.length > 0) {
    console.log(chalk.bold('  Removed packages:'));
    for (const r of removed) {
      console.log(`    ${chalk.red('-')} ${chalk.dim(r)}`);
    }
    console.log();
  }

  if (changed.length === 0 && added.length === 0 && removed.length === 0) {
    console.log(chalk.dim('  No changes. All packages up to date.'));
  }
}

async function handleMigrate(
  scope: string | undefined,
  dryRun: boolean,
  rootPath: string,
): Promise<void> {
  const lockfile = readLockfile(rootPath);
  if (!lockfile) {
    console.log(chalk.dim('No lockfile found. Nothing to migrate.'));
    return;
  }

  const schemasInLockfile = Object.values(lockfile.resolved).flatMap(p =>
    Object.keys(p.schemas),
  );
  if (schemasInLockfile.length === 0) {
    console.log(chalk.dim('No schemas in lockfile. Nothing to migrate.'));
    return;
  }

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

  const { createMigrateHandler } = await import('../registry/migrate.js');
  const client = new RegistryClient();

  console.log(chalk.dim('Analyzing schema versions...'));

  const report = createMigrateHandler(rootPath, kernel, client, scope, dryRun);

  if (report.errors.length > 0) {
    console.log(chalk.red(`\n  Errors (${report.errors.length}):`));
    for (const err of report.errors) {
      console.log(`    ${chalk.red('✗')} ${err}`);
    }
  }

  if (report.incompatible.length > 0) {
    console.log(chalk.yellow(`\n  Incompatible (${report.incompatible.length}) — skipped:`));
    for (const id of report.incompatible) {
      console.log(`    ${chalk.yellow('⚠')} ${id}`);
    }
  }

  if (report.skipped.length > 0) {
    console.log(chalk.dim(`\n  Up to date (${report.skipped.length}):`));
    for (const id of report.skipped) {
      console.log(`    ${chalk.dim('•')} ${id}`);
    }
  }

  if (report.migrated.length > 0) {
    const action = dryRun ? chalk.dim('Would migrate') : chalk.green('Migrated');
    console.log(chalk.green(`\n  ${dryRun ? 'Would migrate' : 'Migrated'} (${report.migrated.length}):`));
    for (const id of report.migrated) {
      console.log(`    ${chalk.green(dryRun ? '~' : '✓')} ${id}`);
    }
  }

  if (report.migrated.length === 0 && report.errors.length === 0 && report.incompatible.length === 0) {
    console.log(chalk.dim('\n  All schemas up to date.'));
  }

  if (dryRun && report.migrated.length > 0) {
    console.log(chalk.dim(`\n  Dry run — no changes applied. Run without --dry-run to migrate.`));
  }

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
    .command('update')
    .description('Re-resolve and update all registry packages')
    .argument('[scope]', `Optional scope filter: ${REGISTRY_TYPES.join(', ')}`)
    .option('-p, --path <path>', 'Repository path', '.')
    .option('--locked', 'Only update if lockfile exists (CI-safe)', false)
    .action(async (scope: string | undefined, opts: any) => {
      try {
        await handleUpdate(scope, opts.locked, resolveRepoRoot(opts.path));
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
    .action(async (type: string, name: string, opts: any) => {
      try {
        await handleRemove(type, name, resolveRepoRoot(opts.path), opts.force);
      } catch (err) {
        handleCliError(err);
      }
    });

  registry
    .command('migrate')
    .description('Apply schema version migrations from lockfile')
    .argument('[scope]', `Optional scope filter: ${REGISTRY_TYPES.join(', ')}`)
    .option('-p, --path <path>', 'Repository path', '.')
    .option('--dry-run', 'Preview migrations without applying', false)
    .action(async (scope: string | undefined, opts: any) => {
      try {
        await handleMigrate(scope, opts.dryRun, resolveRepoRoot(opts.path));
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
    .action(async (type: string, name: string, opts: any) => {
      try {
        await handleRemove(type, name, resolveRepoRoot(opts.path), opts.force);
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command('update')
    .description('Re-resolve and update all registry packages')
    .argument('[scope]', `Optional scope filter: ${REGISTRY_TYPES.join(', ')}`)
    .option('-p, --path <path>', 'Repository path', '.')
    .option('--locked', 'Only update if lockfile exists (CI-safe)', false)
    .action(async (scope: string | undefined, opts: any) => {
      try {
        await handleUpdate(scope, opts.locked, resolveRepoRoot(opts.path));
      } catch (err) {
        handleCliError(err);
      }
    });
}
