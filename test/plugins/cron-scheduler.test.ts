/**
 * CronScheduler unit tests (ADR 0019 / TRL-77).
 */
import { describe, expect, it } from 'vitest';
import { CronScheduler } from '../../src/plugins/cron/scheduler.js';
import type {
  CronJobRecord,
  CronRunRecord,
  CronStore,
} from '../../src/plugins/cron/types.js';
import { nextRunAtFromInterval } from '../../src/plugins/cron/cron-expr.js';

function createMemoryStore(seed: CronJobRecord[] = []): CronStore & {
  jobs: Map<string, CronJobRecord>;
  runs: CronRunRecord[];
  entities: Map<string, Record<string, unknown>>;
} {
  const jobs = new Map(seed.map((j) => [j.id, { ...j }]));
  const runs: CronRunRecord[] = [];
  const entities = new Map<string, Record<string, unknown>>();

  return {
    jobs,
    runs,
    entities,
    async listJobs() {
      return [...jobs.values()].map((j) => ({ ...j }));
    },
    async updateJob(id, attrs) {
      const cur = jobs.get(id);
      if (!cur) throw new Error(`missing job ${id}`);
      const next = { ...cur, ...attrs };
      for (const key of ['leaseOwner', 'leaseExpiresAt', 'lastError'] as const) {
        if (key in attrs && attrs[key] === undefined) {
          delete next[key];
        }
      }
      jobs.set(id, next);
    },
    async createRun(attrs) {
      runs.push({ ...attrs });
      return `cronrun:${runs.length}`;
    },
    async getEntity(id) {
      return entities.get(id) ?? null;
    },
    async updateEntity(id, attrs) {
      const cur = entities.get(id) ?? { id };
      entities.set(id, { ...cur, ...attrs });
    },
  };
}

describe('CronScheduler', () => {
  it('runs due enabled jobs and advances nextRunAt', async () => {
    let now = 1_000_000;
    const store = createMemoryStore([
      {
        id: 'cron:a',
        name: 'a',
        enabled: true,
        intervalMs: 2000,
        handler: 'builtin:ping',
        nextRunAt: new Date(now - 1000).toISOString(),
      },
    ]);
    const scheduler = new CronScheduler({
      store,
      now: () => now,
      ownerId: 'test',
    });

    await scheduler.tick();

    expect(store.runs).toHaveLength(1);
    expect(store.runs[0].status).toBe('ok');
    const job = store.jobs.get('cron:a')!;
    expect(job.lastRunAt).toBeTruthy();
    expect(Date.parse(job.nextRunAt!)).toBe(now + 2000);
    expect(job.leaseOwner).toBeUndefined();
  });

  it('ignores disabled jobs', async () => {
    const now = 1_000_000;
    const store = createMemoryStore([
      {
        id: 'cron:off',
        name: 'off',
        enabled: false,
        intervalMs: 1000,
        handler: 'builtin:ping',
        nextRunAt: new Date(now - 1).toISOString(),
      },
    ]);
    const scheduler = new CronScheduler({ store, now: () => now });
    await scheduler.tick();
    expect(store.runs).toHaveLength(0);
  });

  it('skips when lease is live (no double-fire)', async () => {
    const now = 1_000_000;
    const store = createMemoryStore([
      {
        id: 'cron:leased',
        name: 'leased',
        enabled: true,
        intervalMs: 1000,
        handler: 'builtin:ping',
        nextRunAt: new Date(now - 1).toISOString(),
        leaseOwner: 'other',
        leaseExpiresAt: new Date(now + 10_000).toISOString(),
      },
    ]);
    const scheduler = new CronScheduler({ store, now: () => now });
    await scheduler.tick();
    expect(store.runs).toHaveLength(1);
    expect(store.runs[0].status).toBe('skipped');
  });

  it('does not run jobs that are not yet due', async () => {
    const now = 1_000_000;
    const store = createMemoryStore([
      {
        id: 'cron:future',
        name: 'future',
        enabled: true,
        intervalMs: 5000,
        handler: 'builtin:ping',
        nextRunAt: nextRunAtFromInterval(5000, now),
      },
    ]);
    const scheduler = new CronScheduler({ store, now: () => now });
    await scheduler.tick();
    expect(store.runs).toHaveLength(0);
  });

  it('builtin:counter increments target entity', async () => {
    const now = 1_000_000;
    const store = createMemoryStore([
      {
        id: 'cron:c',
        name: 'c',
        enabled: true,
        intervalMs: 1000,
        handler: 'builtin:counter',
        payload: { targetId: 'entity:counter' },
        nextRunAt: new Date(now - 1).toISOString(),
      },
    ]);
    store.entities.set('entity:counter', { id: 'entity:counter', count: 3 });
    const scheduler = new CronScheduler({ store, now: () => now });
    await scheduler.tick();
    expect(store.runs[0].status).toBe('ok');
    expect(store.entities.get('entity:counter')?.count).toBe(4);
  });

  it('records error runs for unknown handlers', async () => {
    const now = 1_000_000;
    const store = createMemoryStore([
      {
        id: 'cron:bad',
        name: 'bad',
        enabled: true,
        intervalMs: 1000,
        handler: 'missing:handler',
        nextRunAt: new Date(now - 1).toISOString(),
      },
    ]);
    const scheduler = new CronScheduler({ store, now: () => now });
    await scheduler.tick();
    expect(store.runs[0].status).toBe('error');
    expect(store.jobs.get('cron:bad')!.lastError).toMatch(/unknown handler/);
  });
});
