/**
 * Promotion gate for profile-context injection arms.
 *
 * Usage:
 *   bun experiments/profile-context/check.ts
 *   bun experiments/profile-context/check.ts --manifest=path/to/manifest.jsonl
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DEFAULT_MANIFEST = join(ROOT, 'runs', 'manifest.jsonl');

interface RunRow {
  taskId: string;
  variant: string;
  outcome: 'success' | 'fail';
  metrics?: { rubricPass?: boolean; contextIncludesProfile?: boolean };
}

function flag(name: string): string | undefined {
  return process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.slice(`--${name}=`.length);
}

function readManifest(path: string): RunRow[] {
  if (!existsSync(path)) {
    console.error(`[check] no manifest at ${path}`);
    process.exit(1);
  }
  return readFileSync(path, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as RunRow);
}

function passRate(rows: RunRow[]): number {
  if (rows.length === 0) return 0;
  return rows.filter((r) => r.outcome === 'success').length / rows.length;
}

function rubricPassRate(rows: RunRow[]): number {
  if (rows.length === 0) return 0;
  return rows.filter((r) => r.metrics?.rubricPass).length / rows.length;
}

function main(): void {
  const manifestPath = flag('manifest') ?? DEFAULT_MANIFEST;
  const rows = readManifest(manifestPath);

  const off = rows.filter((r) => r.variant === 'off');
  const session = rows.filter((r) => r.variant === 'session');

  console.log(`[check] ${manifestPath}`);
  console.log(
    `  off:     ${off.length} runs · smoke ${(passRate(off) * 100).toFixed(1)}% · rubric ${(rubricPassRate(off) * 100).toFixed(1)}%`,
  );
  console.log(
    `  session: ${session.length} runs · pass ${(passRate(session) * 100).toFixed(1)}% · rubric ${(rubricPassRate(session) * 100).toFixed(1)}%`,
  );

  if (session.length === 0 || off.length === 0) {
    console.log('[check] need both off and session runs in manifest');
    console.log('[check]   trellis eval profile-context --arm off --trials 3');
    console.log('[check]   trellis eval profile-context --arm session --trials 3');
    process.exit(1);
  }

  const sessionRubric = rubricPassRate(session);
  const offRubric = rubricPassRate(off);
  const rubricWins = session.filter((r) => r.metrics?.rubricPass).length;
  const rubricTotal = session.length;

  let failed = 0;

  if (sessionRubric <= offRubric) {
    console.log('  ✗ session arm did not beat off on rubric adherence');
    failed++;
  } else {
    console.log('  ✓ session arm beat off on rubric adherence');
  }

  const offSmoke = passRate(off);
  if (offSmoke < 0.99) {
    console.log('  ✗ off arm should omit profile context on all tasks');
    failed++;
  } else {
    console.log('  ✓ off arm omits profile context');
  }

  if (rubricTotal > 0 && rubricWins / rubricTotal < 0.8) {
    console.log(`  ✗ session rubric adherence below 80% (${rubricWins}/${rubricTotal})`);
    failed++;
  } else {
    console.log(`  ✓ session rubric adherence ok (${rubricWins}/${rubricTotal})`);
  }

  if (failed) {
    console.log('[check] HOLD — do not promote TRELLIS_PROFILE_CONTEXT_ARM default');
    process.exit(1);
  }

  console.log('[check] PROMOTE — session arm clears gate (record in experiment-inventory)');
  process.exit(0);
}

main();
