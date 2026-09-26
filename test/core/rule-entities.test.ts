/**
 * Rules as graph data (ADR 0047 §2): Rule entities are loaded by the engine
 * at query time and validated on write.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { BetterSqliteKernelBackend } from '../../src/core/persist/better-sqlite-backend.js';
import { variable, literal } from '../../src/core/query/types.js';
import type { Query } from '../../src/core/query/types.js';
import { unboundParams, unstratified, validateRules } from '../../src/core/query/rules.js';
import { parseRule } from '../../src/core/query/parser.js';

const q = (where: Query['where'], select: string[]): Query =>
  ({ select, where, filters: [], aggregates: [], orderBy: [], limit: 0, offset: 0 });
const reachFrom = (src: string) => q([{ kind: 'rule', name: 'reach', args: [literal(src), variable('y')] }], ['y']);

describe('Rule entities', () => {
  let dir: string;
  let kernel: TrellisKernel;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'rule-entities-'));
    kernel = new TrellisKernel({ backend: new BetterSqliteKernelBackend(join(dir, 'k.db')), agentId: 'agent:test' });
    kernel.boot();
    for (let i = 0; i < 5; i++) {
      await kernel.createEntity(`n:${i}`, 'Node', { name: `n${i}` }, i < 4 ? [{ attribute: 'next', targetEntityId: `n:${i + 1}` }] : []);
    }
  });
  afterEach(() => {
    kernel.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('kernel queries use rules stored as entities', async () => {
    expect((await kernel.query(reachFrom('n:0'))).count).toBe(0); // no rule yet
    await kernel.createEntity('rule:reach-base', 'Rule', { source: 'reach(?x, ?y) :- (?x "next" ?y)' });
    await kernel.createEntity('rule:reach-step', 'Rule', { source: 'reach(?x, ?y) :- (?x "next" ?z), reach(?z, ?y)' });
    const r = await kernel.query(reachFrom('n:0'));
    expect(r.bindings.map((b) => b.y).sort()).toEqual(['n:1', 'n:2', 'n:3', 'n:4']);
  });

  it('enabled: false switches a clause off without deleting it', async () => {
    await kernel.createEntity('rule:reach-base', 'Rule', { source: 'reach(?x, ?y) :- (?x "next" ?y)' });
    await kernel.createEntity('rule:reach-step', 'Rule', { source: 'reach(?x, ?y) :- (?x "next" ?z), reach(?z, ?y)' });
    await kernel.updateEntity('rule:reach-step', { enabled: false });
    expect((await kernel.query(reachFrom('n:0'))).bindings.map((b) => b.y)).toEqual(['n:1']);
    await kernel.updateEntity('rule:reach-step', { enabled: true });
    expect((await kernel.query(reachFrom('n:0'))).count).toBe(4);
  });

  it('rejects a rule that does not parse', async () => {
    await expect(kernel.createEntity('rule:bad', 'Rule', { source: 'reach(?x ?y :- nonsense' })).rejects.toThrow(/does not parse/);
    expect(kernel.getEntity('rule:bad')).toBeFalsy();
  });

  it('rejects a rule without a source', async () => {
    await expect(kernel.createEntity('rule:empty', 'Rule', { description: 'no source' })).rejects.toThrow(/needs a "source"/);
  });

  it('rejects a param the body never binds', async () => {
    await expect(kernel.createEntity('rule:unsafe', 'Rule', { source: 'bad(?x, ?unused) :- (?x "next" ?y)' }))
      .rejects.toThrow(/\?unused is not bound/);
  });

  it('rejects a write that would make negation go through recursion', async () => {
    await kernel.createEntity('rule:p', 'Rule', { source: 'p(?x) :- (?x "next" ?y), q(?y)' });
    await expect(kernel.createEntity('rule:q', 'Rule', { source: 'q(?x) :- [?x "name" ?n], NOT p(?x)' }))
      .rejects.toThrow(/unstratified negation/);
  });

  it('validates edits to an existing rule', async () => {
    await kernel.createEntity('rule:r', 'Rule', { source: 'r(?x, ?y) :- (?x "next" ?y)' });
    await expect(kernel.updateEntity('rule:r', { source: 'r(?x, ?q) :- (?x "next" ?y)' })).rejects.toThrow(/\?q is not bound/);
    expect((await kernel.query(q([{ kind: 'rule', name: 'r', args: [variable('a'), variable('b')] }], ['a']))).count).toBe(4);
  });

  it('allows stratified negation across rules', async () => {
    await kernel.createEntity('rule:reach-base', 'Rule', { source: 'reach(?x, ?y) :- (?x "next" ?y)' });
    await kernel.createEntity('rule:reach-step', 'Rule', { source: 'reach(?x, ?y) :- (?x "next" ?z), reach(?z, ?y)' });
    await kernel.createEntity('rule:root', 'Rule', { source: 'root(?x) :- [?x "type" "Node"], NOT reach(?p, ?x)' });
    const r = await kernel.query(q([{ kind: 'rule', name: 'root', args: [variable('x')] }], ['x']));
    expect(r.bindings.map((b) => b.x)).toEqual(['n:0']);
  });

  it('non-rule writes are untouched by the rule middleware', async () => {
    await kernel.createEntity('thing:1', 'Thing', { source: 'not a rule' });
    expect(kernel.getEntity('thing:1')).toBeTruthy();
  });
});

describe('static rule checks', () => {
  it('range restriction sees variables bound in every or-branch, not under not', () => {
    expect(unboundParams(parseRule('a(?x) :- (?x "next" ?y)'))).toEqual([]);
    expect(unboundParams(parseRule('a(?x) :- [?y "type" "Node"], NOT [?x "name" "n"]'))).toEqual(['x']);
  });

  it('finds negation through recursion but not across strata', () => {
    const stratified = [parseRule('b(?x) :- (?x "next" ?y)'), parseRule('c(?x) :- [?x "type" "Node"], NOT b(?x)')];
    expect(unstratified(stratified)).toEqual([]);
    expect(validateRules(stratified)).toEqual([]);
    const cyclic = [parseRule('p(?x) :- (?x "next" ?y), q(?y)'), parseRule('q(?x) :- [?x "name" ?n], NOT p(?x)')];
    expect(unstratified(cyclic)).toEqual([{ rule: 'q', negates: 'p' }]);
  });
});
