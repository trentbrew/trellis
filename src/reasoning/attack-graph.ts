/**
 * Attack graph — directed defeat relation among claim IDs.
 */
export interface AttackEdge {
  attacker: string;
  target: string;
}

export function buildAttackGraph(
  links: Array<{ e1: string; a: string; e2: string }>,
): AttackEdge[] {
  return links
    .filter((l) => l.a === 'attacks')
    .map((l) => ({ attacker: l.e1, target: l.e2 }));
}

export function attackersOf(
  claimId: string,
  attacks: AttackEdge[],
): string[] {
  return attacks.filter((a) => a.target === claimId).map((a) => a.attacker);
}

export function outgoingAttacks(
  claimId: string,
  attacks: AttackEdge[],
): string[] {
  return attacks.filter((a) => a.attacker === claimId).map((a) => a.target);
}
