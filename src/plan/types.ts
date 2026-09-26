/**
 * Plan artifact types — cross-IDE plan capture → repo-durable ADR-shaped docs.
 */

export type PlanOrigin =
  | 'cursor'
  | 'claude'
  | 'opencode'
  | 'antigravity'
  | 'gemini'
  | 'codex'
  | 'path';

export type PlanArtifactStatus = 'proposed' | 'accepted' | 'superseded' | 'rejected';

export interface PlanSourceProvenance {
  tool: PlanOrigin;
  path: string;
  capturedAt: string;
  session?: string;
}

export interface PlanArtifactFrontmatter {
  name?: string;
  status: PlanArtifactStatus;
  issue?: string;
  date: string;
  overview?: string;
  depends_on?: string[];
  source?: PlanSourceProvenance;
  /** Preserved from Cursor plan mode */
  todos?: Array<{
    id: string;
    content: string;
    status?: string;
  }>;
  isProject?: boolean;
}

export interface PlanOriginDescriptor {
  id: PlanOrigin;
  label: string;
  defaultGlob: string;
  scope: 'user-global' | 'repo-local' | 'session-jsonl';
  notes: string;
}

export interface CapturePlanOptions {
  rootPath: string;
  issueId: string;
  origin: PlanOrigin;
  sourcePath?: string;
  /** Antigravity brain session uuid or Codex rollout basename */
  session?: string;
  status?: PlanArtifactStatus;
  title?: string;
  overwrite?: boolean;
  dryRun?: boolean;
  homeDir?: string;
}

export interface CapturePlanResult {
  relPath: string;
  absPath: string;
  sourcePath: string;
  linkedIssue: string;
  created: boolean;
}
