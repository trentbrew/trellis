import type { DAGRunStep } from './dag-scheduler.js';

export interface EdgeConditionContext {
  sourceStep: DAGRunStep;
}

export function evaluateCondition(condition: string, ctx: EdgeConditionContext): boolean {
  const trimmed = condition.trim();
  if (!trimmed || trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  const { sourceStep } = ctx;

  const statusEq = trimmed.match(/^status\s*==\s*"(.+)"$/);
  if (statusEq) return sourceStep.status === statusEq[1];

  const statusNeq = trimmed.match(/^status\s*!=\s*"(.+)"$/);
  if (statusNeq) return sourceStep.status !== statusNeq[1];

  const outputContains = trimmed.match(/^output\s+contains\s+"(.+)"$/);
  if (outputContains) return (sourceStep.result ?? '').includes(outputContains[1]);

  const outputMatches = trimmed.match(/^output\s+matches\s+"(.+)"$/);
  if (outputMatches) {
    try {
      return new RegExp(outputMatches[1]).test(sourceStep.result ?? '');
    } catch {
      return false;
    }
  }

  return false;
}

export interface EdgeResult {
  passed: boolean;
  condition?: string;
}

export function evaluateEdge(
  fromStep: DAGRunStep,
  condition: string | undefined,
): EdgeResult {
  if (!condition || condition.trim() === '') return { passed: true };
  const passed = evaluateCondition(condition, { sourceStep: fromStep });
  return { passed, condition };
}
