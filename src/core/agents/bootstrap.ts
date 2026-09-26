/**
 * Agent harness bootstrap — composition root for kernel + typed tools + LLM.
 *
 * @module trellis/core/agents
 */

import type { TrellisKernel } from '../kernel/trellis-kernel.js';
import {
  createDevtoolsLLMProvider,
  type DevtoolsBackend,
  type DevtoolsLLMProviderOptions,
} from '../../llm/devtools-provider.js';
import type { LLMProvider } from '../../llm/types.js';
import { AgentHarness } from './harness.js';
import {
  registerTypedGraphTools,
  type TypedGraphToolIds,
} from './typed-graph-tools.js';
import type { AgentDef, AgentHarnessConfig } from './types.js';
import {
  formatProfileContextText,
  getProfile,
  shouldInjectProfileAtSession,
} from '../../scaffold/profile.js';

export const DEFAULT_READER_AGENT_ID = 'agent:reader';

export type ConfiguredHarness = {
  kernel: TrellisKernel;
  harness: AgentHarness;
  tools: TypedGraphToolIds | null;
};

export type ConfigureAgentHarnessOptions = {
  kernel: TrellisKernel;
  /** Register list_entities / get_entity (default true). */
  typedGraphTools?: boolean;
  /**
   * LLM wiring:
   * - omitted → resolve from env when configured
   * - `false` → no LLM (simulate / tool-only harness)
   * - `LLMProvider` → use directly
   * - `DevtoolsLLMProviderOptions` → create via DevTools bridge
   */
  llm?: LLMProvider | DevtoolsLLMProviderOptions | false;
  harness?: Omit<AgentHarnessConfig, 'llmProvider'>;
};

/** True when env provides enough to build a DevTools-backed LLM provider. */
export function isLlmConfigured(): boolean {
  return Boolean(
    process.env.DEVTOOLS_AI_PROVIDER ||
      process.env.TRELLIS_LLM_BACKEND ||
      process.env.TRELLIS_LLM_MODEL,
  );
}

/** Resolve DevTools LLM options from env (defaults: ollama + gemma4:latest). */
export function resolveLlmOptionsFromEnv(): DevtoolsLLMProviderOptions | undefined {
  if (!isLlmConfigured()) return undefined;
  const backend = (process.env.TRELLIS_LLM_BACKEND ?? 'ollama') as DevtoolsBackend;
  return {
    backend,
    model: process.env.TRELLIS_LLM_MODEL ?? 'gemma4:latest',
    temperature: 0,
  };
}

async function resolveLlmProvider(
  llm: ConfigureAgentHarnessOptions['llm'],
): Promise<LLMProvider | undefined> {
  if (llm === false) return undefined;
  if (llm && typeof llm === 'object' && 'complete' in llm) {
    return llm;
  }
  const opts =
    llm === undefined
      ? resolveLlmOptionsFromEnv()
      : (llm as DevtoolsLLMProviderOptions);
  if (!opts) return undefined;
  return createDevtoolsLLMProvider(opts);
}

/**
 * Wire an existing kernel into a harness with optional typed tools + LLM.
 */
export async function configureAgentHarness(
  options: ConfigureAgentHarnessOptions,
): Promise<ConfiguredHarness> {
  const typedGraphTools = options.typedGraphTools ?? true;
  const llmProvider = await resolveLlmProvider(options.llm);

  const harness = new AgentHarness(options.kernel, {
    ...options.harness,
    llmProvider,
  });

  let tools: TypedGraphToolIds | null = null;
  if (typedGraphTools) {
    tools = await registerTypedGraphTools(harness, options.kernel);
  }

  return { kernel: options.kernel, harness, tools };
}

/**
 * Ensure the default graph reader agent exists (typed tools only).
 */
export async function ensureReaderAgent(
  harness: AgentHarness,
  toolIds: TypedGraphToolIds,
  overrides?: Partial<
    Omit<AgentDef, 'id' | 'capabilities' | 'tools'> & {
      id?: string;
      tools?: string[];
    }
  >,
): Promise<string> {
  const id = overrides?.id ?? DEFAULT_READER_AGENT_ID;
  if (harness.getAgent(id)) return id;

  const profileBlock = shouldInjectProfileAtSession()
    ? formatProfileContextText(getProfile())
    : '';
  const profilePrefix = profileBlock
    ? `User profile:\n${profileBlock}\n\n`
    : '';
  const defaultPrompt =
    'You read the Trellis graph using list_entities and get_entity only. Do not write query languages or SQL.';

  await harness.createAgent({
    id,
    name: overrides?.name ?? 'Reader',
    role: overrides?.role ?? 'executor',
    status: overrides?.status ?? 'active',
    description:
      overrides?.description ??
      'Reads the Trellis graph via list_entities and get_entity.',
    systemPrompt:
      overrides?.systemPrompt ?? `${profilePrefix}${defaultPrompt}`,
    model: overrides?.model ?? process.env.TRELLIS_LLM_MODEL ?? 'gemma4:latest',
    maxTurns: overrides?.maxTurns ?? 10,
    tools: overrides?.tools ?? [toolIds.listEntities, toolIds.getEntity],
    ...overrides,
  });

  return id;
}
