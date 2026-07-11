#!/usr/bin/env node
/**
 * Shared helpers for ship-check / ship-release.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

/** Prefer repo-local tmp so /tmp exhaustion does not fail release gates. */
export function ensureShipTmp(repoRoot) {
  const dir = join(repoRoot, 'rug', 'tmp');
  mkdirSync(dir, { recursive: true });
  process.env.TMPDIR = dir;
  process.env.TMP = dir;
  process.env.TEMP = dir;
  return dir;
}

/** @returns {{ ok: boolean, availMb: number, path: string, message?: string }} */
export function checkDiskSpace(path, minFreeMb = 1024) {
  const out = spawnSync('df', ['-m', path], { encoding: 'utf8' });
  if (out.status !== 0 || !out.stdout) {
    return {
      ok: false,
      availMb: 0,
      path,
      message: `df failed for ${path}`,
    };
  }
  const line = out.stdout.trim().split('\n').pop() ?? '';
  const parts = line.split(/\s+/);
  const availMb = Number.parseInt(parts[3] ?? '0', 10);
  if (!Number.isFinite(availMb)) {
    return { ok: false, availMb: 0, path, message: `could not parse df output` };
  }
  if (availMb < minFreeMb) {
    return {
      ok: false,
      availMb,
      path,
      message: `only ${availMb}MB free on ${path} (need ≥${minFreeMb}MB)`,
    };
  }
  return { ok: true, availMb, path };
}

export function tailLines(text, maxLines = 12) {
  if (!text) return '';
  return text.trim().split('\n').slice(-maxLines).join('\n');
}

export function writeShipReport(repoRoot, report) {
  const stamp = report.startedAt.replace(/[:.]/g, '-');
  const path = join(repoRoot, 'rug', `ship-report-${stamp}.json`);
  mkdirSync(join(repoRoot, 'rug'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return path;
}

export function printShipSummary(report, reportPath) {
  const mode = report.mode;
  const icon = report.ok ? '✓' : '✗';
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Ship report — ${icon} ${report.ok ? 'PASSED' : 'FAILED'} (${mode})`);
  console.log(`${'─'.repeat(60)}`);
  for (const step of report.steps) {
    const mark = step.status === 'ok' ? '✓' : step.status === 'skipped' ? '○' : '✗';
    const dur = step.durationMs != null ? ` (${(step.durationMs / 1000).toFixed(1)}s)` : '';
    console.log(`  ${mark} ${step.label}${dur}`);
    if (step.status === 'fail' && step.error) {
      const oneLine = step.error.split('\n')[0];
      console.log(`      ${oneLine}`);
    }
  }
  if (report.preflight?.disk) {
    const d = report.preflight.disk;
    console.log(`\n  Disk ${d.path}: ${d.availMb}MB free${d.ok ? '' : ' — LOW'}`);
  }
  if (reportPath) console.log(`\n  Full report: ${reportPath}`);
  if (!report.ok && report.failedStep) {
    console.log(`\n  Failed at: ${report.failedStep}`);
    const fail = report.steps.find((s) => s.id === report.failedStep);
    if (fail?.tail) {
      console.log('\n  Last output:');
      for (const line of fail.tail.split('\n')) console.log(`    ${line}`);
    }
  }
  console.log(`${'─'.repeat(60)}\n`);
}
