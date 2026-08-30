/**
 * Bible claims ontology — reified assertions with provenance.
 */
import { defineType, rel } from '../../src/schema/define.js';
import type { ProjectionDefinition } from '../../src/core/ontology/types.js';
import { z } from 'zod';

export const TRADITION_MATTHEW = 'bible:tradition/matthew-genealogy';
export const TRADITION_LUKE = 'bible:tradition/luke-genealogy';

export const Tradition = defineType(
  'Tradition',
  {
    name: z.string(),
    kind: z.enum(['gospel', 'genealogy', 'textual']),
  },
  {
    extends: 'core:Thing',
    label: 'Tradition',
  },
);
Tradition.definition['@id'] = 'bible:Tradition';

export const Passage = defineType(
  'Passage',
  {
    title: z.string(),
    book: z.string(),
    chapter: z.number(),
    verseStart: z.number(),
    verseEnd: z.number().optional(),
    tradition: z.enum(['MT', 'LXX', 'NA28']).optional(),
  },
  {
    extends: 'core:Document',
    title: 'title',
    label: 'Passage',
    relations: {
      cites: rel('Passage', 'many'),
    },
  },
);
Passage.definition['@id'] = 'bible:Passage';

const claimPredicate = z.enum(['begat', 'fatherOf', 'husbandOf']);

export const Claim = defineType(
  'Claim',
  {
    title: z.string(),
    predicate: claimPredicate,
    confidence: z.number().min(0).max(1).default(1),
    accordingToId: z.string(),
  },
  {
    extends: 'core:Record',
    title: 'title',
    label: 'Claim',
    relations: {
      subject: rel('Person'),
      object: rel('Person'),
      accordingTo: rel('Tradition'),
      cites: rel('Passage', 'many'),
      attacks: rel('Claim', 'many'),
    },
  },
);
Claim.definition['@id'] = 'bible:Claim';
Claim.definition.projections = ['bible:matthew-view', 'bible:luke-view'];
Claim.definition.defaultProjection = 'bible:matthew-view';

/** Worldview filters — denormalized `accordingToId` for EQL-S queryability. */
export const BIBLE_PROJECTIONS: Record<string, ProjectionDefinition> = {
  'bible:matthew-view': {
    '@id': 'bible:matthew-view',
    '@type': 'trellis:Projection',
    name: 'Matthew genealogy',
    type: 'Claim',
    query: `find ?e where type = "Claim" and accordingToId = "${TRADITION_MATTHEW}"`,
  },
  'bible:luke-view': {
    '@id': 'bible:luke-view',
    '@type': 'trellis:Projection',
    name: 'Luke genealogy',
    type: 'Claim',
    query: `find ?e where type = "Claim" and accordingToId = "${TRADITION_LUKE}"`,
  },
};

export const BIBLE_SCHEMAS = [
  Tradition.definition,
  Passage.definition,
  Claim.definition,
] as const;
