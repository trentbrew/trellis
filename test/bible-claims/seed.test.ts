/**
 * Bible genealogy seed — idempotency and per-tradition EQL queries.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { BetterSqliteKernelBackend } from '../../src/core/persist/better-sqlite-backend.js';
import { parseSimple } from '../../src/core/query/parser.js';
import {
  BIBLE_PROJECTIONS,
  TRADITION_LUKE,
  TRADITION_MATTHEW,
  MATTHEW_BEGATS,
  LUKE_BEGATS,
  seedGenealogies,
} from '../../examples/bible-claims/index.js';
import {
  extensionFromKernel,
  queryClaimsByProjection,
  listClaims,
  collectAttackEdges,
  computeWorldviewExtension,
} from '../../src/reasoning/extension-query.js';
import { computeGroundedExtension } from '../../src/reasoning/grounded-extension.js';

describe('bible genealogy seed', () => {
  let tmpDir: string;
  let kernel: TrellisKernel;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'trellis-bible-seed-'));
    kernel = new TrellisKernel({
      backend: new BetterSqliteKernelBackend(join(tmpDir, 'kernel.db')),
      agentId: 'test',
      snapshotThreshold: 0,
    });
    kernel.boot();
  });

  afterEach(() => {
    kernel.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test('seed is idempotent', async () => {
    const first = await seedGenealogies(kernel);
    const second = await seedGenealogies(kernel);

    expect(first.claimsCreated).toBe(MATTHEW_BEGATS.length + LUKE_BEGATS.length);
    expect(first.attacksLinked).toBeGreaterThan(0);
    expect(second.claimsCreated).toBe(0);
    expect(second.personsCreated).toBe(0);
    expect(second.traditionsCreated).toBe(0);
    expect(second.attacksLinked).toBe(0);
  });

  test('EQL filters claims by Matthew tradition', async () => {
    await seedGenealogies(kernel);

    const qr = await kernel.query(
      parseSimple(
        `find ?e where type = "Claim" and accordingToId = "${TRADITION_MATTHEW}"`,
      ),
    );

    expect(qr.bindings).toHaveLength(MATTHEW_BEGATS.length);
  });

  test('EQL filters claims by Luke tradition', async () => {
    await seedGenealogies(kernel);

    const qr = await kernel.query(
      parseSimple(
        `find ?e where type = "Claim" and accordingToId = "${TRADITION_LUKE}"`,
      ),
    );

    expect(qr.bindings).toHaveLength(LUKE_BEGATS.length);
  });

  test('projection query returns tradition-scoped claims', async () => {
    await seedGenealogies(kernel);

    const matthew = await queryClaimsByProjection(
      kernel,
      BIBLE_PROJECTIONS['bible:matthew-view'],
    );
    const luke = await queryClaimsByProjection(
      kernel,
      BIBLE_PROJECTIONS['bible:luke-view'],
    );

    expect(matthew).toHaveLength(MATTHEW_BEGATS.length);
    expect(luke).toHaveLength(LUKE_BEGATS.length);
    expect(matthew.every((c) => c.accordingToId === TRADITION_MATTHEW)).toBe(true);
    expect(luke.every((c) => c.accordingToId === TRADITION_LUKE)).toBe(true);
  });

  test('Joseph father conflict resolves per worldview extension', async () => {
    await seedGenealogies(kernel);

    const matthew = extensionFromKernel(
      kernel,
      'bible:matthew-view',
      BIBLE_PROJECTIONS,
    );
    const luke = extensionFromKernel(
      kernel,
      'bible:luke-view',
      BIBLE_PROJECTIONS,
    );

    expect(matthew.accepted.has('claim:matthew/jacob-mattan-joseph')).toBe(true);
    expect(luke.accepted.has('claim:luke/heli-joseph')).toBe(true);

    // Cross-tradition attacks are out of scope per worldview filter.
    expect(matthew.defeated.size).toBe(0);
    expect(luke.defeated.size).toBe(0);
  });

  test('shared ancestor claims appear in both traditions', async () => {
    await seedGenealogies(kernel);

    const matthew = await queryClaimsByProjection(
      kernel,
      BIBLE_PROJECTIONS['bible:matthew-view'],
    );
    const luke = await queryClaimsByProjection(
      kernel,
      BIBLE_PROJECTIONS['bible:luke-view'],
    );

    const matthewTitles = new Set(matthew.map((c) => c.title));
    const lukeTitles = new Set(luke.map((c) => c.title));

    expect(matthewTitles.has('Abraham begat Isaac')).toBe(true);
    expect(lukeTitles.has('Abraham begat Isaac')).toBe(true);
  });

  test('mutual Joseph-father attacks stay undecided in global extension', async () => {
    await seedGenealogies(kernel);

    const claims = listClaims(kernel);
    const attacks = collectAttackEdges(kernel);
    const result = computeGroundedExtension(
      claims.map((c) => c.id),
      attacks,
    );

    expect(result.undecided.has('claim:matthew/jacob-mattan-joseph')).toBe(true);
    expect(result.undecided.has('claim:luke/heli-joseph')).toBe(true);
    expect(result.accepted.size).toBeGreaterThan(0);
  });

  test('computeWorldviewExtension scopes attacks to tradition', async () => {
    await seedGenealogies(kernel);
    const claims = listClaims(kernel);
    const attacks = collectAttackEdges(kernel);

    const matthew = computeWorldviewExtension(
      claims,
      attacks,
      'bible:matthew-view',
      BIBLE_PROJECTIONS,
    );
    expect(matthew.claims).toHaveLength(MATTHEW_BEGATS.length);
    expect(matthew.accepted.size).toBe(MATTHEW_BEGATS.length);
  });
});
