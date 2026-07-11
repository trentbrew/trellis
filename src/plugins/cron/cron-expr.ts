/**
 * Cron expression helpers — intervalMs → nextRunAt (v1).
 * @module trellis/plugins/cron/cron-expr
 */

export const MIN_INTERVAL_MS = 500;

export function assertIntervalMs(intervalMs: unknown): number {
  const n = typeof intervalMs === 'number' ? intervalMs : Number(intervalMs);
  if (!Number.isFinite(n) || n < MIN_INTERVAL_MS) {
    throw new Error(`intervalMs must be a number >= ${MIN_INTERVAL_MS}`);
  }
  return n;
}

export function nextRunAtFromInterval(
  intervalMs: number,
  fromMs: number = Date.now(),
): string {
  return new Date(fromMs + assertIntervalMs(intervalMs)).toISOString();
}

export function isDue(
  nextRunAt: string | undefined | null,
  nowMs: number,
): boolean {
  if (!nextRunAt) return true;
  const t = Date.parse(nextRunAt);
  if (!Number.isFinite(t)) return true;
  return t <= nowMs;
}

export function leaseIsLive(
  leaseExpiresAt: string | undefined | null,
  nowMs: number,
): boolean {
  if (!leaseExpiresAt) return false;
  const t = Date.parse(leaseExpiresAt);
  if (!Number.isFinite(t)) return false;
  return t > nowMs;
}
