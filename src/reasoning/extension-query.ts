/**
 * Compose worldview filters with grounded-extension reasoning.
 */
import type { TrellisKernel } from '../core/kernel/trellis-kernel.js';
import { parseSimple } from '../core/query/parser.js';
import type { ProjectionDefinition } from '../core/ontology/types.js';
import { buildAttackGraph, type AttackEdge } from './attack-graph.js';
import {
  computeGroundedExtension,
  type GroundedExtensionResult,
} from './grounded-extension.js';

export interface ClaimSummary {
  id: string;
  title: string;
  accordingToId: string;
  predicate: string;
  subject?: string;
  object?: string;
}

function factValue(
  entity: { facts: Array<{ a: string; v: unknown }> },
  attr: string,
): unknown {
  return entity.facts.find((f) => f.a === attr)?.v;
}

export function listClaims(kernel: TrellisKernel): ClaimSummary[] {
  return kernel
    .listEntities('Claim')
    .map((entity) => ({
      id: entity.id,
      title: String(factValue(entity, 'title') ?? ''),
      accordingToId: String(factValue(entity, 'accordingToId') ?? ''),
      predicate: String(factValue(entity, 'predicate') ?? ''),
      subject: entity.links.find((l) => l.a === 'subject')?.e2,
      object: entity.links.find((l) => l.a === 'object')?.e2,
    }));
}

export function collectAttackEdges(kernel: TrellisKernel): AttackEdge[] {
  const claims = kernel.listEntities('Claim');
  const links = claims.flatMap((c) => c.links);
  return buildAttackGraph(links);
}

export function filterClaimsByProjection(
  claims: ClaimSummary[],
  projection: ProjectionDefinition,
): ClaimSummary[] {
  if (!projection.query) {
    return claims.filter((c) => c.accordingToId === projection['@id']);
  }

  const traditionMatch = projection.query.match(/accordingToId\s*=\s*"([^"]+)"/);
  if (traditionMatch) {
    return claims.filter((c) => c.accordingToId === traditionMatch[1]);
  }

  return claims;
}

export function filterClaimsByWorldview(
  claims: ClaimSummary[],
  worldviewId: string,
  projections: Record<string, ProjectionDefinition>,
): ClaimSummary[] {
  const projection = projections[worldviewId];
  if (!projection) {
    return claims.filter((c) => c.accordingToId === worldviewId);
  }
  return filterClaimsByProjection(claims, projection);
}

export async function queryClaimsByProjection(
  kernel: TrellisKernel,
  projection: ProjectionDefinition,
): Promise<ClaimSummary[]> {
  if (!projection.query) return listClaims(kernel);

  const result = await kernel.query(parseSimple(projection.query));
  const ids = new Set(
    result.bindings.map((b) => String(b.e ?? b['?e'] ?? '')).filter(Boolean),
  );

  return listClaims(kernel).filter((c) => ids.has(c.id));
}

export function computeWorldviewExtension(
  claims: ClaimSummary[],
  attacks: AttackEdge[],
  worldviewId?: string,
  projections?: Record<string, ProjectionDefinition>,
): GroundedExtensionResult & { claims: ClaimSummary[] } {
  const scoped =
    worldviewId && projections
      ? filterClaimsByWorldview(claims, worldviewId, projections)
      : claims;

  const scopedIds = new Set(scoped.map((c) => c.id));
  const scopedAttacks = attacks.filter(
    (a) => scopedIds.has(a.attacker) && scopedIds.has(a.target),
  );

  const extension = computeGroundedExtension(scopedIds, scopedAttacks);
  return { ...extension, claims: scoped };
}

export function extensionFromKernel(
  kernel: TrellisKernel,
  worldviewId: string,
  projections: Record<string, ProjectionDefinition>,
): GroundedExtensionResult & { claims: ClaimSummary[] } {
  const claims = listClaims(kernel);
  const attacks = collectAttackEdges(kernel);
  return computeWorldviewExtension(claims, attacks, worldviewId, projections);
}
