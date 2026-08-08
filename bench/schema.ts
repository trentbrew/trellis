import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export type Backend = 'jsonl' | 'sqlite';
export type BenchPhase = 'cold' | 'warm';
export type ArrivalMode = 'flood-cold' | 'live-trickle';
export type BenchOutcome = 'pass' | 'baseline' | 'fail';

export interface Scenario {
  depth: number;
  backend: Backend;
  knob: string;
  phase: BenchPhase;
  arrival: ArrivalMode;
}

export interface BenchMeasures {
  attempts: number;
  wallMsP50: number;
  wallMsP95: number;
  maxRssKb: number;
  peakRssKb: number;
  dropState: string;
}

export interface BenchRecord {
  id: string;
  issuedAt: string;
  trl: 'TRL-24';
  hypothesis: string;
  variant: string;
  scenario: Scenario;
  rev: string;
  host: string;
  measures: BenchMeasures;
  parity: string;
  outcome: BenchOutcome;
  repro: string;
}

export type Scenario = BenchSlice;

export function sortNums(nums: number[]): number[] {
  return [...nums].sort((a, b) => a - b);
}

export function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = sortNums(nums);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function pct(nums: number[], p: number): number {
  if (nums.length === 0) return 0;
  const sorted = sortNums(nums);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

export class ResultsWriter {
  constructor(private dir: string) {
    mkdirSync(dir, { recursive: true });
  }

  write(record: BenchRecord, file: string): void {
    const path = join(this.dir, file);
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, JSON.stringify(record) + '\n');
  }
}

export function readRecords(text: string): BenchRecord[] {
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as BenchRecord);
}

export function newRecord(repro: string): BenchRecord {
  return {
    id: randomUUID(),
    issuedAt: new Date().toISOString(),
    trl: 'TRL-24',
    hypothesis: 'baseline storage read path',
    variant: 'control',
    scenario: { depth: 0, backend: 'jsonl', knob: 'load', phase: 'cold', arrival: 'flood-cold' },
    rev: '',
    host: '',
    measures: { attempts: 0, wallMsP50: 0, wallMsP95: 0, maxRssKb: 0, peakRssKb: 0, dropState: 'none' },
    parity: 'none',
    outcome: 'baseline',
    repro,
  };
}