/**
 * AgentHarness.runAgentTask with typed graph tools + LLM provider.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { BetterSqliteKernelBackend } from '../../src/core/persist/better-sqlite-backend.js';
import { AgentHarness } from '../../src/core/agents/harness.js';
import { registerTypedGraphTools } from '../../src/core/agents/typed-graph-tools.js';
import type {
  LLMProvider,
  LLMCompletionResponse,
} from '../../src/llm/types.js';

class TypedGraphMockLLM implements LLMProvider {
  id = 'mock-typed-graph';
  name = 'Mock';
  private turn = 0;

  async complete(): Promise<LLMCompletionResponse> {
    this.turn++;
    if (this.turn === 1) {
      return {
        id: 'r1',
        model: 'mock',
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'c1',
                  type: 'function',
                  function: {
                    name: 'list_entities',
                    arguments: JSON.stringify({
                      type: 'Project',
                      filter: { status: 'active' },
                    }),
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      };
    }
    return {
      id: 'r2',
      model: 'mock',
      choices: [
        {
          message: { role: 'assistant', content: 'Found one active project: Alpha' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    };
  }

  async *stream() {
    yield { id: '1', choices: [{ delta: {}, finish_reason: 'stop' }] };
  }
}

describe('AgentHarness LLM + typed graph tools', () => {
  let tmpDir: string;
  let kernel: TrellisKernel;
  let harness: AgentHarness;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'trellis-harness-llm-'));
    kernel = new TrellisKernel({
      backend: new BetterSqliteKernelBackend(join(tmpDir, 'kernel.db')),
      agentId: 'test-agent',
    });
    kernel.boot();
    harness = new AgentHarness(kernel, {
      llmProvider: new TypedGraphMockLLM(),
    });
    await kernel.createEntity('proj:alpha', 'Project', { name: 'Alpha', status: 'active' });
    const toolIds = await registerTypedGraphTools(harness, kernel);
    await harness.createAgent({
      id: 'agent:reader',
      name: 'Reader',
      status: 'active',
      systemPrompt: 'Use list_entities and get_entity only.',
      tools: [toolIds.listEntities, toolIds.getEntity],
      maxTokens: 5,
    });
  });

  afterEach(() => {
    kernel.close();
    try {
      rmSync(tmpDir, { recursive: true });
    } catch {}
  });

  it('runAgentTask completes after typed tool round-trip', async () => {
    const runId = await harness.runAgentTask(
      'agent:reader',
      'Which projects are active?',
    );
    const run = harness.getRun(runId);
    expect(run?.status).toBe('completed');
    expect(run?.output).toContain('Alpha');
    expect(run?.decisions.some((d) => d.toolName === 'list_entities')).toBe(true);
  });
});
