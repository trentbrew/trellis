/**
 * Query path stress — fixture + live-repo regression guard
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { TrellisVcsEngine } from '../../src/engine.js';
import { runQueryStress, formatQueryStressHints } from '../../src/query/stress.js';
import { QueryEngine, parseSimple } from '../../src/core/query/index.js';

const FIXTURE_ROOT = '/tmp/trellis-query-stress-fixture';

describe('runQueryStress (fixture)', () => {
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    rmSync(FIXTURE_ROOT, { recursive: true, force: true });
    mkdirSync(FIXTURE_ROOT, { recursive: true });
    engine = new TrellisVcsEngine({ rootPath: FIXTURE_ROOT });
    await engine.initRepo({ indexWorkspace: false });
    engine.setCheckpointThreshold(0);

    const parentOp = await engine.createIssue('Parent epic', {
      status: 'queue',
      labels: ['query', 'fixture'],
    });
    const parentId = parentOp.vcs?.issueId!;
    await engine.createIssue('Child task', {
      status: 'in_progress',
      parentId,
    });
    await engine.recordDecision({
      toolName: 'test.query_stress',
      context: 'fixture decision',
      relatedEntities: [parentId],
    });
  });

  afterEach(() => {
    rmSync(FIXTURE_ROOT, { recursive: true, force: true });
  });

  test('passes full battery on seeded repo', () => {
    const report = runQueryStress(engine, FIXTURE_ROOT, {
      requireChildOf: true,
      requireDecisions: true,
    });
    expect(report.ok).toBe(true);
    expect(report.checks.every((c) => c.ok)).toBe(true);

    const childOf = report.checks.find((c) => c.name === 'link.childOf');
    expect(childOf?.detail).toMatch(/childOf/);

    const decisions = report.checks.find((c) => c.name === 'decision.projection');
    expect(decisions?.detail).toMatch(/Decision entities/);

    const labels = report.checks.find((c) => c.name === 'issue.labels_scalar');
    expect(labels?.detail).toMatch(/comma-separated string/);
  });

  test('formatQueryStressHints documents childOf and Decision adoption', () => {
    const hints = formatQueryStressHints();
    expect(hints.join('\n')).toMatch(/childOf/);
    expect(hints.join('\n')).toMatch(/parentOf/);
    expect(hints.join('\n')).toMatch(/recordDecision/);
    expect(hints.join('\n')).toMatch(/just check/);
  });

  test('childOf links are queryable via EQL-S', () => {
    const store = engine.getEavStore();
    const qe = new QueryEngine(store);
    const result = qe.execute(
      parseSimple('SELECT ?child ?parent WHERE { (?child "childOf" ?parent) }'),
    );
    expect(result.count).toBe(1);
  });

  test('parentOf returns empty (documents agent mistake)', () => {
    const store = engine.getEavStore();
    const qe = new QueryEngine(store);
    const result = qe.execute(
      parseSimple('SELECT ?child ?parent WHERE { (?child "parentOf" ?parent) }'),
    );
    expect(result.count).toBe(0);
  });
});

describe('runQueryStress (live desk repo)', () => {
  const deskRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

  test('passes on trellis-node when .trellis exists', () => {
    if (!existsSync(join(deskRoot, '.trellis', 'config.json'))) {
      return;
    }
    const engine = new TrellisVcsEngine({ rootPath: deskRoot });
    engine.open();
    const report = runQueryStress(engine, deskRoot, { budgetTokens: 4000 });
    expect(report.ok).toBe(true);
    const issues = report.checks.find((c) => c.name === 'issue.type');
    expect(issues?.detail).toMatch(/\d+ Issue entities/);
  });
});
