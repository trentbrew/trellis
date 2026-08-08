import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRecords, type BenchRecord, type Scenario } from './schema.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(ROOT, 'results');

interface Corridor {
  scenario: Partial<Scenario>;
  maxWallMsP50?: number;
  maxRssKb?: number;
}

interface Budget {
  lock: boolean;
  note?: string;
  corridors: Corridor[];
}

function latestResults(): string {
  const files = readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith('.jsonl'))
    .sort();
  if (files.length === 0) throw new Error('no results yet — run bun bench/run.ts first');
  return join(RESULTS_DIR, files[files.length - 1]!);
}

function matches(sc: Scenario, c: Scenario): boolean {
  return (
    sc.depth === c.depth &&
    sc.backend === c.backend &&
    sc.knob === c.knob &&
    sc.phase === c.phase
  );
}

function main(): void {
  const flag = (name: string): string | undefined =>
    process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(`--${name}=`.length);

  const resultsPath = flag('results') ?? latestResults();
  const budgetPath = flag('budget') ?? join(ROOT, 'budget.json');

  const budget = JSON.parse(readFileSync(budgetPath, 'utf-8')) as {
    lock: boolean;
    note?: string;
    corridors: Corridor[];
  };
  const records = readRecords(readFileSync(resultsPath, 'utf-8'));

  console.log(`[check] ${resultsPath}`);
  for (const r of records) {
    const s = r.scenario;
    console.log(
      `  ${String(s.depth).padStart(7)} ${s.backend.padEnd(6)} ${s.knob.padEnd(9)} ${s.phase.padEnd(4)} p50=${r.measures.wallMsP50.toFixed(1)}ms rss=${r.measures.maxRssKb}KB`,
    );
  }

  if (!budget.lock) {
    console.log('[check] budget not locked — baseline mode, no gate enforced.');
    console.log('[check] populate bench/budget.json with the first baseline to arm the CI gate.');
    process.exit(0);
  }

  let failed = 0;
  for (const corridor of budget.corridors) {
    const base = corridor.scenario as Scenario;
    const hits = records.filter((r) => matches(r.scenario, base) && r.variant === 'control');
    const control = hits.slice(-1)[0];
    const label = `${base.depth} ${base.backend}.${base.knob} ${base.phase}`;
    if (control) {
      const wallOk = !corridor.maxWallMsP50 || control.measures.wallMsP50 <= corridor.maxWallMsP50;
      const rssOk = !corridor.maxRssKb || control.measures.maxRssKb <= corridor.maxRssKb;
      if (wallOk && rssOk) {
        console.log(`  ✓ ${label} within corridor`);
      } else {
        console.log(`  ✗ ${label} overrun (wall=${control.measures.wallMsP50.toFixed(1)}ms rss=${control.measures.maxRssKb}KB)`);
        failed++;
      }
    } else {
      console.log(`  ? ${label} no matching record`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();