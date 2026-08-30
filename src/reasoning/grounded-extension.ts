/**
 * Dung grounded extension — minimal defensible claim set.
 *
 * An argument is IN when all its attackers are OUT; OUT when some attacker is IN.
 * Unresolved arguments in cyclic attack components stay undecided (excluded).
 */
import type { AttackEdge } from './attack-graph.js';

export interface GroundedExtensionResult {
  /** Claim IDs in the grounded extension. */
  accepted: Set<string>;
  /** Claim IDs defeated by an accepted attacker. */
  defeated: Set<string>;
  /** Claim IDs in unresolved attack cycles. */
  undecided: Set<string>;
}

export function computeGroundedExtension(
  claimIds: Iterable<string>,
  attacks: AttackEdge[],
): GroundedExtensionResult {
  const all = new Set(claimIds);
  const accepted = new Set<string>();
  const defeated = new Set<string>();
  const undecided = new Set(all);

  const attackerMap = new Map<string, Set<string>>();
  for (const { attacker, target } of attacks) {
    if (!all.has(attacker) || !all.has(target)) continue;
    let set = attackerMap.get(target);
    if (!set) {
      set = new Set();
      attackerMap.set(target, set);
    }
    set.add(attacker);
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const id of [...undecided]) {
      const attackers = attackerMap.get(id) ?? new Set<string>();
      if (attackers.size === 0) {
        accepted.add(id);
        undecided.delete(id);
        changed = true;
        continue;
      }
      if ([...attackers].every((a) => defeated.has(a))) {
        accepted.add(id);
        undecided.delete(id);
        changed = true;
      }
    }

    for (const id of [...undecided]) {
      const attackers = attackerMap.get(id) ?? new Set<string>();
      if ([...attackers].some((a) => accepted.has(a))) {
        defeated.add(id);
        undecided.delete(id);
        changed = true;
      }
    }
  }

  return { accepted, defeated, undecided };
}
