/**
 * Git Bridge — Public Surface
 */

export { GitReader } from './git-reader.js';
export { importFromGit } from './git-importer.js';
export { exportToGit } from './git-exporter.js';
export {
  syncIntegrationToGit,
  buildPromoteCommitMessage,
  resolveIntegrationHead,
  readGitSyncConfig,
} from './git-sync.js';
export type {
  GitSyncOptions,
  GitSyncResult,
  GitSyncConfig,
  PromoteCommitMessageParams,
} from './git-sync.js';
export type {
  ImportOptions,
  ImportResult,
  ImportProgress,
} from './git-importer.js';
export type {
  ExportOptions,
  ExportResult,
  ExportProgress,
} from './git-exporter.js';
export type {
  GitCommit,
  GitFileChange,
  GitCommitWithChanges,
} from './git-reader.js';
