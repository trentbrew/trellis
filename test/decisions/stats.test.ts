import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TrellisVcsEngine } from '../../src/engine.js';
import type { Decision } from '../../src/decisions/types.js';
import {
  classifySummary,
  median,
  parseTimeArg,
  percentile,
  stableInputKey,
  summarizeDecisions,
} from '../../src/decisions/stats.js';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const cli = join(repoRoot, 'src/cli/index.ts');

const dirs: string[] = [];

function tempRepo(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'trellis-stats-')));
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'index.ts'), 'export const x = 1;');
  dirs.push(dir);
  return dir;
}

async function initEngine(root: string): Promise<TrellisVcsEngine> {
  const engine = new TrellisVcsEngine({ rootPath: root });
  await engine.initRepo();
  engine.open();
  return engine;
}

afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

function decision(over: Partial<Decision>): Decision {
  return {
    id: 'DEC-1',
    toolName: 'tool',
    relatedEntities: [],
    ...over,
  };
}

describe('parseTimeArg', () => {
  const now = new Date('2026-11-14T12:00:00.000Z');

  test('relative days and hours', () => {
    expect(parseTimeArg('7d', now)).toBe('2026-11-07T12:00:00.000Z');
    expect(parseTimeArg('36h', now)).toBe('2026-11-13T00:00:00.000Z');
  });

  test('ISO-8601 passes through as UTC', () => {
    expect(parseTimeArg('2026-11-01', now)).toBe('2026-11-01T00:00:00.000Z');
  });

  test('invalid and non-positive windows throw', () => {
    expect(() => parseTimeArg('nope', now)).toThrow(/invalid time/);
    expect(() => parseTimeArg('0d', now)).toThrow(/invalid time/);
  });
});

describe('percentiles', () => {
  test('odd, even, single, empty', () => {
    expect(percentile([10, 20, 30], 0.9)).toBe(30);
    expect(percentile([10, 20, 30, 40], 0.9)).toBe(40);
    expect(percentile([5], 0.9)).toBe(5);
    expect(percentile([], 0.9)).toBeNull();
  });

  test('median averages the middle pair', () => {
    expect(median([10, 20, 60])).toBe(20);
    expect(median([10, 20, 60, 80])).toBe(40);
    expect(median([])).toBeNull();
  });
});

describe('classifySummary', () => {
  const cases: Array<[string | undefined, string]> = [
    ['Error: boom', 'error'],
    ['Unknown tool nope', 'error'],
    ['Not a TrellisVCS repository: /x', 'error'],
    ['Failed to open store', 'error'],
    ['No issues found.', 'empty'],
    ['No decision traces found', 'empty'],
    ['Entities (0)', 'empty'],
    ['Found 0 matching rows', 'empty'],
    ['0 rows', 'empty'],
    ['Branch: main\nTotal ops: 3', 'unknown'],
    [undefined, 'unknown'],
    ['', 'unknown'],
  ];

  test.each(cases)('%s → %s', (summary, expected) => {
    expect(classifySummary(summary)).toBe(expected);
  });
});

