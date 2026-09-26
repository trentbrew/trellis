/**
 * Scaffold module index
 * @module trellis/scaffold
 */

export { inferProjectContext } from './infer.js';
export type { ProjectContext, InferenceConfidence, InferOptions } from './infer.js';

export {
  loadProfile,
  saveProfile,
  hasProfile,
  getProfile,
  updateProfile,
  appendLearning,
  removeLearning,
  setProfileFields,
  formatLearningsMarkdown,
  formatProfileContextText,
  profileContextStats,
  resolveProfileContextArm,
  shouldInjectProfileAtSession,
  shouldInjectProfileInPack,
  promptForProfile,
  MAX_PROFILE_LEARNINGS,
  MAX_LEARNING_FACT_LENGTH,
  AGENTS_MD_LEARNING_DISPLAY_LIMIT,
  DEFAULT_PROFILE_CONTEXT_BUDGET_CHARS,
  DEFAULT_PROFILE_CONTEXT_LEARNINGS_LIMIT,
} from './profile.js';
export type {
  UserProfile,
  ProfileLearning,
  ProfileLearningCategory,
  ProfileContextArm,
  ProfileContextStats,
  FormatProfileContextOptions,
  AppendLearningInput,
  ProfileFieldUpdates,
} from './profile.js';

export { writeAgentScaffold, writeIdeScaffold } from './write.js';
export type { AgentScaffoldConfig, ScaffoldInput, IdeScaffoldInput, IdeType, WorkspaceFootprint, FrameworkType } from './write.js';

export { seedContext } from './seed.js';
export type { SeedResult } from './seed.js';
