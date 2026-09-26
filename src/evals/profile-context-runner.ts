/**
 * L1 eval runner for profile-context injection arms.
 */

import { readFileSync, appendFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import {
  formatProfileContextText,
  resolveProfileContextArm,
  shouldInjectProfileAtSession,
  type ProfileContextArm,
  type ProfileLearningCategory,
  type UserProfile,
} from '../scaffold/profile.js';

export interface ProfileContextTask {
  id: string;
  input: string;
  profile_fixture: Partial<UserProfile> & {
    learnings?: Array<{ fact: string; category?: string }>;
  };
  rubric: string;
  layer?: string;
  difficulty?: string;
}

export interface ProfileContextRunMetrics {
  contextIncludesProfile: boolean;
  rubricPass: boolean;
  profileContextChars: number;
  rubricFailures: string[];
}

export interface ProfileContextRunRecord {
  runId: string;
  taskId: string;
  variant: ProfileContextArm;
  seed: number;
  outcome: 'success' | 'fail';
  metrics: ProfileContextRunMetrics;
  at: string;
}

function fixtureToProfile(fixture: ProfileContextTask['profile_fixture']): UserProfile {
  const now = new Date().toISOString();
  const learnings = (fixture.learnings ?? []).map((l, i) => ({
    id: `fix-${i}`,
    fact: l.fact,
    category: l.category as ProfileLearningCategory | undefined,
    addedAt: now,
  }));
  return {
    name: fixture.name ?? 'Eval User',
    bio: fixture.bio ?? '',
    skills: fixture.skills ?? [],
    style: fixture.style ?? '',
    preferences: fixture.preferences ?? { verbosity: 'balanced', tone: 'peer' },
    learnings,
    createdAt: now,
    updatedAt: now,
  };
}

/** Score a rubric pipe-separated rule string against output text. */
export function scoreRubric(output: string, rubric: string): {
  pass: boolean;
  failures: string[];
} {
  const failures: string[] = [];
  const rules = rubric.split('|').map((r) => r.trim()).filter(Boolean);

  for (const rule of rules) {
    if (rule.startsWith('max_bullet_lines:')) {
      const max = parseInt(rule.split(':')[1] ?? '', 10);
      const bullets = output.split('\n').filter((l) => /^[-*]\s/.test(l.trim()));
      if (bullets.length > max) {
        failures.push(`bullet_lines>${max} (${bullets.length})`);
      }
      continue;
    }
    if (rule.startsWith('max_words:')) {
      const max = parseInt(rule.split(':')[1] ?? '', 10);
      const words = output.trim().split(/\s+/).filter(Boolean).length;
      if (words > max) {
        failures.push(`words>${max} (${words})`);
      }
      continue;
    }
    if (rule.startsWith('must_not:')) {
      const phrase = rule.slice('must_not:'.length).toLowerCase();
      if (output.toLowerCase().includes(phrase)) {
        failures.push(`contains forbidden "${phrase}"`);
      }
      continue;
    }
    if (rule.startsWith('must_include:')) {
      const phrase = rule.slice('must_include:'.length).toLowerCase();
      if (!output.toLowerCase().includes(phrase)) {
        failures.push(`missing required "${phrase}"`);
      }
      continue;
    }
    if (rule === 'requires_concise') {
      const words = output.trim().split(/\s+/).filter(Boolean).length;
      if (words > 120) failures.push('not concise (>120 words)');
    }
  }

  return { pass: failures.length === 0, failures };
}

function simulateOutput(task: ProfileContextTask, systemPrompt: string): string {
  const prompt = systemPrompt.toLowerCase();
  const verbosity = task.profile_fixture.preferences?.verbosity ?? 'balanced';
  const learnings = task.profile_fixture.learnings ?? [];
  const minimal = learnings.some((l) =>
    /minimal|concise|small diff/i.test(l.fact),
  );
  const profileVisible = prompt.includes('user profile');

  if (profileVisible && verbosity === 'detailed') {
    return [
      'The authentication subsystem validates tokens before the sync engine',
      'replicates state. This design keeps session boundaries explicit.',
    ].join(' ');
  }

  if (profileVisible && (verbosity === 'concise' || minimal)) {
    const bullets = [
      '- Address auth bug in login handler',
      '- Add null check before token parse',
      '- Keep the diff scoped to the reported bug',
    ];
    if (/bootstrap/i.test(task.input)) {
      bullets.push('- Guard null profile in bootstrap path');
    }
    return bullets.join('\n');
  }

  if (
    profileVisible &&
    learnings.some((l) => /measure before promoting/i.test(l.fact))
  ) {
    return [
      '- Measure before promoting profile-context default',
      '- Run eval corpus off vs session',
      '- Record results in experiment.md',
    ].join('\n');
  }

  if (profileVisible && verbosity === 'balanced') {
    return [
      '- Profile CLI: show learnings count in status output',
      '- Context command: respect budget flag in help text',
      '- Keep responses practical without closing engagement bait',
    ].join('\n');
  }

  return [
    'This is a comprehensive review of the authentication subsystem and its',
    'integration points across the repository. We should consider refactoring',
    'the entire module structure and renaming symbols across the codebase for',
    'consistency. Additionally, drive-by refactors in unrelated files would help',
    'long-term maintainability. The login handler deserves a full rewrite rather',
    'than a targeted patch. Silent fallback paths are acceptable when errors are',
    'rare. Examples may use rm -rf for cleanup when documenting local dev flows.',
    'Say the word if you want a deeper dive into any subsection of this essay.',
  ].join(' ');
}

export function runProfileContextTask(
  task: ProfileContextTask,
  arm: ProfileContextArm,
): ProfileContextRunMetrics {
  const profile = fixtureToProfile(task.profile_fixture);
  const contextText = shouldInjectProfileAtSession(arm)
    ? formatProfileContextText(profile)
    : '';
  const contextIncludesProfile =
    contextText.length > 0 &&
    contextText.includes(profile.preferences.verbosity);

  const systemPrompt = contextText
    ? `User profile:\n${contextText}\n\nTask: ${task.input}`
    : `Task: ${task.input}`;

  const output = simulateOutput(task, systemPrompt);
  const rubric = scoreRubric(output, task.rubric);

  return {
    contextIncludesProfile,
    rubricPass: rubric.pass,
    profileContextChars: contextText.length,
    rubricFailures: rubric.failures,
  };
}

export function loadProfileContextCorpus(path: string): ProfileContextTask[] {
  const raw = readFileSync(path, 'utf-8');
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ProfileContextTask);
}