describe('stableInputKey', () => {
  test('key order does not change the hash', () => {
    expect(stableInputKey({ a: 1, b: { c: 2, d: 3 } })).toBe(
      stableInputKey({ b: { d: 3, c: 2 }, a: 1 }),
    );
  });

  test('absent input and 12-char hash', () => {
    expect(stableInputKey(undefined)).toBe('none');
    expect(stableInputKey({ a: 1 })).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe('summarizeDecisions', () => {
  const rows: Decision[] = [
    decision({
      id: 'DEC-1',
      toolName: 'tool_a',
      input: { x: 1 },
      context: 'ses_1',
      createdAt: '2026-11-01T00:00:00.000Z',
      outputSummary: 'No rows found.',
    }),
    decision({
      id: 'DEC-2',
      toolName: 'tool_a',
      input: { x: 1 },
      context: 'ses_1',
      createdAt: '2026-11-01T00:00:10.000Z',
    }),
    decision({
      id: 'DEC-3',
      toolName: 'tool_b',
      input: { y: 2 },
      context: 'ses_2',
      createdAt: '2026-11-01T00:00:30.000Z',
      outputSummary: 'Error: bad',
    }),
    decision({
      id: 'DEC-4',
      toolName: 'tool_a',
      input: { x: 2 },
      context: 'ses_1',
      createdAt: '2026-11-01T00:01:30.000Z',
    }),
  ];

  test('totals and deterministic ordering', () => {
    const report = summarizeDecisions(rows, { generatedAt: 'fixed' });

    expect(report.v).toBe(1);
    expect(report.generatedAt).toBe('fixed');
    expect(report.totals).toMatchObject({
      decisions: 4,
      sessions: 2,
      tools: 2,
      firstAt: '2026-11-01T00:00:00.000Z',
      lastAt: '2026-11-01T00:01:30.000Z',
      unknownTime: 0,
      class: { error: 1, empty: 1, unknown: 2 },
    });
    expect(report.byTool.map((g) => g.name)).toEqual(['tool_a', 'tool_b']);
    expect(report.bySession.map((g) => g.name)).toEqual(['ses_1', 'ses_2']);
    expect(report.byDay.map((g) => g.name)).toEqual(['2026-11-01']);
  });

  test('gaps, span, and repeat runs', () => {
    const report = summarizeDecisions(rows, { generatedAt: 'fixed' });
    const a = report.byTool.find((g) => g.name === 'tool_a')!;

    expect(a.decisions).toBe(3);
    expect(a.sessions).toBe(1);
    expect(a.tools).toBeNull();
    expect(a.spanMs).toBe(90_000);
    expect(a.medianGapMs).toBe(45_000);
    expect(a.p90GapMs).toBe(80_000);
    expect(a.repeatedRuns).toBe(1);
    expect(a.maxRepeatStreak).toBe(2);

    const session = report.bySession.find((g) => g.name === 'ses_1')!;
    expect(session.tools).toBe(1);
    expect(session.sessions).toBeNull();
    expect(session.spanMs).toBe(90_000);
  });

  test('repeat patterns are hashed, not raw args', () => {
    const report = summarizeDecisions(rows, { generatedAt: 'fixed' });
    const pattern = report.patterns.repeats.find(
      (p) => p.group === 'tool' && p.name === 'tool_a',
    )!;
    expect(pattern.count).toBe(2);
    expect(pattern.inputKey).toMatch(/^[0-9a-f]{12}$/);
    expect(JSON.stringify(report)).not.toContain('"x":1');
  });

  test('missing timestamps count as unknownTime and skip byDay', () => {
    const report = summarizeDecisions(
      [decision({ id: 'DEC-9', toolName: 'ghost', context: 'ses_x' })],
      { generatedAt: 'fixed' },
    );
    expect(report.totals.unknownTime).toBe(1);
    expect(report.totals.firstAt).toBeNull();
    expect(report.byDay).toHaveLength(0);
    expect(report.byTool[0].spanMs).toBeNull();
  });

  test('day buckets use the UTC calendar day for offset timestamps', () => {
    const report = summarizeDecisions(
      [
        decision({
          id: 'DEC-10',
          toolName: 'offset',
          createdAt: '2026-11-01T23:30:00-05:00',
        }),
      ],
      { generatedAt: 'fixed' },
    );
    // 2026-11-01T23:30-05:00 is 2026-11-02T04:30Z.
    expect(report.byDay.map((g) => g.name)).toEqual(['2026-11-02']);
  });

  test('empty input is deterministic', () => {
    const report = summarizeDecisions([], { generatedAt: 'fixed' });
    expect(report.totals.decisions).toBe(0);
    expect(report.byTool).toEqual([]);
    expect(report.patterns.repeats).toEqual([]);
  });
});

describe('decision query + CLI integration', () => {
  let root: string;
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    root = tempRepo();
    engine = await initEngine(root);
  });

  function runCli(args: string[]) {
    const env = { ...process.env };
    delete env.TRELLIS_LANE_ID;
    delete env.TRELLIS_EDIT_ROOT;
    return spawnSync('bun', [cli, ...args], {
      cwd: root,
      encoding: 'utf8',
      env,
    });
  }

  test('queryDecisions exposes parsed input and includeRelated:false', async () => {
    await engine.recordDecision({
      toolName: 'tool_b',
      input: { y: 2 },
      context: 'ses_b',
      relatedEntities: ['issue:TRL-1'],
    });
    await engine.recordDecision({ toolName: 'tool_a', input: { x: 1 } });

    const all = engine.queryDecisions();
    const withInput = all.find((d) => d.toolName === 'tool_b')!;
    expect(withInput.input).toEqual({ y: 2 });

    const lean = engine.queryDecisions({ includeRelated: false });
    expect(lean.find((d) => d.toolName === 'tool_b')!.relatedEntities).toEqual([]);

    const full = engine.queryDecisions();
    expect(full.find((d) => d.toolName === 'tool_b')!.relatedEntities).toEqual([
      'issue:TRL-1',
    ]);
  });

  test('malformed toolInput is undefined, not a throw', async () => {
    const ctx = (
      engine as unknown as {
        _ctx(): { store: { addFacts(facts: Array<{ e: string; a: string; v: string }>): void } };
      }
    )._ctx();
    ctx.store.addFacts([
      { e: 'decision:DEC-BAD', a: 'type', v: 'Decision' },
      { e: 'decision:DEC-BAD', a: 'toolName', v: 'broken' },
      { e: 'decision:DEC-BAD', a: 'toolInput', v: '{not json' },
      { e: 'decision:DEC-BAD', a: 'createdAt', v: '2026-11-01T00:00:00.000Z' },
    ]);

    const bad = engine.getDecision('DEC-BAD');
    expect(bad).not.toBeNull();
    expect(bad!.input).toBeUndefined();
  });

  test('CLI json is stable except generatedAt and has no ANSI', async () => {
    await engine.recordDecision({ toolName: 'tool_a', input: { x: 1 }, context: 's1' });
    await engine.recordDecision({ toolName: 'tool_a', input: { x: 1 }, context: 's1' });
    await engine.recordDecision({ toolName: 'tool_b', input: { y: 2 }, context: 's2' });

    const first = runCli(['decision', 'stats', '--json']);
    const second = runCli(['decision', 'stats', '--json']);
    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    expect(first.stdout).not.toMatch(/\u001b\[/);

    const strip = (out: string) => {
      const report = JSON.parse(out);
      delete report.generatedAt;
      return JSON.stringify(report);
    };
    expect(strip(first.stdout)).toBe(strip(second.stdout));

    const report = JSON.parse(first.stdout);
    expect(report.totals.decisions).toBe(3);
    expect(report.byTool.map((g: { name: string }) => g.name)).toEqual([
      'tool_a',
      'tool_b',
    ]);
    expect(report.patterns.repeats[0]).toMatchObject({
      toolName: 'tool_a',
      count: 2,
    });
  });

  test('CLI --since excludes older decisions', async () => {
    await engine.recordDecision({ toolName: 'old', context: 's1' });

    const future = new Date(Date.now() + 3_600_000).toISOString();
    const res = runCli(['decision', 'stats', '--json', '--since', future]);
    expect(res.status).toBe(0);
    expect(JSON.parse(res.stdout).totals.decisions).toBe(0);
  });

  test('CLI invalid args exit 2', () => {
    expect(runCli(['decision', 'stats', '--by', 'nope']).status).toBe(2);
    expect(runCli(['decision', 'stats', '--limit', '0']).status).toBe(2);
    expect(runCli(['decision', 'stats', '--limit', '5abc']).status).toBe(2);
    expect(runCli(['decision', 'stats', '--since', 'nope']).status).toBe(2);
  });

  test('CLI empty store exits 0', async () => {
    const emptyRoot = tempRepo();
    await initEngine(emptyRoot);
    const env = { ...process.env };
    delete env.TRELLIS_LANE_ID;
    delete env.TRELLIS_EDIT_ROOT;
    const res = spawnSync('bun', [cli, 'decision', 'stats', '--json'], {
      cwd: emptyRoot,
      encoding: 'utf8',
      env,
    });
    expect(res.status).toBe(0);
    expect(JSON.parse(res.stdout).totals.decisions).toBe(0);
  });
});
