/**
 * Agent Execution MCP — WorkerPool and DAGScheduler management tools.
 *
 * Mounted alongside the room MCP server. Maintains per-tenant WorkerPool
 * and DAGScheduler singletons for persistent queue state across tool calls.
 *
 * @module trellis/mcp
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { WorkerPool, DAGScheduler } from '../core/agents/index.js';
import type { TenantPool } from '../server/tenancy.js';

// ---------------------------------------------------------------------------
// Per-tenant singletons
// ---------------------------------------------------------------------------

const pools = new Map<string, WorkerPool>();
const schedulers = new Map<string, DAGScheduler>();

function getPool(tenantId: string, pool: TenantPool): WorkerPool {
  let wp = pools.get(tenantId);
  if (!wp) {
    wp = new WorkerPool(
      () => pool.preload(tenantId),
      undefined,
      { concurrency: 2, pollIntervalMs: 500 },
    );
    wp.start();
    pools.set(tenantId, wp);
  }
  return wp;
}

function getScheduler(tenantId: string, pool: TenantPool): DAGScheduler {
  let sc = schedulers.get(tenantId);
  if (!sc) {
    sc = new DAGScheduler(getPool(tenantId, pool));
    schedulers.set(tenantId, sc);
  }
  return sc;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function text(content: string) {
  return { content: [{ type: 'text' as const, text: content }] };
}

function jsonText(data: unknown) {
  return text(JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const agentIdSchema = z.string().describe('Agent ID (e.g. agent:code-reviewer)');
const inputSchema = z.string().describe('Task input text');
const runIdSchema = z.string().describe('Run ID (e.g. run:agent:1234567890)');
const tenantIdSchema = z.string().optional().describe('Tenant ID for multi-tenant support');

const dagStepSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  input: z.string(),
  dependsOn: z.array(z.string()).optional(),
});

const dagWorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  steps: z.array(dagStepSchema),
});

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

/** Reset all per-tenant pools and schedulers (for testing). */
export function resetAgentExecState(): void {
  for (const sc of schedulers.values()) sc.dispose();
  for (const wp of pools.values()) wp.stop();
  pools.clear();
  schedulers.clear();
}

export function registerAgentExecTools(server: McpServer, tenantPool: TenantPool): void {

  // -----------------------------------------------------------------------
  // WorkerPool tools
  // -----------------------------------------------------------------------

  server.registerTool(
    'worker_pool_status',
    {
      description: 'Get WorkerPool status (active, queued, concurrency).',
      inputSchema: { tenantId: tenantIdSchema },
    },
    async ({ tenantId }) => {
      try {
        const tid = tenantId ?? 'default';
        const wp = getPool(tid, tenantPool);
        return jsonText(wp.getStatus());
      } catch (err) {
        return text(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    'worker_pool_enqueue',
    {
      description: 'Enqueue an agent run for execution.',
      inputSchema: {
        agentId: agentIdSchema,
        input: inputSchema,
        tenantId: tenantIdSchema,
      },
    },
    async ({ agentId, input, tenantId }) => {
      try {
        const tid = tenantId ?? 'default';
        const wp = getPool(tid, tenantPool);
        const runId = await wp.enqueue(agentId, input);
        return text(runId);
      } catch (err) {
        return text(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    'worker_pool_cancel',
    {
      description: 'Cancel a queued or active run.',
      inputSchema: {
        runId: runIdSchema,
        tenantId: tenantIdSchema,
      },
    },
    async ({ runId, tenantId }) => {
      try {
        const tid = tenantId ?? 'default';
        const wp = getPool(tid, tenantPool);
        await wp.cancel(runId);
        return text(`Cancelled: ${runId}`);
      } catch (err) {
        return text(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    'worker_pool_pause',
    {
      description: 'Pause an active run.',
      inputSchema: {
        runId: runIdSchema,
        tenantId: tenantIdSchema,
      },
    },
    async ({ runId, tenantId }) => {
      try {
        const tid = tenantId ?? 'default';
        const wp = getPool(tid, tenantPool);
        await wp.pause(runId);
        return text(`Paused: ${runId}`);
      } catch (err) {
        return text(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    'worker_pool_resume',
    {
      description: 'Resume a paused run.',
      inputSchema: {
        runId: runIdSchema,
        tenantId: tenantIdSchema,
      },
    },
    async ({ runId, tenantId }) => {
      try {
        const tid = tenantId ?? 'default';
        const wp = getPool(tid, tenantPool);
        await wp.resume(runId);
        return text(`Resumed: ${runId}`);
      } catch (err) {
        return text(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    'worker_pool_list',
    {
      description: 'List queued and active tasks.',
      inputSchema: { tenantId: tenantIdSchema },
    },
    async ({ tenantId }) => {
      try {
        const tid = tenantId ?? 'default';
        const wp = getPool(tid, tenantPool);
        return jsonText({
          queued: wp.getQueue(),
          active: wp.getActiveJobs(),
        });
      } catch (err) {
        return text(err instanceof Error ? err.message : String(err));
      }
    },
  );

  // -----------------------------------------------------------------------
  // DAG Scheduler tools
  // -----------------------------------------------------------------------

  server.registerTool(
    'dag_workflow_run',
    {
      description: 'Run a multi-step DAG workflow. Steps execute when their dependencies are met.',
      inputSchema: {
        workflow: dagWorkflowSchema,
        tenantId: tenantIdSchema,
      },
    },
    async ({ workflow, tenantId }) => {
      try {
        const tid = tenantId ?? 'default';
        const sc = getScheduler(tid, tenantPool);
        const runId = await sc.run(workflow);
        return text(runId);
      } catch (err) {
        return text(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    'dag_workflow_status',
    {
      description: 'Get DAG workflow run status and step details.',
      inputSchema: {
        runId: z.string().describe('Workflow run ID'),
        tenantId: tenantIdSchema,
      },
    },
    async ({ runId, tenantId }) => {
      try {
        const tid = tenantId ?? 'default';
        const sc = schedulers.get(tid);
        if (!sc) return text(`No scheduler for tenant "${tid}"`);
        const run = sc.getRun(runId);
        if (!run) return text(`Workflow run not found: ${runId}`);
        return jsonText(run);
      } catch (err) {
        return text(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    'dag_workflow_list',
    {
      description: 'List all DAG workflow runs.',
      inputSchema: { tenantId: tenantIdSchema },
    },
    async ({ tenantId }) => {
      try {
        const tid = tenantId ?? 'default';
        const sc = schedulers.get(tid);
        if (!sc) return jsonText([]);
        return jsonText(sc.listRuns());
      } catch (err) {
        return text(err instanceof Error ? err.message : String(err));
      }
    },
  );

}
