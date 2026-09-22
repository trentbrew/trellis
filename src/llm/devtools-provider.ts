/**
 * Bridge trellis-node LLMProvider to DevTools `ai` createLLMProvider (TRL-10).
 *
 * DevTools lives at Projects/DevTools/ai in the Campus monorepo. Tests inject
 * `importCreateLLMProvider`; production callers may set DEVTOOLS_AI_PROVIDER
 * to an absolute module path.
 */

import type {
  LLMCompletionChunk,
  LLMCompletionOptions,
  LLMCompletionResponse,
  LLMMessage,
  LLMProvider,
} from './types.js';

export type DevtoolsBackend = 'ollama' | 'turbo' | 'cloud' | 'custom';

export type DevtoolsLLMProviderOptions = {
  backend?: DevtoolsBackend;
  model?: string;
  /** Default 0 for eval reproducibility */
  temperature?: number;
  /** Test hook — bypass dynamic import of DevTools ai */
  importCreateLLMProvider?: () => Promise<{
    createLLMProvider: (opts: DevtoolsLLMProviderOptions) => LLMProvider;
  }>;
};

const DEFAULT_DEVTOOLS_AI = new URL(
  '../../../../DevTools/ai/src/llm/provider.ts',
  import.meta.url,
);

async function loadDevtoolsFactory(
  options: DevtoolsLLMProviderOptions,
): Promise<(opts: DevtoolsLLMProviderOptions) => LLMProvider> {
  if (options.importCreateLLMProvider) {
    const mod = await options.importCreateLLMProvider();
    return mod.createLLMProvider;
  }
  const spec = process.env.DEVTOOLS_AI_PROVIDER ?? DEFAULT_DEVTOOLS_AI.href;
  const mod = await import(/* @vite-ignore */ spec);
  return mod.createLLMProvider;
}

/**
 * Returns a trellis-node LLMProvider backed by DevTools ai (AI SDK + backends).
 */
export async function createDevtoolsLLMProvider(
  options: DevtoolsLLMProviderOptions = {},
): Promise<LLMProvider> {
  const factory = await loadDevtoolsFactory(options);
  const provider = factory(options);
  return {
    id: provider.id ?? 'devtools-ai',
    name: provider.name ?? 'DevTools AI',
    complete: (messages: LLMMessage[], opts?: LLMCompletionOptions) =>
      provider.complete(messages, opts),
    stream: (messages: LLMMessage[], opts?: LLMCompletionOptions) =>
      provider.stream(messages, opts) as AsyncIterable<LLMCompletionChunk>,
  };
}
