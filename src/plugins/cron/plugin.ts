/**
 * Kernel-backed CronStore + plugin factory.
 * @module trellis/plugins/cron/plugin
 */

import type { PluginDef, PluginContext } from '../../core/plugins/types.js';
import { PROVENANCE } from '../../core/persist/canonical-op.js';
import type { TrellisKernel } from '../../core/kernel/trellis-kernel.js';
import type { TenantPool } from '../../server/tenancy.js';
import { DEFAULT_TENANT } from '../../server/tenancy.js';
import { cronOntology } from './ontology.js';
import { CronScheduler } from './scheduler.js';
import type { CronJobRecord, CronRunRecord, CronStore } from './types.js';
import { nextRunAtFromInterval } from './cron-expr.js';

/** ADR 0021: everything the scheduler writes is machine-originated cron work. */
const CRON_CTX = { provenance: PROVENANCE.cron };

function factsToAttrs(
  entity: { id: string; type: string; facts: Array<{ a: string; v: unknown }> },
): Record<string, unknown> {
  const obj: Record<string, unknown> = { id: entity.id, type: entity.type };
  for (const f of entity.facts) {
    if (f.a !== 'type') obj[f.a] = f.v;
  }
  return obj;
}

function toJobRecord(raw: Record<string, unknown>): CronJobRecord {
  return {
    id: String(raw.id),
    name: String(raw.name ?? raw.id),
    enabled: raw.enabled !== false,
    intervalMs: Number(raw.intervalMs ?? 0),
    handler: String(raw.handler ?? ''),
    payload: raw.payload,
    nextRunAt: raw.nextRunAt != null ? String(raw.nextRunAt) : undefined,
    lastRunAt: raw.lastRunAt != null ? String(raw.lastRunAt) : undefined,
    leaseOwner: raw.leaseOwner != null ? String(raw.leaseOwner) : undefined,
    leaseExpiresAt:
      raw.leaseExpiresAt != null ? String(raw.leaseExpiresAt) : undefined,
    lastError: raw.lastError != null ? String(raw.lastError) : undefined,
    timezone: raw.timezone != null ? String(raw.timezone) : undefined,
  };
}

/** Build a CronStore over a TrellisKernel. */
export function createKernelCronStore(kernel: TrellisKernel): CronStore {
  return {
    async listJobs() {
      return kernel.listEntities('CronJob').map((e) => toJobRecord(factsToAttrs(e)));
    },
    async updateJob(id, attrs) {
      const patch: Record<string, unknown> = { ...attrs };
      // Clear fields by setting empty string / false where undefined means clear
      for (const key of ['leaseOwner', 'leaseExpiresAt', 'lastError'] as const) {
        if (key in attrs && attrs[key] === undefined) {
          patch[key] = '';
        }
      }
      delete (patch as { id?: string }).id;
      await kernel.updateEntity(id, patch as any, CRON_CTX);
    },
    async createRun(attrs: CronRunRecord) {
      const id = `cronrun:${crypto.randomUUID()}`;
      await kernel.createEntity(id, 'CronRun', attrs as any, undefined, CRON_CTX);
      return id;
    },
    async getEntity(id) {
      const e = kernel.getEntity(id);
      return e ? factsToAttrs(e) : null;
    },
    async updateEntity(id, attrs) {
      await kernel.updateEntity(id, attrs as any, CRON_CTX);
    },
  };
}

/** CronStore over the default tenant in a TenantPool. */
export function createPoolCronStore(pool: TenantPool): CronStore {
  return createKernelCronStore(pool.get(DEFAULT_TENANT));
}

export interface CreateCronPluginOptions {
  tickMs?: number;
  leaseMs?: number;
  ownerId?: string;
  /** When false, onLoad does not start the timer (tests). Default true. */
  autoStart?: boolean;
}

export function createCronPlugin(
  kernel: TrellisKernel,
  opts: CreateCronPluginOptions = {},
): PluginDef & { scheduler: CronScheduler } {
  const store = createKernelCronStore(kernel);
  const scheduler = new CronScheduler({
    store,
    tickMs: opts.tickMs,
    leaseMs: opts.leaseMs,
    ownerId: opts.ownerId,
  });

  return {
    id: 'trellis:cron',
    name: 'Cron',
    version: '1.0.0',
    description: 'Graph-native scheduled jobs (ADR 0019)',
    ontologies: [cronOntology],
    scheduler,

    onLoad: async (ctx: PluginContext) => {
      ctx.log('Cron plugin loaded');
      if (opts.autoStart !== false) {
        scheduler.start();
      }
    },

    onUnload: async (ctx: PluginContext) => {
      scheduler.stop();
      ctx.log('Cron plugin unloaded');
    },
  };
}

/**
 * Attach a CronScheduler to a running server pool.
 * Returns null when TRELLIS_CRON=0.
 */
export function attachCronToPool(
  pool: TenantPool,
  opts: CreateCronPluginOptions = {},
): CronScheduler | null {
  if (process.env.TRELLIS_CRON === '0') {
    return null;
  }
  const store = createPoolCronStore(pool);
  const scheduler = new CronScheduler({
    store,
    tickMs: opts.tickMs,
    leaseMs: opts.leaseMs,
    ownerId: opts.ownerId ?? 'cron:db-serve',
  });
  scheduler.start();
  return scheduler;
}

/** Ensure a demo job exists (idempotent). */
export async function ensureDemoPingJob(store: CronStore): Promise<void> {
  const jobs = await store.listJobs();
  if (jobs.some((j) => j.id === 'cron:demo-ping')) return;
  // Store API is update/create via kernel — callers with kernel should create.
  void jobs;
}

export async function seedDemoPingJob(kernel: TrellisKernel): Promise<string> {
  const existing = kernel.getEntity('cron:demo-ping');
  if (existing) return 'cron:demo-ping';
  const now = Date.now();
  await kernel.createEntity(
    'cron:demo-ping',
    'CronJob',
    {
      name: 'demo-ping',
      enabled: true,
      intervalMs: 5000,
      handler: 'builtin:ping',
      nextRunAt: nextRunAtFromInterval(5000, now),
    } as any,
    undefined,
    CRON_CTX,
  );
  return 'cron:demo-ping';
}
