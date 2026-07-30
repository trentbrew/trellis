/**
 * Tests for agent execution MCP tools — WorkerPool + DAGScheduler via MCP.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerAgentExecTools, resetAgentExecState } from '../../src/mcp/agent-exec.js';
import { TenantPool } from '../../src/server/tenancy.js';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let tmpDir: string;
let pool: TenantPool;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'trellis-agent-exec-test-'));
  pool = new TenantPool(tmpDir, { backend: { backend: 'sqljs' } });
  await pool.preload();
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

let testCounter = 0;

beforeEach(() => {
  resetAgentExecState();
  testCounter++;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createLinkedPair() {
  const server = new McpServer({ name: 'test-agent-exec', version: '0.1.0' });
  registerAgentExecTools(server, pool);

  const client = new Client({ name: 'test-client', version: '0.1.0' });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(ct), server.connect(st)]);

  return { client };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgentExec MCP Tools', () => {
  it('should list all 9 tools', async () => {
    const { client } = await createLinkedPair();
    const result = await client.listTools();
    const names = result.tools.map((t: any) => t.name).sort();
    expect(names).toEqual([
      'dag_workflow_list',
      'dag_workflow_run',
      'dag_workflow_status',
      'worker_pool_cancel',
      'worker_pool_enqueue',
      'worker_pool_list',
      'worker_pool_pause',
      'worker_pool_resume',
      'worker_pool_status',
    ]);
    await client.close();
  });

  it('should get pool status', async () => {
    const { client } = await createLinkedPair();
    const result = await client.callTool({
      name: 'worker_pool_status',
      arguments: {},
    });
    const text = result.content?.[0]?.text ?? '';
    const parsed = JSON.parse(text);
    expect(parsed).toMatchObject({ active: 0, queued: 0 });
    await client.close();
  });

  it('should enqueue a task', async () => {
    const { client } = await createLinkedPair();
    const result = await client.callTool({
      name: 'worker_pool_enqueue',
      arguments: { agentId: 'agent:test', input: 'hello', tenantId: 'test-a' },
    });
    expect(result.content?.[0]?.text).toContain('run:');
    await client.close();
  });

  it('should enqueue and list tasks', async () => {
    const { client } = await createLinkedPair();
    await client.callTool({
      name: 'worker_pool_enqueue',
      arguments: { agentId: 'agent:a', input: 'first', tenantId: 'test-b' },
    });
    await client.callTool({
      name: 'worker_pool_enqueue',
      arguments: { agentId: 'agent:b', input: 'second', tenantId: 'test-b' },
    });
    const result = await client.callTool({
      name: 'worker_pool_list',
      arguments: { tenantId: 'test-b' },
    });
    const parsed = JSON.parse(result.content?.[0]?.text ?? '{}');
    expect(parsed.queued).toHaveLength(2);
    await client.close();
  });

  it('should cancel a queued task', async () => {
    const { client } = await createLinkedPair();
    const enq = await client.callTool({
      name: 'worker_pool_enqueue',
      arguments: { agentId: 'agent:a', input: 'hello', tenantId: 'test-c' },
    });
    const runId = enq.content?.[0]?.text;

    const cancelResult = await client.callTool({
      name: 'worker_pool_cancel',
      arguments: { runId, tenantId: 'test-c' },
    });
    expect(cancelResult.content?.[0]?.text).toContain('Cancelled');

    const listResult = await client.callTool({
      name: 'worker_pool_list',
      arguments: { tenantId: 'test-c' },
    });
    const parsed = JSON.parse(listResult.content?.[0]?.text ?? '{}');
    expect(parsed.queued).toHaveLength(0);
    await client.close();
  });

  it('should list DAG workflows as empty initially', async () => {
    const { client } = await createLinkedPair();
    const result = await client.callTool({
      name: 'dag_workflow_list',
      arguments: {},
    });
    const parsed = JSON.parse(result.content?.[0]?.text ?? '');
    expect(parsed).toEqual([]);
    await client.close();
  });

  it('should run a DAG workflow', async () => {
    const { client } = await createLinkedPair();
    const result = await client.callTool({
      name: 'dag_workflow_run',
      arguments: {
        workflow: {
          id: 'wf:test',
          name: 'Test',
          steps: [{ id: 'step-1', agentId: 'agent:a', input: 'do it' }],
        },
      },
    });
    expect(result.content?.[0]?.text).toContain('wf:');
    await client.close();
  });

  it('should report run not found for unknown DAG', async () => {
    const { client } = await createLinkedPair();
    const result = await client.callTool({
      name: 'dag_workflow_status',
      arguments: { runId: 'nonexistent' },
    });
    expect(result.content?.[0]?.text).toContain('No scheduler');
    await client.close();
  });
});
