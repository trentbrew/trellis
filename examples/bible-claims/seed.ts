/**
 * Idempotent Bible genealogy seed for TrellisKernel.
 */
import type { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import type { SchemaDefinition } from '../../src/core/ontology/types.js';
import {
  BIBLE_SCHEMAS,
  TRADITION_LUKE,
  TRADITION_MATTHEW,
} from './schemas.js';
import {
  ATTACK_PAIRS,
  LUKE_BEGATS,
  MATTHEW_BEGATS,
  PERSONS,
  TRADITIONS,
  type BegatEdge,
} from './genealogies.js';

export interface SeedResult {
  ontologiesRegistered: number;
  personsCreated: number;
  traditionsCreated: number;
  claimsCreated: number;
  attacksLinked: number;
}

function upsertOntology(kernel: TrellisKernel, schema: SchemaDefinition): boolean {
  try {
    kernel.createOntology(schema);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('already exists')) throw err;
    kernel.updateOntology(schema['@id'], {
      fields: schema.fields,
      projections: schema.projections,
      defaultProjection: schema.defaultProjection,
    });
    return false;
  }
}

function entityExists(kernel: TrellisKernel, id: string): boolean {
  return kernel.getEntity(id) !== null;
}

function begatTitle(fatherId: string, sonId: string, persons: Map<string, string>): string {
  const father = persons.get(fatherId) ?? fatherId;
  const son = persons.get(sonId) ?? sonId;
  return `${father} begat ${son}`;
}

async function seedBegats(
  kernel: TrellisKernel,
  edges: BegatEdge[],
  traditionId: string,
  nameById: Map<string, string>,
): Promise<number> {
  let created = 0;
  for (const edge of edges) {
    if (entityExists(kernel, edge.id)) continue;

    const title = begatTitle(edge.father, edge.son, nameById);
    await kernel.createEntity(
      edge.id,
      'Claim',
      {
        title,
        predicate: 'begat',
        confidence: 1,
        accordingToId: traditionId,
        subject: edge.father,
        object: edge.son,
        accordingTo: traditionId,
      },
      [
        { attribute: 'subject', targetEntityId: edge.father },
        { attribute: 'object', targetEntityId: edge.son },
        { attribute: 'accordingTo', targetEntityId: traditionId },
      ],
    );

    await kernel.addFact(edge.id, 'citationUri', edge.passageUri, undefined, {
      sources: [{ location: { uri: edge.passageUri } }],
      confidence: 1,
    });

    created++;
  }
  return created;
}

export async function registerBibleOntologies(kernel: TrellisKernel): Promise<number> {
  let registered = 0;
  for (const schema of BIBLE_SCHEMAS) {
    if (upsertOntology(kernel, schema)) registered++;
  }
  return registered;
}

export async function seedGenealogies(kernel: TrellisKernel): Promise<SeedResult> {
  const ontologiesRegistered = await registerBibleOntologies(kernel);

  const nameById = new Map(PERSONS.map((p) => [p.id, p.name]));
  let personsCreated = 0;
  for (const person of PERSONS) {
    if (entityExists(kernel, person.id)) continue;
    await kernel.createEntity(person.id, 'Person', { name: person.name });
    personsCreated++;
  }

  let traditionsCreated = 0;
  for (const tradition of TRADITIONS) {
    if (entityExists(kernel, tradition.id)) continue;
    await kernel.createEntity(tradition.id, 'Tradition', {
      name: tradition.name,
      kind: tradition.kind,
    });
    traditionsCreated++;
  }

  const matthewClaims = await seedBegats(
    kernel,
    MATTHEW_BEGATS,
    TRADITION_MATTHEW,
    nameById,
  );
  const lukeClaims = await seedBegats(
    kernel,
    LUKE_BEGATS,
    TRADITION_LUKE,
    nameById,
  );

  let attacksLinked = 0;
  for (const [attacker, target] of ATTACK_PAIRS) {
    const entity = kernel.getEntity(attacker);
    if (!entity) continue;
    const already = entity.links.some(
      (l) => l.a === 'attacks' && l.e2 === target,
    );
    if (already) continue;
    await kernel.addLink(attacker, 'attacks', target);
    attacksLinked++;
  }

  return {
    ontologiesRegistered,
    personsCreated,
    traditionsCreated,
    claimsCreated: matthewClaims + lukeClaims,
    attacksLinked,
  };
}
