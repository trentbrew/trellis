import type { SchemaDefinition, PropertyValueSpecification } from '../core/ontology/types.js';
import type { TrellisKernel } from '../core/kernel/trellis-kernel.js';
import type { LockfileData, LockedSchema } from './lockfile.js';
import { readLockfile } from './lockfile.js';
import type { RegistryClient, PackageManifest } from './client.js';

export interface SchemaDiff {
  schemaId: string;
  oldVersion: string;
  newVersion: string;
  addedFields: PropertyValueSpecification[];
  removedFields: PropertyValueSpecification[];
  changedFields: Array<{ name: string; from: string; to: string }>;
  compatible: boolean;
  reason?: string;
}

export interface MigrationReport {
  migrated: string[];
  skipped: string[];
  incompatible: string[];
  errors: string[];
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function findFieldsByName(current: PropertyValueSpecification[], name: string): PropertyValueSpecification[] {
  return current.filter(f => f.name === name);
}

export function compareSchemas(
  current: SchemaDefinition,
  pinned: LockedSchema,
  newFields?: PropertyValueSpecification[],
): SchemaDiff {
  const diff: SchemaDiff = {
    schemaId: current['@id'],
    oldVersion: current.version,
    newVersion: pinned.version,
    addedFields: [],
    removedFields: [],
    changedFields: [],
    compatible: true,
  };

  if (current.version === pinned.version) {
    return diff;
  }

  if (compareVersions(current.version, pinned.version) > 0) {
    diff.compatible = false;
    diff.reason = `Current version (${current.version}) is newer than pinned (${pinned.version}) — downgrade not supported`;
    return diff;
  }

  if (newFields && newFields.length > 0) {
    const currentNames = new Set(current.fields.map(f => f.name));

    for (const pf of newFields) {
      const existing = findFieldsByName(current.fields, pf.name);
      if (existing.length === 0) {
        diff.addedFields.push(pf);
      } else {
        const match = existing[0];
        if (match.valueType !== pf.valueType) {
          diff.compatible = false;
          diff.reason = `Field ${pf.name} type changed from ${match.valueType} to ${pf.valueType}`;
          diff.changedFields.push({ name: pf.name, from: String(match.valueType), to: String(pf.valueType) });
        } else if (pf.required && !match.required) {
          diff.changedFields.push({ name: pf.name, from: 'optional', to: 'required' });
        }
      }
    }

    const newNames = new Set(newFields.map(f => f.name));
    for (const cf of current.fields) {
      if (!newNames.has(cf.name)) {
        diff.removedFields.push(cf);
        if (diff.compatible) {
          diff.compatible = false;
          diff.reason = `Field ${cf.name} removed in new version`;
        }
      }
    }
  }

  return diff;
}

export function applyMigration(
  kernel: TrellisKernel,
  diff: SchemaDiff,
  newFields?: PropertyValueSpecification[],
): void {
  const current = kernel.getOntology(diff.schemaId);
  if (!current) {
    throw new Error(`Schema ${diff.schemaId} not found in graph`);
  }

  let mergedFields = [...current.fields];
  if (newFields && diff.addedFields.length > 0) {
    const existingNames = new Set(current.fields.map(f => f.name));
    for (const f of diff.addedFields) {
      if (!existingNames.has(f.name)) {
        mergedFields.push(f);
      }
    }
  }

  kernel.updateOntology(diff.schemaId, {
    version: diff.newVersion,
    fields: mergedFields,
  });

  const migrationFact = {
    e: diff.schemaId,
    a: 'migration',
    v: JSON.stringify({
      from: diff.oldVersion,
      to: diff.newVersion,
      at: new Date().toISOString(),
      fieldsAdded: diff.addedFields.map(f => f.name),
      changes: diff.changedFields.length > 0 ? diff.changedFields : undefined,
    }),
  };

  (kernel as any).store?.addFacts?.([migrationFact]);
}

export function migrateLockfileSchemas(
  kernel: TrellisKernel,
  lockfile: LockfileData,
  client?: RegistryClient,
  scopeFilter?: string,
  dryRun?: boolean,
): MigrationReport {
  const report: MigrationReport = {
    migrated: [],
    skipped: [],
    incompatible: [],
    errors: [],
  };

  for (const [pkgName, pkgEntry] of Object.entries(lockfile.resolved)) {
    if (scopeFilter && !pkgName.includes(scopeFilter)) {
      continue;
    }

    for (const [schemaId, locked] of Object.entries(pkgEntry.schemas)) {
      try {
        const current = kernel.getOntology(schemaId);
        if (!current) {
          report.errors.push(`${schemaId}: not found in graph — skipping`);
          continue;
        }

        const diff = compareSchemas(current, locked);
        if (!diff.compatible) {
          report.incompatible.push(schemaId);
          continue;
        }

        if (diff.oldVersion === diff.newVersion) {
          report.skipped.push(schemaId);
          continue;
        }

        if (!dryRun) {
          if (diff.addedFields.length > 0 || diff.changedFields.length > 0) {
            applyMigration(kernel, diff, diff.addedFields);
          } else {
            applyMigration(kernel, diff);
          }
        }
        report.migrated.push(schemaId);
      } catch (err: any) {
        report.errors.push(`${schemaId}: ${err.message}`);
      }
    }
  }

  return report;
}

export function createMigrateHandler(rootPath: string, kernel: TrellisKernel, client?: RegistryClient, scope?: string, dryRun?: boolean): MigrationReport {
  const lockfile = readLockfile(rootPath);

  if (!lockfile) {
    return {
      migrated: [],
      skipped: [],
      incompatible: [],
      errors: ['No lockfile found'],
    };
  }

  return migrateLockfileSchemas(kernel, lockfile, client, scope, dryRun);
}
