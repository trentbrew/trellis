/**
 * Rule middleware (ADR 0047 §2): validate `Rule` entities on write.
 *
 * A write that creates or changes a rule is rejected if the rule doesn't
 * parse, has a param its body never binds, or makes the stored program
 * unstratified (negation through recursion). Only problems the write
 * *introduces* block it, so a bad rule that arrived earlier (e.g. via sync)
 * doesn't wedge unrelated writes — the engine reports it when a query uses it.
 *
 * @module trellis/core
 */

import type { KernelOp } from '../persist/backend.js';
import type { EAVStore, Fact } from '../store/eav-store.js';
import type { DatalogRule } from '../query/types.js';
import { parseRule } from '../query/parser.js';
import { loadStoreRules, RULE_TYPE, validateRules } from '../query/rules.js';
import type { KernelMiddleware, MiddlewareContext, OpMiddlewareNext } from './middleware.js';

function lastOf(facts: Fact[], entity: string, attribute: string): Fact | undefined {
  const matches = facts.filter((f) => f.e === entity && f.a === attribute);
  return matches[matches.length - 1];
}

export function createRuleMiddleware(config: { getStore: () => EAVStore }): KernelMiddleware {
  return {
    name: 'rules',
    handleOp(op: KernelOp, ctx: MiddlewareContext, next: OpMiddlewareNext) {
      const facts = op.facts ?? [];
      const deleted = op.deleteFacts ?? [];
      if (!facts.length) return next(op, ctx);
      const store = config.getStore();

      // Rule entities this op creates, or existing ones whose source/enabled it changes.
      const touched = new Set<string>();
      for (const f of facts) {
        if (f.a === 'type' && f.v === RULE_TYPE) touched.add(f.e);
        else if ((f.a === 'source' || f.a === 'enabled')
          && store.getFactsByEntity(f.e).some((s) => s.a === 'type' && s.v === RULE_TYPE)) touched.add(f.e);
      }
      if (!touched.size) return next(op, ctx);

      const current = loadStoreRules(store);
      const others: DatalogRule[] = current.rules.filter((r) => !touched.has(r.entityId)).map((r) => r.rule);
      const incoming: DatalogRule[] = [];
      for (const entityId of touched) {
        const stored = store.getFactsByEntity(entityId);
        const sourceFact = lastOf(facts, entityId, 'source')
          ?? (deleted.some((d) => d.e === entityId && d.a === 'source') ? undefined : lastOf(stored, entityId, 'source'));
        const enabledFact = lastOf(facts, entityId, 'enabled') ?? lastOf(stored, entityId, 'enabled');
        const source = sourceFact?.v;
        if (typeof source !== 'string' || !source.trim()) {
          throw new Error(`Rule ${entityId} needs a "source" (EQL-S rule text, e.g. reach(?x, ?y) :- (?x "next" ?y))`);
        }
        let rule: DatalogRule;
        try {
          rule = parseRule(source);
        } catch (err) {
          throw new Error(`Rule ${entityId} does not parse: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (enabledFact?.v !== false) incoming.push(rule);
      }

      const before = new Set(validateRules(current.rules.map((r) => r.rule)));
      const introduced = validateRules([...others, ...incoming]).filter((e) => !before.has(e));
      if (introduced.length) throw new Error(`Invalid rule: ${introduced.join('; ')}`);
      return next(op, ctx);
    },
  };
}
