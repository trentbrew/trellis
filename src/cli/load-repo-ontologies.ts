import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import {
  OntologyRegistry,
  builtinOntologies,
  type OntologySchema,
} from '../core/ontology/index.js';

/**
 * Load legacy OntologySchema JSON files from `<repo>/ontologies/*.json`.
 * Used by ~/.notion and other workspaces to register domain ontologies without
 * patching trellis-node builtins.
 */
export function loadRepoOntologies(rootPath: string): OntologySchema[] {
  const dir = join(rootPath, 'ontologies');
  if (!existsSync(dir)) return [];

  const schemas: OntologySchema[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    const filePath = join(dir, name);
    try {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as OntologySchema;
      if (parsed?.id && parsed?.entities) schemas.push(parsed);
    } catch {
      // skip invalid files
    }
  }
  return schemas;
}

export function createOntologyRegistry(rootPath?: string): OntologyRegistry {
  const registry = new OntologyRegistry();
  for (const o of builtinOntologies) registry.register(o);
  if (rootPath) {
    for (const o of loadRepoOntologies(rootPath)) registry.register(o);
  }
  return registry;
}
