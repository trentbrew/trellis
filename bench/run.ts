import { execSync } from 'node:child_process';
import { appendFileSync, mkdirSync, rmSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { JsonOpLog } from '../src/vcs/op-log.js';
import { SqliteKernelBackend } from '../src/core/persist/sqlite-backend.js';
import { SyncEngine } from '../src/sync/sync-engine.js';
import { createSqliteLocalOpsReader } from '../src/sync/sqlite-ops-reader.js';
import type { SyncTransport, SyncMessage, PeerId } from '../src/sync/types.js';
import { PROTOCOL_VERSION } from '../src/sync/types.js';
import { mkCorpus, writeJsonl } from './corpus.js';
import { dropCaches, rssKb, wallMs } from './measure.js';
import {
  newRecord,
  pct,
  type ArrivalMode,
  type Backend,
  type BenchPhase,
  type BenchRecord,
} from './schema.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const RESULTS = join(ROOT, 'results');
/** Bench data I/O lives off the worktree fs (slow overlay); default tmpdir, override with BENCH_WORK_DIR. */
const WORK = process.env.BENCH_WORK_DIR ?? join(tmpdir(), 'trellis-bench-work');

interface CliArgs {
  smoke: boolean;
  depths: number[];
  warmRuns: number;
  coldRuns: number;
  tailWindow: number;
  resultsFile: string;
}

function parseArgs(argv: string[]): CliArgs {
  const flag = (name: string): string | undefined =>
    argv.find((a) => a.startsWith(`--${name}=`))?.slice(`--${name}=`.length);
  const smoke = argv.includes('--smoke');
  return {
    smoke,
    depths: (flag('depths') ?? (smoke ? '1000' : '1000,10000,100000'))
      .split(',')
      .map(Number),
    warmRuns: Number(flag('warm-runs') ?? (smoke ? '3' : '5')),
    coldRuns: Number(flag('cold-runs') ?? (smoke ? '0' : '1')),
    tailWindow: Number(flag('tail-window') ?? '1000'),
    resultsFile:
      flag('results') ??
      join(RESULTS, `bench-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`),
  };
}

function gitRev(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  } catch {
    return 'unknown';
  }
}

interface Slice {
  walls: number[];
  maxRssKb: number;
  peakRssKb: number;
  dropState: string;
}

function prepareSqlite(dbPath: string, corpus: unknown[]): void {
  rmSync(dbPath, { force: true });
  const db = new SqliteKernelBackend(dbPath);
  db.init();
  const chunk = 2000;
  for (let i = 0; i < corpus.length; i += chunk) {
    db.appendBatch(corpus.slice(i, i + chunk) as never[]);
  }
  db.close();
}

/** 0-based index of the tail's start cursor (the op the peer already has). */
function tailWindowIdx(depth: number, tailWindow: number): number {
  return Math.max(0, depth - tailWindow - 1);
}

/** A sync engine whose local ops come from the whole-log read (control). */
function createArrayPeer(db: SqliteKernelBackend): SyncEngine {
  return new SyncEngine({
    localPeerId: 'control',
    transport: new benchTransportStub(),
    getLocalOps: () => db.readAll() as never[],
    onOpsReceived: async () => ({}),
  });
}

/** A sync engine whose local ops come from the bounded sqlite reader. */
function createReaderPeer(db: SqliteKernelBackend): SyncEngine {
  return new SyncEngine({
    localPeerId: 'bounded',
    transport: new benchTransportStub(),
    getLocalOps: () => db.readAll() as never[],
    opsReader: createSqliteLocalOpsReader(db),
    onOpsReceived: async () => ({}),
  });
}

/**
 * Drive a `want` for ops after the given cursor hash through the engine's
 * `handleWant`. The tail read itself is synchronous (before the first await),
 * so `wallMs` captures exactly the read path.
 */
function syncWantTail(engine: SyncEngine, cursorHash: string): void {
  void engine['handleWant']({
    version: PROTOCOL_VERSION,
    type: 'want',
    peerId: 'remote',
    wantHashes: [],
    afterHash: cursorHash,
  } as never);
}

/**
 * Correctness parity: the tail delivered by the bounded reader must be exactly
 * the ops the whole-log path sends (same window, same order) for a `want`.
 */
function syncWantParity(
  control: SyncEngine,
  bounded: SyncEngine,
  cursorHash: string,
): boolean {
  const controlStub = (control as unknown as { transport: benchTransportStub }).transport;
  const boundedStub = (bounded as unknown as { transport: benchTransportStub }).transport;
  controlStub.sent = [];
  boundedStub.sent = [];
  syncWantTail(control, cursorHash);
  syncWantTail(bounded, cursorHash);
  const controlOps = controlStub.sent.filter((m) => m.type === 'ops');
  const boundedOps = boundedStub.sent.filter((m) => m.type === 'ops');
  const controlLen = controlOps.length > 0 ? controlOps[0].ops.length : 0;
  const boundedLen = boundedOps.length > 0 ? boundedOps[0].ops.length : 0;
  return controlOps.length === boundedOps.length && controlLen === boundedLen;
}

