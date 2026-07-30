import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { resolveRepoRoot } from './repo-path.js';
import { handleCliError } from './errors.js';
import { TrellisKernel } from '../core/kernel/trellis-kernel.js';

function formatEntity(entity: { id: string; facts: { a: string; v: unknown }[] }): Record<string, unknown> {
  const obj: Record<string, unknown> = { id: entity.id };
  for (const f of entity.facts) obj[f.a] = f.v;
  return obj;
}

function printEntityTable(items: Record<string, unknown>[], cols: { key: string; label: string }[]): void {
  if (items.length === 0) {
    console.log(chalk.dim('No items found.'));
    return;
  }
  for (const item of items) {
    const parts = cols.map((c) => {
      const v = item[c.key];
      if (c.key === 'active' || c.key === 'status') {
        return v === true || v === 'active' ? chalk.green(String(v)) : chalk.red(String(v));
      }
      return String(v ?? '—');
    });
    console.log(`  ${parts.join('  ')}`);
  }
}

export function registerWorkflowCommands(program: Command): void {
  const workflow = program
    .command('workflow')
    .description('Manage and execute Trellis workflows');

  workflow
    .command('list')
    .description('List all workflows')
    .option('--active', 'Show only active workflows')
    .option('--json', 'Output as JSON')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (opts) => {
      try {
        const rootPath = resolveRepoRoot(opts.path);
        const dbPath = join(rootPath, '.trellis', 'kernel.db');
        const { createKernelBackend } = await import('../core/persist/factory.js');
        const { attachStandardMiddleware } = await import('../core/kernel/boot-middleware.js');
        const { PROVENANCE } = await import('../core/persist/canonical-op.js');
        const backend = await createKernelBackend(dbPath);
        const kernel = new TrellisKernel({ backend, agentId: 'cli', provenance: PROVENANCE.cli });
        kernel.boot();
        attachStandardMiddleware(kernel);

        const entities = kernel.listEntities('Workflow');
        let items = entities.map(formatEntity);
        if (opts.active) items = items.filter((e) => e.active === true || e.active === 'true');

        if (opts.json) {
          console.log(JSON.stringify(items, null, 2));
          return;
        }

        if (items.length === 0) {
          console.log(chalk.dim('No workflows found.'));
          return;
        }

        console.log(chalk.bold(`\nWorkflows (${items.length})\n`));
        console.log(chalk.dim('  ID                     Name                   Steps    Active'));
        for (const item of items) {
          const steps = Array.isArray(item.steps) ? item.steps.length : '—';
          const active = item.active === true || item.active === 'true' ? chalk.green('✓') : chalk.red('✗');
          const id = String(item.id).padEnd(22).slice(0, 22);
          const name = String(item.name ?? '—').padEnd(22).slice(0, 22);
          console.log(`  ${chalk.cyan(id)} ${name} ${String(steps).padEnd(8)} ${active}`);
        }
        console.log();

        kernel.close();
      } catch (err) {
        handleCliError(err);
      }
    });

  workflow
    .command('show <id>')
    .description('Show workflow details')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (id, opts) => {
      try {
        const rootPath = resolveRepoRoot(opts.path);
        const dbPath = join(rootPath, '.trellis', 'kernel.db');
        const { createKernelBackend } = await import('../core/persist/factory.js');
        const { attachStandardMiddleware } = await import('../core/kernel/boot-middleware.js');
        const { PROVENANCE } = await import('../core/persist/canonical-op.js');
        const backend = await createKernelBackend(dbPath);
        const kernel = new TrellisKernel({ backend, agentId: 'cli', provenance: PROVENANCE.cli });
        kernel.boot();
        attachStandardMiddleware(kernel);

        const entity = kernel.getEntity(id);
        if (!entity) {
          console.error(chalk.red(`Workflow not found: ${id}`));
          process.exit(1);
        }

        const e = formatEntity(entity);

        console.log(chalk.bold(`\n${chalk.cyan(e.id as string)}: ${e.name ?? 'Untitled'}\n`));
        if (e.description) console.log(`  ${chalk.dim('Description:')}  ${e.description}`);
        console.log(`  ${chalk.dim('Active:')}       ${e.active === true || e.active === 'true' ? chalk.green('✓') : chalk.red('✗')}`);
        if (e.trigger) console.log(`  ${chalk.dim('Trigger:')}      ${e.trigger}`);

        const steps = Array.isArray(e.steps) ? e.steps : [];
        if (steps.length > 0) {
          console.log(chalk.bold(`\n  Steps (${steps.length})\n`));
          for (const step of steps) {
            console.log(`    ${chalk.cyan('•')} ${step}`);
          }
        }

        console.log();
        kernel.close();
      } catch (err) {
        handleCliError(err);
      }
    });

  workflow
    .command('run <id>')
    .description('Run a workflow using the DAG scheduler')
    .option('--input <text>', 'Input text for the workflow')
    .option('--agent <id>', 'Agent ID to execute steps', 'agent:default')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (id, opts) => {
      try {
        const rootPath = resolveRepoRoot(opts.path);
        const dbPath = join(rootPath, '.trellis', 'kernel.db');
        const { createKernelBackend } = await import('../core/persist/factory.js');
        const { attachStandardMiddleware } = await import('../core/kernel/boot-middleware.js');
        const { PROVENANCE } = await import('../core/persist/canonical-op.js');
        const backend = await createKernelBackend(dbPath);
        const kernel = new TrellisKernel({ backend, agentId: 'cli', provenance: PROVENANCE.cli });
        kernel.boot();
        attachStandardMiddleware(kernel);

        const entity = kernel.getEntity(id);
        if (!entity) {
          console.error(chalk.red(`Workflow not found: ${id}`));
          process.exit(1);
        }

        const e = formatEntity(entity);
        const stepsList = Array.isArray(e.steps) ? e.steps as string[] : [];
        if (stepsList.length === 0) {
          console.error(chalk.red(`Workflow ${id} has no steps.`));
          process.exit(1);
        }

        const dagSteps = stepsList.map((stepName, i) => ({
          id: `${id}/step-${i}`,
          agentId: opts.agent,
          input: opts.input ? `${stepName}: ${opts.input}` : stepName,
          dependsOn: i > 0 ? [`${id}/step-${i - 1}`] : undefined,
        }));

        const { DAGScheduler, WorkerPool, AgentHarness } = await import('../core/agents/index.js');
        const harness = new AgentHarness(kernel);
        const pool = new WorkerPool(harness, { concurrency: 1 });
        const scheduler = new DAGScheduler(pool, { failOnError: false });

        console.log(chalk.dim(`Running workflow ${id} (${dagSteps.length} steps)...\n`));
        const runId = await scheduler.run({ id, name: String(e.name ?? id), steps: dagSteps });

        const run = scheduler.getRun(runId);
        if (run) {
          for (const step of run.steps) {
            const status = step.status === 'completed' ? chalk.green('✓') : step.status === 'failed' ? chalk.red('✗') : chalk.yellow('…');
            console.log(`  ${status} ${step.step.id}`);
          }
          const finalStatus = run.status === 'completed' ? chalk.green('completed') : chalk.red(run.status);
          console.log(chalk.bold(`\n  Result: ${finalStatus}`));
        }

        scheduler.dispose();
        kernel.close();
      } catch (err) {
        handleCliError(err);
      }
    });
}
