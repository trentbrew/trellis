/**
 * Shared cron types.
 * @module trellis/plugins/cron/types
 */

export type CronRunStatus = 'ok' | 'error' | 'skipped';

export interface CronJobRecord {
  id: string;
  name: string;
  enabled: boolean;
  intervalMs: number;
  handler: string;
  payload?: unknown;
  nextRunAt?: string;
  lastRunAt?: string;
  leaseOwner?: string;
  leaseExpiresAt?: string;
  lastError?: string;
  timezone?: string;
}

export interface CronRunRecord {
  jobId: string;
  startedAt: string;
  finishedAt: string;
  status: CronRunStatus;
  error?: string;
  result?: unknown;
}

export interface CronHandlerContext {
  getEntity(id: string): Promise<Record<string, unknown> | null>;
  updateEntity(id: string, attrs: Record<string, unknown>): Promise<void>;
}

export interface CronStore extends CronHandlerContext {
  listJobs(): Promise<CronJobRecord[]>;
  updateJob(id: string, attrs: Partial<CronJobRecord>): Promise<void>;
  createRun(attrs: CronRunRecord): Promise<string>;
}

export interface CronStatus {
  running: boolean;
  tickMs: number;
  jobCount: number;
}