/** Capturing transport: records outbound messages. */
class benchTransportStub implements SyncTransport {
  sent: SyncMessage[] = [];
  private handler?: (msg: SyncMessage) => void | Promise<void>;
  onMessage(handler: (msg: SyncMessage) => void | Promise<void>): void {
    this.handler = handler;
  }
  send(_peerId: string, message: SyncMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
  peers(): PeerId[] {
    return [];
  }
}

function sample(loop: () => void, count: number, phase: BenchPhase): Slice {
  const walls: number[] = [];
  const drops: string[] = [];
  for (let i = 0; i < count; i++) {
    if (phase === 'cold') drops.push(dropCaches());
    walls.push(wallMs(loop));
  }
  const mem = rssKb();
  return {
    walls,
    maxRssKb: mem.rssKb,
    peakRssKb: mem.peakRssKb,
    dropState: phase === 'cold' ? (drops[0] ?? 'none') : 'none',
  };
}

function buildRecord(
  repro: string,
  rev: string,
  host: string,
  backend: Backend,
  knob: string,
  arrival: ArrivalMode,
  phase: BenchPhase,
  depth: number,
  slice: Slice,
): BenchRecord {
  const base = newRecord(repro);
  return {
    ...base,
    scenario: { depth, backend, knob, phase, arrival },
    measures: {
      attempts: slice.walls.length,
      wallMsP50: pct(slice.walls, 50),
      wallMsP95: pct(slice.walls, 95),
      maxRssKb: slice.maxRssKb,
      peakRssKb: slice.peakRssKb,
      dropState: slice.dropState,
    },
    rev,
    host,
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  mkdirSync(dirname(args.resultsFile), { recursive: true });

  const rev = gitRev();
  const host = hostname();
  const repro = `bun bench/run.ts ${process.argv.slice(2).join(' ')}`.trim();

  console.log(`[bench] rev=${rev} host=${host} warm=${args.warmRuns} cold=${args.coldRuns}`);
  console.log(`[bench] results -> ${args.resultsFile}`);

  const records: BenchRecord[] = [];

  for (const depth of args.depths) {
    const dir = join(WORK, `deep-${depth}`);
    mkdirSync(dir, { recursive: true });
    const ops = mkCorpus(depth);

    const jsonlPath = join(dir, 'ops.jsonl');
    writeJsonl(ops, jsonlPath);

    const sqlitePath = join(dir, 'ops.sqlite');
    prepareSqlite(sqlitePath, ops);
    const tailHash = ops[Math.max(0, ops.length - args.tailWindow - 1)].hash;

    const jsonLog = new JsonOpLog(jsonlPath);
    jsonLog.load();

    for (const phase of ['cold', 'warm'] as BenchPhase[]) {
      const runs = phase === 'cold' ? args.coldRuns : args.warmRuns;
      if (runs === 0) continue;

      records.push(
        buildRecord(repro, rev, host, 'jsonl', 'load', 'flood-cold', phase, depth, sample(() => jsonLog.load(), runs, phase)),
        buildRecord(repro, rev, host, 'jsonl', 'readAll', 'flood-cold', phase, depth, sample(() => jsonLog.readAll(), runs, phase)),
      );
    }

    const db = new SqliteKernelBackend(sqlitePath);
    db.init();
    const cursorIdx = tailWindowIdx(depth, args.tailWindow);
    const cursorHash = ops[cursorIdx]?.hash ?? ops[0]?.hash;
    const controlPeer = createArrayPeer(db);
    const readerPeer = createReaderPeer(db);
    const parityOk = syncWantParity(controlPeer, readerPeer, cursorHash);
    if (!parityOk) {
      throw new Error(
        `[bench] parity guard failed at depth=${depth}: control vs bounded tail disagree`,
      );
    }
    for (const phase of ['cold', 'warm'] as BenchPhase[]) {
      const runs = phase === 'cold' ? args.coldRuns : args.warmRuns;
      if (runs === 0) continue;
      records.push(
        buildRecord(repro, rev, host, 'sqlite', 'readAll', 'flood-cold', phase, depth, sample(() => db.readAll(), runs, phase)),
        buildRecord(repro, rev, host, 'sqlite', 'readAfter', 'live-trickle', phase, depth, sample(() => db.readAfter(tailHash), runs, phase)),
        buildRecord(repro, rev, host, 'sqlite', 'syncControl', 'live-trickle', phase, depth, sample(() => syncWantTail(controlPeer, cursorHash), runs, phase)),
        buildRecord(repro, rev, host, 'sqlite', 'syncBounded', 'live-trickle', phase, depth, sample(() => syncWantTail(readerPeer, cursorHash), runs, phase)),
      );
    }
    db.close();
  }

  const out = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
  appendFileSync(args.resultsFile, out);

  for (const r of records) {
    const s = r.scenario;
    console.log(
      `  ${String(s.depth).padStart(7)} ${s.backend.padEnd(6)} ${s.knob.padEnd(9)} ${s.phase.padEnd(4)} p50=${r.measures.wallMsP50.toFixed(1)}ms p95=${r.measures.wallMsP95.toFixed(1)}ms rss=${r.measures.maxRssKb}KB peak=${r.measures.peakRssKb}KB`,
    );
  }
}

main();