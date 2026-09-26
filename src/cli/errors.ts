import chalk from 'chalk';

/**
 * Print a CLI failure and exit. Used by parseAsync and action wrappers so
 * async rejections are never silent.
 */
export function handleCliError(err: unknown): never {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code?: string }).code);
    if (
      code === 'commander.helpDisplayed' ||
      code === 'commander.version' ||
      code === 'commander.help' ||
      code === 'commander.versionDisplayed'
    ) {
      process.exit(0);
    }
  }

  const message = err instanceof Error ? err.message : String(err);
  console.error(chalk.red(`✗ ${message}`));

  if (process.env.TRELLIS_DEBUG && err instanceof Error && err.stack) {
    console.error(chalk.dim(err.stack));
  }

  process.exit(1);
}

/** Enrich agent run failures with actionable hints. */
export function enrichAgentRunError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes('llmprovider') || lower.includes('no llm')) {
    return new Error(
      `${message}\nHint: pass --backend and --model, or set TRELLIS_LLM_BACKEND / TRELLIS_LLM_MODEL.`,
    );
  }

  if (
    lower.includes('econnrefused') ||
    lower.includes('ollama') ||
    lower.includes('fetch failed') ||
    lower.includes('network')
  ) {
    return new Error(
      `${message}\nHint: ensure the LLM backend is running (e.g. \`ollama serve\`) and the model is pulled.`,
    );
  }

  return err instanceof Error ? err : new Error(message);
}

/** Enrich kernel open failures for agent commands. */
export function enrichAgentKernelError(err: unknown, dbPath: string): Error {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes('better-sqlite3') || lower.includes('bun:sqlite')) {
    return new Error(
      `Failed to open kernel database at ${dbPath}: ${message}`,
    );
  }

  if (lower.includes('enoent') || lower.includes('no such file')) {
    return new Error(
      `Kernel database not found at ${dbPath}. Run \`trellis init\` in this repository first.`,
    );
  }

  return new Error(`Failed to open kernel database at ${dbPath}: ${message}`);
}
