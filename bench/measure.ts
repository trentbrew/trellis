import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

export function wallMs(fn: () => unknown): number {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

export interface RssSample {
  rssKb: number;
  peakRssKb: number;
}

function kbFromStatus(text: string, key: string): number | null {
  const m = new RegExp(`^${key}:\\s+(\\d+)\\s+kB`, 'm').exec(text);
  return m ? Number(m[1]) : null;
}

export function rssKb(): RssSample {
  try {
    const status = readFileSync('/proc/self/status', 'utf-8');
    const rss = kbFromStatus(status, 'VmRSS') ?? 0;
    const peak = kbFromStatus(status, 'VmHWM') ?? rss;
    return { rssKb: rss, peakRssKb: peak };
  } catch {
    const u = process.memoryUsage();
    return { rssKb: Math.round(u.rss / 1024), peakRssKb: Math.round(u.rss / 1024) };
  }
}

export type DropState = 'dropped' | 'skipped' | 'unsupported';

export function dropCaches(): DropState {
  if (process.platform !== 'linux') return 'unsupported';
  try {
    execFileSync('sync');
    execFileSync('sh', ['-c', 'echo 3 > /proc/sys/vm/drop_caches']);
    return 'dropped';
  } catch (err) {
    const code = (err as { code?: string }).code;
    return code === 'ENOENT' ? 'unsupported' : 'skipped';
  }
}