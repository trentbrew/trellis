import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  enrichAgentKernelError,
  enrichAgentRunError,
  handleCliError,
} from './errors.js';
import { resolveRepoRoot } from './repo-path.js';
import { TrellisKernel } from '../core/kernel/trellis-kernel.js';
import { PROVENANCE } from '../core/persist/canonical-op.js';
import { createKernelBackend } from '../core/persist/factory.js';
import { attachStandardMiddleware } from '../core/kernel/boot-middleware.js';
import {
  configureAgentHarness,
  DEFAULT_READER_AGENT_ID,
  ensureReaderAgent,
} from '../core/agents/bootstrap.js';
import type { ConfigureAgentHarnessOptions } from '../core/agents/bootstrap.js';

export function parseAgentRunArgs(
  args: string[],
  useDefault: boolean,
): { agentId?: string; prompt: string } {
  if (useDefault) {
    const prompt = args.join(' ').trim();
    if (!prompt) {
      throw new Error(
        'Prompt required. Example: trellis agent run --default who are you',
      );
    }
    return { prompt };
  }

  if (args.length < 2) {
    throw new Error(
      `Agent id and prompt required, or pass --default for ${DEFAULT_READER_AGENT_ID}. ` +
        'Example: trellis agent run agent:reader list active projects',
    );
  }

  const agentId = args[0];
  const prompt = args.slice(1).join(' ').trim();
  if (!prompt) {
    throw new Error(
      'Prompt required after agent id. Example: trellis agent run agent:reader list active projects',
    );
  }

  return { agentId, prompt };
}

async function openConfiguredHarness(
  repoPath: string,
  configure: Omit<ConfigureAgentHarnessOptions, 'kernel'>,
) {
  const rootPath = resolveRepoRoot(repoPath);
  const trellisDir = join(rootPath, '.trellis');
  if (!existsSync(trellisDir)) {
    throw new Error(
      `No .trellis/ directory at ${rootPath}. Run \`trellis init\` first.`,
    );
  }

  const dbPath = join(trellisDir, 'kernel.db');
  try {
    const backend = await createKernelBackend(dbPath);
    const kernel = new TrellisKernel({
      backend,
      agentId: 'cli',
      provenance: PROVENANCE.cli,
    });
    kernel.boot();
    attachStandardMiddleware(kernel);
    const configured = await configureAgentHarness({ kernel, ...configure });
    return { ...configured, close: () => kernel.close(), dbPath };
  } catch (err) {
    throw enrichAgentKernelError(err, dbPath);
  }
}

export function registerAgentCommands(program: Command): void {
  const agent = program
    .command('agent')
    .description('Run and manage Trellis kernel agents');

  agent
    .command('list')
    .description('List agents in the kernel graph')
    .option('-p, --path <path>', 'Repository path', '.')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const { harness, close } = await openConfiguredHarness(opts.path, {
          llm: false,
        });
        const agents = harness.listAgents();
        if (opts.json) {
          console.log(JSON.stringify(agents, null, 2));
        } else if (agents.length === 0) {
          console.log(chalk.dim('No agents found. Run `trellis agent ensure-default`.'));
        } else {
          console.log(chalk.bold(`\nAgents (${agents.length})\n`));
          for (const a of agents) {
            const tools = a.tools.length ? a.tools.join(', ') : '—';
            console.log(
              `  ${chalk.cyan(a.id)}  ${a.name}  ${chalk.dim(a.status)}  tools: ${tools}`,
            );
          }
        }
        close();
      } catch (err) {
        handleCliError(err);
      }
    });

  agent
    .command('ensure-default')
    .description('Create the default graph reader agent (agent:reader)')
    .option('-p, --path <path>', 'Repository path', '.')
    .option('--json', 'Output agent id as JSON')
    .action(async (opts) => {
      try {
        const { harness, tools, close } = await openConfiguredHarness(opts.path, {
          llm: false,
        });
        if (!tools) {
          throw new Error('Typed graph tools are required for the default reader agent.');
        }
        const id = await ensureReaderAgent(harness, tools);
        if (opts.json) {
          console.log(JSON.stringify({ id }, null, 2));
        } else {
          console.log(chalk.green(`Default reader agent ready: ${id}`));
        }
        close();
      } catch (err) {
        handleCliError(err);
      }
    });

  agent
    .command('run')
    .description(
      'Run an agent task against the kernel graph. ' +
        'Multi-word prompts need no quotes: trellis agent run --default who are you',
    )
    .argument(
      '[args...]',
      'With --default: prompt words. Otherwise: agentId then prompt words.',
    )
    .option('-p, --path <path>', 'Repository path', '.')
    .option('--backend <backend>', 'LLM backend (ollama, turbo, cloud)', 'ollama')
    .option('--model <model>', 'LLM model id', process.env.TRELLIS_LLM_MODEL ?? 'gemma4:latest')
    .option('--default', `Use ${DEFAULT_READER_AGENT_ID} (creates if missing)`)
    .option('--dry-run', 'Resolve agent and prompt without calling the LLM')
    .option('--json', 'Output run record as JSON')
    .addHelpText(
      'after',
      `
Examples:
  $ trellis agent run --default who are you
  $ trellis agent run agent:reader list active projects
  $ trellis agent run --default hello world --dry-run`,
    )
    .action(async (args: string[], opts) => {
      try {
        const { agentId: parsedId, prompt } = parseAgentRunArgs(args, Boolean(opts.default));

        const llmOpts = opts.dryRun
          ? false
          : {
              backend: opts.backend as 'ollama' | 'turbo' | 'cloud',
              model: opts.model,
              temperature: 0,
            };

        const { harness, tools, close } = await openConfiguredHarness(opts.path, {
          llm: llmOpts,
        });

        let resolvedId = parsedId;
        if (opts.default) {
          if (!tools) throw new Error('Typed graph tools required for --default.');
          resolvedId = await ensureReaderAgent(harness, tools);
        } else if (!resolvedId) {
          throw new Error(
            `Agent id required, or pass --default for ${DEFAULT_READER_AGENT_ID}.`,
          );
        } else if (!harness.getAgent(resolvedId)) {
          throw new Error(
            `Agent "${resolvedId}" not found. Run \`trellis agent ensure-default\` or pass --default.`,
          );
        }

        if (opts.dryRun) {
          const payload = { agentId: resolvedId, prompt };
          if (opts.json) {
            console.log(JSON.stringify(payload, null, 2));
          } else {
            console.log(JSON.stringify(payload));
          }
          close();
          return;
        }

        let runId: string;
        try {
          runId = await harness.runAgentTask(resolvedId!, prompt);
        } catch (err) {
          throw enrichAgentRunError(err);
        }
        const run = harness.getRun(runId);

        if (opts.json) {
          console.log(JSON.stringify(run, null, 2));
        } else {
          console.log(chalk.bold(`\nRun ${runId} — ${run?.status ?? 'unknown'}\n`));
          if (run?.output) console.log(run.output);
          if (run?.decisions?.length) {
            console.log(chalk.dim(`\n${run.decisions.length} tool decision(s) recorded.`));
          }
        }
        close();
      } catch (err) {
        handleCliError(err);
      }
    });
}
