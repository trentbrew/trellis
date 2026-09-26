/**
 * Agent harness bootstrap — typed tools + optional LLM wiring.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { BetterSqliteKernelBackend } from '../../src/core/persist/better-sqlite-backend.js';
import {
  configureAgentHarness,
  ensureReaderAgent,
  isLlmConfigured,
  DEFAULT_READER_AGENT_ID,
} from '../../src/core/agents/bootstrap.js';
import type { LLMProvider } from '../../src/llm/types.js';

class StubLlm implements LLMProvider {
  id = 'stub';
  name = 'Stub';
  async complete() {
    return {
      id: '1',
      model: 'stub',
      choices: [{ message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
    };
  }
  async *stream() {
    yield { id: '1', choices: [{ delta: {}, finish_reason: 'stop' }] };
  }
}

describe('configureAgentHarness', () => {
  let tmpDir: string;
  let kernel: TrellisKernel;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'trellis-bootstrap-'));
    kernel = new TrellisKernel({
      backend: new BetterSqliteKernelBackend(join(tmpDir, 'kernel.db')),
      agentId: 'test-agent',
    });
    kernel.boot();
  });

  afterEach(() => {
    kernel.close();
    try {
      rmSync(tmpDir, { recursive: true });
    } catch {}
  });

  it('registers typed graph tools by default', async () => {
    const { harness, tools } = await configureAgentHarness({ kernel, llm: false });
    expect(tools).not.toBeNull();
    expect(harness.listTools().map((t) => t.id)).toEqual(
      expect.arrayContaining(['list_entities', 'get_entity']),
    );
  });

  it('accepts an injected LLM provider', async () => {
    const { harness } = await configureAgentHarness({
      kernel,
      llm: new StubLlm(),
    });
    await harness.createAgent({
      id: 'agent:stub',
      name: 'Stub',
      status: 'active',
      tools: [],
      maxTurns: 1,
    });
    const runId = await harness.runAgentTask('agent:stub', 'ping');
    expect(harness.getRun(runId)?.status).toBe('completed');
  });

  it('ensureReaderAgent creates default reader once', async () => {
    const { harness, tools } = await configureAgentHarness({ kernel, llm: false });
    const id = await ensureReaderAgent(harness, tools!);
    expect(id).toBe(DEFAULT_READER_AGENT_ID);
    expect(harness.getAgent(id)?.tools).toEqual(
      expect.arrayContaining(['list_entities', 'get_entity']),
    );
    const again = await ensureReaderAgent(harness, tools!);
    expect(again).toBe(id);
    expect(harness.listAgents()).toHaveLength(1);
  });

  it('isLlmConfigured reflects env', () => {
    const prev = process.env.TRELLIS_LLM_MODEL;
    delete process.env.TRELLIS_LLM_MODEL;
    delete process.env.TRELLIS_LLM_BACKEND;
    delete process.env.DEVTOOLS_AI_PROVIDER;
    expect(isLlmConfigured()).toBe(false);
    process.env.TRELLIS_LLM_MODEL = 'test-model';
    expect(isLlmConfigured()).toBe(true);
    if (prev) process.env.TRELLIS_LLM_MODEL = prev;
    else delete process.env.TRELLIS_LLM_MODEL;
  });
});
