/**
 * Embedding Vector Store
 *
 * Persistent storage for embedding vectors using bun:sqlite.
 * Vectors are stored as Float32Array blobs; cosine similarity
 * is computed in JavaScript for cross-platform portability.
 *
 * @see TRL-18
 */

import type {
  ChunkMeta,
  ChunkType,
  EmbeddingRecord,
  SearchOptions,
  SearchResult,
} from './types.js';

// Lazy bun:sqlite loader — see comment in core/persist/sqlite-backend.ts
// re: why we avoid `import type` of bun:sqlite.
type Database = any;
type DatabaseCtor = new (path: string) => Database;

let _DatabaseCtor: DatabaseCtor | null = null;
function loadDatabaseCtor(): DatabaseCtor {
  if (_DatabaseCtor) return _DatabaseCtor;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createRequire } = require('module');
    const requireCJS = createRequire(import.meta.url);
    _DatabaseCtor = requireCJS('bun:sqlite').Database as DatabaseCtor;
    return _DatabaseCtor!;
  } catch {
    throw new Error(
      'EmbeddingStore requires the Bun runtime (built-in `bun:sqlite`). ' +
        'It is not available under Node/WebContainer.',
    );
  }
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  content TEXT NOT NULL,
  chunk_type TEXT NOT NULL,
  file_path TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vectors (
  id TEXT PRIMARY KEY,
  embedding BLOB NOT NULL,
  FOREIGN KEY (id) REFERENCES chunks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chunks_entity ON chunks(entity_id);
CREATE INDEX IF NOT EXISTS idx_chunks_type ON chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_chunks_file ON chunks(file_path);
`;

// ---------------------------------------------------------------------------
// Vector Store
// ---------------------------------------------------------------------------

export class VectorStore {
  private db: Database;

  constructor(dbPath: string) {
    const DatabaseCtor = loadDatabaseCtor();
    this.db = new DatabaseCtor(dbPath);
    this.db.exec('PRAGMA journal_mode=WAL;');
    this.db.exec('PRAGMA foreign_keys=ON;');
    this.db.exec(SCHEMA_SQL);
  }

  /**
   * Insert or update a chunk with its embedding vector.
   */
  upsert(record: EmbeddingRecord): void {
    const insertChunk = this.db.prepare(`
      INSERT OR REPLACE INTO chunks (id, entity_id, content, chunk_type, file_path, updated_at)
      VALUES ($id, $entityId, $content, $chunkType, $filePath, $updatedAt)
    `);
    const insertVector = this.db.prepare(`
      INSERT OR REPLACE INTO vectors (id, embedding)
      VALUES ($id, $embedding)
    `);

    const embeddingBlob = Buffer.from(record.embedding.buffer);

    this.db.transaction(() => {
      insertChunk.run({
        $id: record.id,
        $entityId: record.entityId,
        $content: record.content,
        $chunkType: record.chunkType,
        $filePath: record.filePath ?? null,
        $updatedAt: record.updatedAt,
      });
      insertVector.run({
        $id: record.id,
        $embedding: embeddingBlob,
      });
    })();
  }

  /**
   * Batch upsert multiple records.
   */
  upsertBatch(records: EmbeddingRecord[]): void {
    if (records.length === 0) return;

    const insertChunk = this.db.prepare(`
      INSERT OR REPLACE INTO chunks (id, entity_id, content, chunk_type, file_path, updated_at)
      VALUES ($id, $entityId, $content, $chunkType, $filePath, $updatedAt)
    `);
    const insertVector = this.db.prepare(`
      INSERT OR REPLACE INTO vectors (id, embedding)
      VALUES ($id, $embedding)
    `);

    this.db.transaction(() => {
      for (const record of records) {
        const embeddingBlob = Buffer.from(record.embedding.buffer);
        insertChunk.run({
          $id: record.id,
          $entityId: record.entityId,
          $content: record.content,
          $chunkType: record.chunkType,
          $filePath: record.filePath ?? null,
          $updatedAt: record.updatedAt,
        });
        insertVector.run({
          $id: record.id,
          $embedding: embeddingBlob,
        });
      }
    })();
  }

  /**
   * Delete a chunk and its vector by ID.
   */
  delete(id: string): void {
    this.db.prepare('DELETE FROM vectors WHERE id = ?').run(id);
    this.db.prepare('DELETE FROM chunks WHERE id = ?').run(id);
  }

  /**
   * Delete all chunks for an entity.
   */
  deleteByEntity(entityId: string): void {
    const ids = this.db
      .prepare('SELECT id FROM chunks WHERE entity_id = ?')
      .all(entityId) as Array<{ id: string }>;

    if (ids.length === 0) return;

    this.db.transaction(() => {
      for (const { id } of ids) {
        this.db.prepare('DELETE FROM vectors WHERE id = ?').run(id);
        this.db.prepare('DELETE FROM chunks WHERE id = ?').run(id);
      }
    })();
  }

  /**
   * Delete all chunks associated with a file path.
   */
  deleteByFile(filePath: string): void {
    const ids = this.db
      .prepare('SELECT id FROM chunks WHERE file_path = ?')
      .all(filePath) as Array<{ id: string }>;

    if (ids.length === 0) return;

    this.db.transaction(() => {
      for (const { id } of ids) {
        this.db.prepare('DELETE FROM vectors WHERE id = ?').run(id);
        this.db.prepare('DELETE FROM chunks WHERE id = ?').run(id);
      }
    })();
  }

  /**
   * Get a chunk by ID (without vector).
   */
  getChunk(id: string): ChunkMeta | null {
    const row = this.db
      .prepare('SELECT * FROM chunks WHERE id = ?')
      .get(id) as any;
    if (!row) return null;
    return rowToChunkMeta(row);
  }

  /**
   * Search for chunks similar to the query vector.
   * Uses brute-force cosine similarity scan.
   */
  search(queryVector: Float32Array, opts: SearchOptions = {}): SearchResult[] {
    const limit = opts.limit ?? 10;
    const minScore = opts.minScore ?? 0.0;

    // Build SQL filter
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (opts.types && opts.types.length > 0) {
      const placeholders = opts.types.map((_, i) => `$type${i}`).join(', ');
      conditions.push(`c.chunk_type IN (${placeholders})`);
      opts.types.forEach((t, i) => {
        params[`$type${i}`] = t;
      });
    }

    if (opts.filePrefix) {
      conditions.push('c.file_path LIKE $filePrefix');
      params.$filePrefix = `${opts.filePrefix}%`;
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT c.id, c.entity_id, c.content, c.chunk_type, c.file_path, c.updated_at,
             v.embedding
      FROM chunks c
      JOIN vectors v ON c.id = v.id
      ${where}
    `;

    const rows = this.db.prepare(sql).all(params as any) as any[];

    // Compute cosine similarity for each row
    const scored: SearchResult[] = [];
    for (const row of rows) {
      const storedVec = new Float32Array(
        (row.embedding as Buffer).buffer,
        (row.embedding as Buffer).byteOffset,
        (row.embedding as Buffer).byteLength / 4,
      );
      const score = cosineSimilarity(queryVector, storedVec);
      if (score >= minScore) {
        scored.push({
          chunk: rowToChunkMeta(row),
          score,
        });
      }
    }

    // Sort by score descending and limit
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /**
   * Get total count of chunks in the store.
   */
  count(): number {
    const row = this.db
      .prepare('SELECT COUNT(*) as cnt FROM chunks')
      .get() as any;
    return row?.cnt ?? 0;
  }

  /**
   * Get count by chunk type.
   */
  countByType(): Record<string, number> {
    const rows = this.db
      .prepare(
        'SELECT chunk_type, COUNT(*) as cnt FROM chunks GROUP BY chunk_type',
      )
      .all() as any[];
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.chunk_type] = row.cnt;
    }
    return result;
  }

  /**
   * Clear all data from the store.
   */
  clear(): void {
    this.db.exec('DELETE FROM vectors');
    this.db.exec('DELETE FROM chunks');
  }

  /**
   * Close the database connection.
   */
  close(): void {
    this.db.close();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToChunkMeta(row: any): ChunkMeta {
  return {
    id: row.id,
    entityId: row.entity_id,
    content: row.content,
    chunkType: row.chunk_type as ChunkType,
    filePath: row.file_path ?? undefined,
    updatedAt: row.updated_at,
  };
}

/**
 * Compute cosine similarity between two vectors.
 * Both vectors should already be normalized (output of mean pooling + normalize).
 * For normalized vectors, cosine similarity = dot product.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
