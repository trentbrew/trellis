/**
 * Global User Profile
 *
 * Manages a persistent user profile stored at ~/.trellis/profile.json.
 * This profile is captured once on first-ever Trellis use and injected
 * into every repo's agent scaffold to provide personal context to AI tools.
 *
 * The profile is a *soft metadata* layer distinct from the cryptographic
 * identity in `src/identity/`. If an identity already exists for the repo,
 * the profile prompt pre-fills the name from `identity.displayName`.
 *
 * @module trellis/scaffold/profile
 */

import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { trellisUserDir } from '../identity/identity.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProfileLearningCategory =
  | 'preference'
  | 'context'
  | 'style'
  | 'skill'
  | 'other';

export interface ProfileLearning {
  id: string;
  fact: string;
  category?: ProfileLearningCategory;
  source?: string;
  addedAt: string;
  addedBy?: string;
}

export interface UserProfile {
  name: string;
  bio: string;
  skills: string[];
  style: string;
  preferences: {
    verbosity: 'concise' | 'detailed' | 'balanced';
    tone: 'peer' | 'mentor' | 'formal';
  };
  learnings?: ProfileLearning[];
  createdAt: string;
  updatedAt: string;
}

export const MAX_PROFILE_LEARNINGS = 100;
export const MAX_LEARNING_FACT_LENGTH = 500;
export const AGENTS_MD_LEARNING_DISPLAY_LIMIT = 20;
export const DEFAULT_PROFILE_CONTEXT_BUDGET_CHARS = 800;
export const DEFAULT_PROFILE_CONTEXT_LEARNINGS_LIMIT = 8;

export type ProfileContextArm = 'off' | 'session' | 'pack' | 'both';

export interface ProfileContextStats {
  learningsCount: number;
  chars: number;
  updatedAt: string | null;
}

export type FormatProfileContextOptions = {
  budgetChars?: number;
  learningsLimit?: number;
};

export type AppendLearningInput = {
  fact: string;
  category?: ProfileLearningCategory;
  source?: string;
  addedBy?: string;
};

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function getProfileDir(): string {
  return trellisUserDir();
}

