/**
 * Quick bench: 5 JsonOpLog appends on a ~5100-op journal copy.
 * Compares TRELLIS_OPLOG_FULL_WRITE=1 vs default incremental append.
 *
 *   bun rug/bench-oplog-append.mts
 */

import { mkdtempSync, rmSync, copyFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { JsonOpLog } from '../src/vcs/op-log.ts';
import { createVcsOp } from '../src/vcs/ops.ts';

const SOURCE_OPS = join(import.meta.dir, '..', '.trellis', 'ops.json');

async function runMode(
  mode: 'full_write' | 'incremental',
): Promise<{ journalOps: number; ms: number[] }> {
  const root = mkdtempSync(join(tmpdir(), 'trellis-oplog-bench-'));
  const logPath = join(root, 'ops.json');
  copyFileSync(SOURCE_OPS, logPath);

  if (mode === 'full_write') {
    process.env.TRELLIS_OPLOG_FULL_WRITE = '1';
  } else {
    delete process.env.TRELLIS_OPLOG_FULL_WRITE;
  }

  const log = new JsonOpLog(logPath);
  log.load();
  const journalOps = log.count();
  let previousHash = log.getLastOp()?.hash;

  const ms: number[] = [];
  const stamp = Date.now();

  for (let i = 0; i < 5; i++) {
    const op = await createVcsOp('vcs:decisionRecord', {
      agentId: 'agent:oplog-bench',
      previousHash,
      vcs: {
        decisionId: `bench:${stamp}:${mode}:${i}`,
        decisionContext: 'rug/bench-oplog-append.mts',
      },
    });

    const t0 = performance.now();
    log.append(op);
    ms.push(performance.now() - t0);
    previousHash = op.hash;
  }

  rmSync(root, { recursive: true, force: true });
  return { journalOps, ms };
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function fmtRow(label: string, ms: number[]): string {
  const total = sum(ms);
  const per = ms.map((m) => m.toFixed(1)).join(', ');
  return `${label.padEnd(14)} total=${total.toFixed(1)} ms  per-append=[${per}]`;
}

const full = await runMode('full_write');
delete process.env.TRELLIS_OPLOG_FULL_WRITE;
const inc = await runMode('incremental');

console.log(`Journal copy: ${full.journalOps} ops (from .trellis/ops.json)`);
console.log('');
console.log('5 sequential appends:');
console.log(fmtRow('full_write', full.ms));
console.log(fmtRow('incremental', inc.ms));
console.log('');
const fullTotal = sum(full.ms);
const incTotal = sum(inc.ms);
const ratio = fullTotal / incTotal;
console.log(
  `Speedup (full → incremental): ${ratio.toFixed(2)}× (${fullTotal.toFixed(1)} ms → ${incTotal.toFixed(1)} ms)`,
);
