export {
  buildAttackGraph,
  attackersOf,
  outgoingAttacks,
  type AttackEdge,
} from './attack-graph.js';

export {
  computeGroundedExtension,
  type GroundedExtensionResult,
} from './grounded-extension.js';

export {
  collectAttackEdges,
  computeWorldviewExtension,
  extensionFromKernel,
  filterClaimsByProjection,
  filterClaimsByWorldview,
  listClaims,
  queryClaimsByProjection,
  type ClaimSummary,
} from './extension-query.js';
