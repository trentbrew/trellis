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

export function registerPipelineCommands(program: Command): void {
  const pipeline = program
    .command('pipeline')
    .description('Manage and execute Trellis pipelines');

  pipeline
    .command('list')
    .description('List all pipelines')
    .option('--active', 'Show only active pipelines')
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

        const entities = kernel.listEntities('Pipeline');
        let items = entities.map(formatEntity);
        if (opts.active) items = items.filter((e) => e.active === true || e.active === 'true');

        if (opts.json) {
          console.log(JSON.stringify(items, null, 2));
          return;
        }

        if (items.length === 0) {
          console.log(chalk.dim('No pipelines found.'));
          return;
        }

        console.log(chalk.bold(`\nPipelines (${items.length})\n`));
        console.log(chalk.dim('  ID                     Name                   Active'));
        for (const item of items) {
          const active = item.active === true || item.active === 'true' ? chalk.green('✓') : chalk.red('✗');
          const id = String(item.id).padEnd(22).slice(0, 22);
          const name = String(item.name ?? '—').padEnd(22).slice(0, 22);
          console.log(`  ${chalk.cyan(id)} ${name} ${active}`);
        }
        console.log();

        kernel.close();
      } catch (err) {
        handleCliError(err);
      }
    });

  pipeline
    .command('show <id>')
    .description('Show pipeline details including phases')
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
          console.error(chalk.red(`Pipeline not found: ${id}`));
          process.exit(1);
        }

        const e = formatEntity(entity);

        console.log(chalk.bold(`\n${chalk.cyan(e.id as string)}: ${e.name ?? 'Untitled'}\n`));
        if (e.description) console.log(`  ${chalk.dim('Description:')}  ${e.description}`);
        console.log(`  ${chalk.dim('Active:')}       ${e.active === true || e.active === 'true' ? chalk.green('✓') : chalk.red('✗')}`);
        if (e.trigger) console.log(`  ${chalk.dim('Trigger:')}      ${e.trigger}`);

        const phases = kernel.listEntities('PipelinePhase');
        const linkedPhases = phases
          .map(formatEntity)
          .filter((p) => {
            const linked = kernel.getStore().getLinksByEntity(id);
            return linked.some((l) => l.a === 'phases' && l.e2 === p.id);
          })
          .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));

        if (linkedPhases.length > 0) {
          console.log(chalk.bold(`\n  Phases (${linkedPhases.length})\n`));
          for (const phase of linkedPhases) {
            const order = String(phase.order ?? '—').padStart(2);
            const role = String(phase.agentRole ?? '—').padEnd(14);
            const wfName = phase.workflow ? String(phase.workflow) : '—';
            console.log(`    ${chalk.cyan(`${order}.`)} ${role}${phase.name ?? ''}`);
            if (phase.description) console.log(`       ${chalk.dim(phase.description as string)}`);
          }
        }

        console.log();
        kernel.close();
      } catch (err) {
        handleCliError(err);
      }
    });

  pipeline
    .command('start <id>')
    .description('Start a pipeline — executes all phases in order')
    .option('--input <text>', 'Input text for the pipeline')
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
          console.error(chalk.red(`Pipeline not found: ${id}`));
          process.exit(1);
        }

        const phases = kernel.listEntities('PipelinePhase')
          .map(formatEntity)
          .filter((p) => {
            const linked = kernel.getStore().getLinksByEntity(id);
            return linked.some((l) => l.a === 'phases' && l.e2 === p.id);
          })
          .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));

        if (phases.length === 0) {
          console.error(chalk.red(`Pipeline ${id} has no phases.`));
          process.exit(1);
        }

        const { DAGScheduler, WorkerPool, AgentHarness } = await import('../core/agents/index.js');
        const harness = new AgentHarness(kernel);
        const pool = new WorkerPool(harness, { concurrency: 1 });
        const scheduler = new DAGScheduler(pool, { failOnError: false });

        console.log(chalk.bold(`\nPipeline: ${entity.facts.find((f) => f.a === 'name')?.v ?? id}\n`));

        for (const phase of phases) {
          const phaseName = String(phase.name ?? phase.agentRole ?? 'unknown');
          const wfId = phase.workflow ? String(phase.workflow) : null;

          console.log(chalk.cyan(`  Phase ${phase.order}: ${phaseName} (${phase.agentRole})`));

          if (!wfId) {
            console.log(`    ${chalk.yellow('  —')} No workflow linked`);
            continue;
          }

          const wfEntity = kernel.getEntity(wfId);
          if (!wfEntity) {
            console.log(`    ${chalk.yellow('  —')} Workflow ${wfId} not found`);
            continue;
          }

          const wf = formatEntity(wfEntity);
          const stepsList = Array.isArray(wf.steps) ? wf.steps as string[] : [];

          if (stepsList.length === 0) {
            console.log(`    ${chalk.yellow('  —')} Workflow has no steps`);
            continue;
          }

          const dagSteps = stepsList.map((stepName, i) => ({
            id: `${wfId}/step-${i}`,
            agentId: String(phase.agentRole ?? 'agent:default'),
            input: opts.input ? `${stepName}: ${opts.input}` : stepName,
            dependsOn: i > 0 ? [`${wfId}/step-${i - 1}`] : undefined,
          }));

          const runId = await scheduler.run({ id: wfId, name: String(wf.name ?? wfId), steps: dagSteps });
          const run = scheduler.getRun(runId);
          if (run) {
            for (const step of run.steps) {
              const icon = step.status === 'completed' ? chalk.green('✓') : step.status === 'failed' ? chalk.red('✗') : chalk.yellow('…');
              console.log(`    ${icon} ${step.step.id}`);
            }
            if (run.status === 'completed') {
              console.log(`    ${chalk.green('  ✓ Phase complete')}`);
            } else {
              console.log(`    ${chalk.red(`  ✗ ${run.status}`)}`);
              break;
            }
          }
        }

        console.log(chalk.bold('\n  Pipeline complete.\n'));
        scheduler.dispose();
        kernel.close();
      } catch (err) {
        handleCliError(err);
      }
    });
}
