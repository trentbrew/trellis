/**
 * AgentHarness: turn limits, completion settings, and malformed tool arguments.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { BetterSqliteKernelBackend } from '../../src/core/persist/better-sqlite-backend.js';
import { AgentHarness } from '../../src/core/agents/harness.js';
import type {
  LLMProvider,
  LLMCompletionOptions,
  LLMCompletionResponse,
} from '../../src/llm/types.js';

/** Calls `echo` with the given raw arguments until `stopAfter` tool turns, then answers. */
class ScriptedLLM implements LLMProvider {
  id = 'mock-scripted';
  name = 'Mock';
  calls: LLMCompletionOptions[] = [];
  private turn = 0;

  constructor(
    private rawArguments: string,
    private stopAfter = Infinity,
  ) {}

  async complete(_messages: unknown, options?: LLMCompletionOptions): Promise<LLMCompletionResponse> {
    this.calls.push(options ?? {});
    this.turn++;
    if (this.turn <= this.stopAfter) {
      return {
        id: `r${this.turn}`,
        model: 'mock',
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: `c${this.turn}`,
                  type: 'function',
                  function: { name: 'tool:echo', arguments: this.rawArguments },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      };
    }
    return {
      id: 'final',
      model: 'mock',
      choices: [{ message: { role: 'assistant', content: 'done' }, finish_reason: 'stop' }],
    };
  }

  async *stream() {
    yield { id: '1', choices: [{ delta: {}, finish_reason: 'stop' }] };
  }
}

describe('AgentHarness limits and tool arguments', () => {
  let tmpDir: string;
  let kernel: TrellisKernel;
  let echoInputs: unknown[];

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'trellis-harness-limits-'));
    kernel = new TrellisKernel({
      backend: new BetterSqliteKernelBackend(join(tmpDir, 'kernel.db')),
      agentId: 'test-agent',
    });
    kernel.boot();
    echoInputs = [];
  });

  afterEach(() => {
    kernel.close();
    try {
      rmSync(tmpDir, { recursive: true });
    } catch {}
  });

  async function setup(llm: LLMProvider, def: { maxTurns?: number; maxTokens?: number; temperature?: number }) {
    const harness = new AgentHarness(kernel, { llmProvider: llm });
    await harness.registerTool(
      { name: 'echo', description: 'Echo input' },
      async (input) => {
        echoInputs.push(input);
        return { success: true, output: 'ok' };
      },
    );
    await harness.createAgent({
      id: 'agent:limits',
      name: 'Limits',
      status: 'active',
      tools: ['tool:echo'],
      ...def,
    });
    return harness;
  }

  it('persists maxTurns, maxTokens, and temperature', async () => {
    const harness = await setup(new ScriptedLLM('{}', 0), {
      maxTurns: 3,
      maxTokens: 256,
      temperature: 0.2,
    });
    const agent = harness.getAgent('agent:limits');
    expect(agent?.maxTurns).toBe(3);
    expect(agent?.maxTokens).toBe(256);
    expect(agent?.temperature).toBe(0.2);
  });

  it('stops at maxTurns instead of the old fixed default', async () => {
    const llm = new ScriptedLLM('{}');
    const harness = await setup(llm, { maxTurns: 2 });
    await expect(harness.runAgentTask('agent:limits', 'loop')).rejects.toThrow(
      'exceeded maximum turns (2)',
    );
    expect(llm.calls).toHaveLength(2);
  });

  it('passes maxTokens to the provider as max_tokens', async () => {
    const llm = new ScriptedLLM('{}', 0);
    const harness = await setup(llm, { maxTokens: 64 });
    await harness.runAgentTask('agent:limits', 'hi');
    expect(llm.calls[0]?.max_tokens).toBe(64);
  });

  it('treats malformed tool arguments as {} instead of failing the run', async () => {
    const harness = await setup(new ScriptedLLM('{not json', 1), { maxTurns: 3 });
    const runId = await harness.runAgentTask('agent:limits', 'go');
    expect(harness.getRun(runId)?.status).toBe('completed');
    expect(echoInputs).toEqual([{}]);
  });
});
