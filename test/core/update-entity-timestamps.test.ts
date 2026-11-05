/**
 * updateEntity owns updatedAt only when the caller doesn't set it (KRN-517).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { BetterSqliteKernelBackend } from '../../src/core/persist/better-sqlite-backend.js';

describe('updateEntity updatedAt', () => {
  let dir: string;
  let kernel: TrellisKernel;

  const updatedAtFacts = (id: string) =>
    kernel
      .getStore()
      .getFactsByEntity(id)
      .filter((fact) => fact.a === 'updatedAt');

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'trellis-updated-at-'));
    kernel = new TrellisKernel({ backend: new BetterSqliteKernelBackend(join(dir, 'k.db')), agentId: 'agent:test' });
    kernel.boot();
    await kernel.createEntity('doc:1', 'RecordBody', { doc: '{}' });
  });

  afterEach(() => {
    kernel.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("keeps exactly the caller's updatedAt when one is passed", async () => {
    await kernel.updateEntity('doc:1', { doc: '{"a":1}', updatedAt: '2026-11-04T10:00:00.000Z' });
    await kernel.updateEntity('doc:1', { doc: '{"a":2}', updatedAt: '2026-11-04T11:00:00.000Z' });

    expect(updatedAtFacts('doc:1').map((fact) => fact.v)).toEqual(['2026-11-04T11:00:00.000Z']);
  });

  it('stamps one kernel updatedAt when the caller passes none', async () => {
    await kernel.updateEntity('doc:1', { doc: '{"a":1}' });
    await kernel.updateEntity('doc:1', { doc: '{"a":2}' });

    const facts = updatedAtFacts('doc:1');
    expect(facts).toHaveLength(1);
    expect(Number.isNaN(Date.parse(String(facts[0]!.v)))).toBe(false);
  });

  it('replaces a kernel stamp with a caller value, and the other way round', async () => {
    await kernel.updateEntity('doc:1', { doc: 'x' });
    await kernel.updateEntity('doc:1', { updatedAt: '2026-11-04T12:00:00.000Z' });
    expect(updatedAtFacts('doc:1').map((fact) => fact.v)).toEqual(['2026-11-04T12:00:00.000Z']);

    await kernel.updateEntity('doc:1', { doc: 'y' });
    const facts = updatedAtFacts('doc:1');
    expect(facts).toHaveLength(1);
    expect(facts[0]!.v).not.toBe('2026-11-04T12:00:00.000Z');
  });
});