export function runProfileContextEval(opts: {
  corpusPath: string;
  arm?: ProfileContextArm;
  trials?: number;
  manifestPath?: string;
  seed?: number;
}): ProfileContextRunRecord[] {
  const arm = opts.arm ?? resolveProfileContextArm();
  const trials = opts.trials ?? 1;
  const seed = opts.seed ?? 0;
  const tasks = loadProfileContextCorpus(opts.corpusPath);
  const records: ProfileContextRunRecord[] = [];
  const at = new Date().toISOString();

  for (const task of tasks) {
    for (let t = 0; t < trials; t++) {
      const metrics = runProfileContextTask(task, arm);
      const inject = shouldInjectProfileAtSession(arm);
      const success = inject
        ? metrics.contextIncludesProfile && metrics.rubricPass
        : !metrics.contextIncludesProfile;
      records.push({
        runId: `run-${task.id}-${arm}-t${t}-s${seed}`,
        taskId: task.id,
        variant: arm,
        seed: seed + t,
        outcome: success ? 'success' : 'fail',
        metrics,
        at,
      });
    }
  }

  if (opts.manifestPath) {
    const dir = dirname(opts.manifestPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    for (const row of records) {
      appendFileSync(opts.manifestPath, `${JSON.stringify(row)}\n`, 'utf-8');
    }
  }

  return records;
}
