/**
 * CronScheduler — tick loop over durable CronJob entities.
 * @module trellis/plugins/cron/scheduler
 */

import {
  assertIntervalMs,
  isDue,
  leaseIsLive,
  nextRunAtFromInterval,
} from './cron-expr.js';
import { createBuiltinHandlers, type CronHandler } from './handlers.js';
import type { CronJobRecord, CronStatus, CronStore } from './types.js';

const DEFAULT_TICK_MS = 1000;
const DEFAULT_LEASE_MS = 30_000;

export interface CronSchedulerOptions {
  store: CronStore;
  tickMs?: number;
  leaseMs?: number;
  ownerId?: string;
  /** Injected clock for tests (epoch ms). */
  now?: () => number;
}

export class CronScheduler {
  private readonly store: CronStore;
  private readonly tickMs: number;
  private readonly leaseMs: number;
  private readonly ownerId: string;
  private readonly now: () => number;
  private readonly handlers = new Map<string, CronHandler>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticking = false;
  private jobCount = 0;

  constructor(opts: CronSchedulerOptions) {
    this.store = opts.store;
    this.tickMs = opts.tickMs ?? DEFAULT_TICK_MS;
    this.leaseMs = opts.leaseMs ?? DEFAULT_LEASE_MS;
    this.ownerId = opts.ownerId ?? `cron:${crypto.randomUUID().slice(0, 8)}`;
    this.now = opts.now ?? (() => Date.now());
    for (const [id, fn] of Object.entries(createBuiltinHandlers())) {
      this.handlers.set(id, fn);
    }
  }

  registerHandler(id: string, fn: CronHandler): void {
    this.handlers.set(id, fn);
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick().catch((err) => {
        console.error('[trellis/cron] tick error:', err);
      });
    }, this.tickMs);
    // Unref so the timer does not keep Node alive alone (tests / short CLIs).
    if (typeof (this.timer as any).unref === 'function') {
      (this.timer as any).unref();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getStatus(): CronStatus {
    return {
      running: this.timer !== null,
      tickMs: this.tickMs,
      jobCount: this.jobCount,
    };
  }

  /** One scheduler pass — used by the interval and by unit tests. */
  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const nowMs = this.now();
      const jobs = await this.store.listJobs();
      this.jobCount = jobs.length;
      for (const job of jobs) {
        await this.processJob(job, nowMs);
      }
    } finally {
      this.ticking = false;
    }
  }

  private async processJob(job: CronJobRecord, nowMs: number): Promise<void> {
    if (!job.enabled) return;
    if (!isDue(job.nextRunAt, nowMs)) return;
    if (leaseIsLive(job.leaseExpiresAt, nowMs)) {
      await this.store.createRun({
        jobId: job.id,
        startedAt: new Date(nowMs).toISOString(),
        finishedAt: new Date(nowMs).toISOString(),
        status: 'skipped',
        result: { reason: 'lease_held' },
      });
      return;
    }

    let intervalMs: number;
    try {
      intervalMs = assertIntervalMs(job.intervalMs);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.failJob(job, nowMs, message);
      return;
    }

    const leaseExpiresAt = new Date(nowMs + this.leaseMs).toISOString();
    await this.store.updateJob(job.id, {
      leaseOwner: this.ownerId,
      leaseExpiresAt,
    });

    const startedAt = new Date(nowMs).toISOString();
    const handler = this.handlers.get(job.handler);
    if (!handler) {
      await this.failJob(job, nowMs, `unknown handler: ${job.handler}`, startedAt);
      return;
    }

    try {
      const result = await handler(job, this.store);
      const finishedMs = this.now();
      const finishedAt = new Date(finishedMs).toISOString();
      await this.store.createRun({
        jobId: job.id,
        startedAt,
        finishedAt,
        status: 'ok',
        result,
      });
      await this.store.updateJob(job.id, {
        lastRunAt: finishedAt,
        nextRunAt: nextRunAtFromInterval(intervalMs, finishedMs),
        lastError: undefined,
        leaseOwner: undefined,
        leaseExpiresAt: undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.failJob(job, this.now(), message, startedAt, intervalMs);
    }
  }

  private async failJob(
    job: CronJobRecord,
    nowMs: number,
    message: string,
    startedAt?: string,
    intervalMs?: number,
  ): Promise<void> {
    const finishedAt = new Date(nowMs).toISOString();
    await this.store.createRun({
      jobId: job.id,
      startedAt: startedAt ?? finishedAt,
      finishedAt,
      status: 'error',
      error: message,
    });
    const patch: Partial<CronJobRecord> = {
      lastRunAt: finishedAt,
      lastError: message,
      leaseOwner: undefined,
      leaseExpiresAt: undefined,
    };
    try {
      const ms = intervalMs ?? assertIntervalMs(job.intervalMs);
      patch.nextRunAt = nextRunAtFromInterval(ms, nowMs);
    } catch {
      // leave nextRunAt unchanged if interval invalid
    }
    await this.store.updateJob(job.id, patch);
  }
}