function getProfilePath(): string {
  return join(getProfileDir(), 'profile.json');
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Load the global user profile, or null if not yet created.
 */
export function loadProfile(): UserProfile | null {
  const profilePath = getProfilePath();
  if (!existsSync(profilePath)) return null;
  try {
    const raw = readFileSync(profilePath, 'utf-8');
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

/**
 * Save (or overwrite) the global user profile.
 */
export function saveProfile(profile: UserProfile): void {
  const dir = getProfileDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getProfilePath(), JSON.stringify(profile, null, 2));
}

/**
 * Returns true if a global profile exists.
 */
export function hasProfile(): boolean {
  return existsSync(getProfilePath());
}

function emptyProfileBase(): UserProfile {
  const now = new Date().toISOString();
  return {
    name: 'Unknown',
    bio: '',
    skills: [],
    style: '',
    preferences: { verbosity: 'balanced', tone: 'peer' },
    learnings: [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeLearningFact(fact: string): string {
  return fact.trim().replace(/\s+/g, ' ');
}

function learningFactKey(fact: string): string {
  return normalizeLearningFact(fact).toLowerCase();
}

function withDefaultLearnings(profile: UserProfile): UserProfile {
  return {
    ...profile,
    learnings: profile.learnings ?? [],
  };
}

/**
 * Load profile with `learnings` normalized to an array (empty when absent).
 */
export function getProfile(): UserProfile | null {
  const profile = loadProfile();
  if (!profile) return null;
  return withDefaultLearnings(profile);
}

/**
 * Append an agent- or CLI-captured learning. Dedupes by normalized fact text
 * and caps total learnings at {@link MAX_PROFILE_LEARNINGS}.
 */
export function appendLearning(input: AppendLearningInput): UserProfile {
  const fact = normalizeLearningFact(input.fact);
  if (!fact) {
    throw new Error('Learning fact cannot be empty.');
  }
  if (fact.length > MAX_LEARNING_FACT_LENGTH) {
    throw new Error(
      `Learning fact exceeds ${MAX_LEARNING_FACT_LENGTH} characters.`,
    );
  }

  const base = withDefaultLearnings(getProfile() ?? emptyProfileBase());
  const key = learningFactKey(fact);
  const existing = base.learnings!.find((l) => learningFactKey(l.fact) === key);
  if (existing) {
    return base;
  }

  const learning: ProfileLearning = {
    id: randomUUID().slice(0, 8),
    fact,
    category: input.category,
    source: input.source,
    addedAt: new Date().toISOString(),
    addedBy: input.addedBy,
  };

  let learnings = [...base.learnings!, learning];
  if (learnings.length > MAX_PROFILE_LEARNINGS) {
    learnings = learnings.slice(learnings.length - MAX_PROFILE_LEARNINGS);
  }

  const updated: UserProfile = {
    ...base,
    learnings,
    updatedAt: new Date().toISOString(),
  };
  saveProfile(updated);
  return updated;
}

/**
 * Remove a learning by id. CLI-only surface; agents cannot call this.
 */
export function removeLearning(id: string): UserProfile {
  const base = getProfile();
  if (!base) {
    throw new Error('No profile exists.');
  }

  const learnings = base.learnings ?? [];
  const next = learnings.filter((l) => l.id !== id);
  if (next.length === learnings.length) {
    throw new Error(`Learning not found: ${id}`);
  }

  const updated: UserProfile = {
    ...base,
    learnings: next,
    updatedAt: new Date().toISOString(),
  };
  saveProfile(updated);
  return updated;
}

export type ProfileFieldUpdates = Partial<
  Pick<UserProfile, 'name' | 'bio' | 'skills' | 'style'> & {
    preferences: Partial<UserProfile['preferences']>;
  }
>;

/**
 * Update human-owned core profile fields (not learnings).
 */
export function setProfileFields(updates: ProfileFieldUpdates): UserProfile {
  return updateProfile(updates);
}

/** Resolve profile context injection arm from env (default off). */
export function resolveProfileContextArm(
  env: NodeJS.ProcessEnv = process.env,
): ProfileContextArm {
  const raw = String(env.TRELLIS_PROFILE_CONTEXT_ARM ?? 'off').toLowerCase();
  if (raw === 'session' || raw === 'pack' || raw === 'both') return raw;
  return 'off';
}

/** True when session-boot injection should include profile text. */
export function shouldInjectProfileAtSession(
  arm: ProfileContextArm = resolveProfileContextArm(),
): boolean {
  return arm === 'session' || arm === 'both';
}

/** True when context pack should include the user profile slice. */
export function shouldInjectProfileInPack(
  arm: ProfileContextArm = resolveProfileContextArm(),
): boolean {
  return arm === 'pack' || arm === 'both';
}

/**
 * Budgeted plain-text block for hooks, context pack, and harness system prompts.
 */
export function formatProfileContextText(
  profile: UserProfile | null,
  opts?: FormatProfileContextOptions,
): string {
  if (!profile) return '';

  const budgetChars = opts?.budgetChars ?? DEFAULT_PROFILE_CONTEXT_BUDGET_CHARS;
  const learningsLimit =
    opts?.learningsLimit ?? DEFAULT_PROFILE_CONTEXT_LEARNINGS_LIMIT;

  const lines: string[] = [
    `Name: ${profile.name}`,
    profile.bio ? `Bio: ${profile.bio}` : '',
    profile.skills.length ? `Skills: ${profile.skills.join(', ')}` : '',
    profile.style ? `Style: ${profile.style}` : '',
    `Preferences: verbosity=${profile.preferences.verbosity}, tone=${profile.preferences.tone}`,
  ].filter(Boolean);

  const learnings = [...(profile.learnings ?? [])].sort(
    (a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt),
  );
  if (learnings.length > 0) {
    lines.push('Learnings:');
    for (const l of learnings.slice(0, learningsLimit)) {
      const tag = l.category ? `[${l.category}] ` : '';
      lines.push(`- ${tag}${l.fact}`);
    }
    if (learnings.length > learningsLimit) {
      lines.push(`- …${learnings.length - learningsLimit} more`);
    }
  }

  let text = lines.join('\n');
  if (text.length > budgetChars) {
    text = text.slice(0, budgetChars - 1) + '…';
  }
  return text;
}

/** Metrics for profile-context eval telemetry. */
export function profileContextStats(
  profile: UserProfile | null,
  opts?: FormatProfileContextOptions,
): ProfileContextStats {
  const text = formatProfileContextText(profile, opts);
  return {
    learningsCount: profile?.learnings?.length ?? 0,
    chars: text.length,
    updatedAt: profile?.updatedAt ?? null,
  };
}

/**
 * Markdown block for agent scaffold injection (most recent first).
 */
export function formatLearningsMarkdown(
  profile: UserProfile | null,
  limit = AGENTS_MD_LEARNING_DISPLAY_LIMIT,
): string {
  const learnings = profile?.learnings ?? [];
  if (learnings.length === 0) return '';

  const sorted = [...learnings].sort(
    (a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt),
  );
  const visible = sorted.slice(0, limit);

  const lines = visible.map((l) => {
    const date = l.addedAt.slice(0, 10);
    const tag = l.category ? `[${l.category}] ` : '';
    return `- ${tag}${l.fact} (${date})`;
  });

  const more =
    learnings.length > visible.length
      ? `\n\n_${learnings.length - visible.length} more — run \`trellis profile show\`._`
      : '';

  return `## Learned Context

> Agent-captured preferences and facts. Managed via \`trellis profile learn\`.

${lines.join('\n')}${more}

---
`;
}

// ---------------------------------------------------------------------------
// Terminal prompts
// ---------------------------------------------------------------------------

function ask(
  rl: ReturnType<typeof createInterface>,
  question: string,
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

/**
 * Interactive terminal prompt to collect user profile.
 * Called only from the CLI layer, never from programmatic API consumers.
 *
 * @param hints Optional pre-fill hints (e.g. from an existing identity)
 */
export async function promptForProfile(hints?: {
  name?: string;
}): Promise<UserProfile> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log();
  console.log('  This takes about 60 seconds and only happens once.');
  console.log('  Press Enter to skip any question.\n');

  const defaultName = hints?.name ?? '';
  const namePrompt = defaultName
    ? `  Your name [${defaultName}]: `
    : '  Your name: ';
  const nameRaw = await ask(rl, namePrompt);
  const name = nameRaw || defaultName;

  const bio = await ask(
    rl,
    '  In one sentence, what kind of work do you do? ',
  );
  const skillsRaw = await ask(
    rl,
    '  Top 3–5 tools or skills (comma-separated): ',
  );
  const style = await ask(
    rl,
    '  How would you describe your working style? ',
  );
  const verbosityRaw = await ask(
    rl,
    '  Preferred response verbosity — concise / balanced / detailed [balanced]: ',
  );
  const toneRaw = await ask(
    rl,
    '  Preferred AI tone — peer / mentor / formal [peer]: ',
  );

  rl.close();

  const skills = skillsRaw
    ? skillsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const verbosity = (
    ['concise', 'balanced', 'detailed'].includes(verbosityRaw)
      ? verbosityRaw
      : 'balanced'
  ) as UserProfile['preferences']['verbosity'];

  const tone = (
    ['peer', 'mentor', 'formal'].includes(toneRaw) ? toneRaw : 'peer'
  ) as UserProfile['preferences']['tone'];

  const now = new Date().toISOString();

  return {
    name: name || 'Unknown',
    bio: bio || '',
    skills,
    style: style || '',
    preferences: { verbosity, tone },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update specific fields of the existing profile without full re-prompting.
 */
export function updateProfile(
  updates: Partial<Omit<UserProfile, 'createdAt' | 'preferences'>> & {
    preferences?: Partial<UserProfile['preferences']>;
  },
): UserProfile {
  const existing = loadProfile();
  const base: UserProfile = existing ?? {
    name: 'Unknown',
    bio: '',
    skills: [],
    style: '',
    preferences: { verbosity: 'balanced', tone: 'peer' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated: UserProfile = {
    ...base,
    ...updates,
    preferences: { ...base.preferences, ...(updates.preferences ?? {}) },
    updatedAt: new Date().toISOString(),
  };

  saveProfile(updated);
  return updated;
}
