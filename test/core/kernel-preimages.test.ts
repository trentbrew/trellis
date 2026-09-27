/**
 * TRL-55 (turtleOS spike): does the kernel record prior values, so that undo
 * can be a compensating op built by swapping an op's adds and deletes?
 *
 * Pinned behavior:
 * - updateEntity / deleteEntity compute their deletes from the store, so the
 *   op carries exact pre-images (all values of a changed attribute, the old
 *   updatedAt, every outgoing and incoming link). The swapped op restores the
 *   store exactly, including after the op log is reloaded.
 * - The raw helpers (addFact / removeFact / addLink / removeLink) record the
 *   *request*, not the effect: a no-op add or delete is recorded as a real
 *   change, so its naive inverse would be wrong. Undo must either use the
 *   entity-level APIs or record effective changes.
 * - Deletes apply before adds, so an update to the same value keeps the fact.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { BetterSqliteKernelBackend } from '../../src/core/persist/better-sqlite-backend.js';

type Op = { facts?: any[]; links?: any[]; deleteFacts?: any[]; deleteLinks?: any[] };

describe('kernel pre-images (undo by compensating op)', () => {
  let dir: string;
  let kernel: TrellisKernel;
  const open = () => {
    const k = new TrellisKernel({ backend: new BetterSqliteKernelBackend(join(dir, 'k.db')), agentId: 'agent:test' });
    k.boot();
    return k;
  };
  const snapshot = (k: TrellisKernel) => {
    const s = k.getStore();
    const facts = s.getAllFacts().map((f) => JSON.stringify([f.e, f.a, f.v])).sort();
    const links = s.getAllLinks().map((l) => JSON.stringify([l.e1, l.a, l.e2])).sort();
    return { facts, links };
  };
  const lastOp = (k: TrellisKernel) => k.getLastOp() as unknown as Op;
  /** The naive inverse: swap adds and deletes. */
  const undo = (k: TrellisKernel, op: Op) => k.mutate('undo', {
    facts: op.deleteFacts ?? [], links: op.deleteLinks ?? [],
    deleteFacts: op.facts ?? [], deleteLinks: op.links ?? [],
  });

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'preimages-'));
    kernel = open();
    await kernel.createEntity('proc:a', 'Process', { pid: 1, state: 'running', cmd: 'sleep' }, [{ attribute: 'spawnedBy', targetEntityId: 'machine:m' }]);
    await kernel.createEntity('machine:m', 'Machine', { name: 'm' });
    await kernel.createEntity('alias:api', 'Alias', { name: 'api', target: 'proc:a' }, [{ attribute: 'ref:target', targetEntityId: 'proc:a' }]);
  });
  afterEach(() => {
    kernel.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('updateEntity records every prior value of changed attributes, and the swapped op restores the store', async () => {
    await kernel.addFact('proc:a', 'tag', 'x');
    await kernel.addFact('proc:a', 'tag', 'y'); // multi-valued
    const before = snapshot(kernel);
    await kernel.updateEntity('proc:a', { state: 'exited', tag: 'z' });
    const op = lastOp(kernel);
    const deleted = (op.deleteFacts ?? []).map((f) => `${f.a}=${f.v}`).sort();
    expect(deleted).toEqual(expect.arrayContaining(['state=running', 'tag=x', 'tag=y']));
    await undo(kernel, op);
    expect(snapshot(kernel)).toEqual(before);
  });

  it('a later update also records the previous updatedAt (createEntity sets none)', async () => {
    await kernel.updateEntity('proc:a', { state: 'exited' });
    const first = kernel.getEntity('proc:a')!.facts.find((f) => f.a === 'updatedAt')!.v;
    const before = snapshot(kernel);
    await kernel.updateEntity('proc:a', { state: 'failed' });
    const op = lastOp(kernel);
    expect((op.deleteFacts ?? []).some((f) => f.a === 'updatedAt' && f.v === first)).toBe(true);
    await undo(kernel, op);
    expect(snapshot(kernel)).toEqual(before);
  });

  it('deleteEntity records all facts and both outgoing and incoming links; the swapped op restores the entity', async () => {
    const before = snapshot(kernel);
    await kernel.deleteEntity('proc:a');
    const op = lastOp(kernel);
    const links = (op.deleteLinks ?? []).map((l) => `${l.e1} ${l.a} ${l.e2}`).sort();
    expect(links).toEqual(['alias:api ref:target proc:a', 'proc:a spawnedBy machine:m']);
    expect(kernel.getEntity('proc:a')).toBeFalsy();
    await undo(kernel, op);
    expect(snapshot(kernel)).toEqual(before);
  });

  it('pre-images survive the persisted op log (reload, then undo)', async () => {
    const before = snapshot(kernel);
    await kernel.updateEntity('proc:a', { state: 'failed' });
    kernel.close();
    kernel = open();
    const ops = kernel.readAllOps() as unknown as Op[];
    const op = ops[ops.length - 1]!;
    expect((op.deleteFacts ?? []).some((f) => f.a === 'state' && f.v === 'running')).toBe(true);
    await undo(kernel, op);
    expect(snapshot(kernel)).toEqual(before);
  });

  it('an update to the same value keeps the fact (deletes apply before adds)', async () => {
    await kernel.updateEntity('proc:a', { state: 'running' });
    expect(kernel.getEntity('proc:a')!.facts.filter((f) => f.a === 'state').map((f) => f.v)).toEqual(['running']);
  });

  it('raw helpers record the request, not the effect: a naive inverse of a no-op is wrong', async () => {
    // Adding a fact that already exists changes nothing, but is recorded as an add…
    await kernel.addFact('proc:a', 'cmd', 'sleep');
    const addOp = lastOp(kernel);
    expect(addOp.facts?.map((f) => `${f.a}=${f.v}`)).toEqual(['cmd=sleep']);
    // …so swapping it would delete a fact that existed before the command.
    await undo(kernel, addOp);
    expect(kernel.getEntity('proc:a')!.facts.some((f) => f.a === 'cmd')).toBe(false);

    // Removing a fact that isn't there is recorded as a delete; swapping it invents one.
    await kernel.removeFact('proc:a', 'ghost', 'boo');
    const rmOp = lastOp(kernel);
    expect(rmOp.deleteFacts?.map((f) => `${f.a}=${f.v}`)).toEqual(['ghost=boo']);
    await undo(kernel, rmOp);
    expect(kernel.getEntity('proc:a')!.facts.some((f) => f.a === 'ghost')).toBe(true);
  });
});
