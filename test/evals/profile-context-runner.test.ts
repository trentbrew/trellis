import { describe, expect, it } from 'vitest';
import {
  runProfileContextTask,
  scoreRubric,
} from '../../src/evals/profile-context-runner.js';

describe('profile-context-runner', () => {
  it('scoreRubric enforces max_bullet_lines', () => {
    const out = '- one\n- two\n- three\n';
    expect(scoreRubric(out, 'max_bullet_lines:2').pass).toBe(false);
    expect(scoreRubric('- a\n- b\n', 'max_bullet_lines:2').pass).toBe(true);
  });

  it('session arm passes preference tasks', () => {
    const metrics = runProfileContextTask(
      {
        id: 't1',
        input: 'Review diff',
        profile_fixture: {
          preferences: { verbosity: 'concise', tone: 'peer' },
        },
        rubric: 'max_bullet_lines:8|requires_concise',
      },
      'session',
    );
    expect(metrics.contextIncludesProfile).toBe(true);
    expect(metrics.rubricPass).toBe(true);
  });

  it('off arm omits profile context', () => {
    const metrics = runProfileContextTask(
      {
        id: 't2',
        input: 'Review diff',
        profile_fixture: {
          preferences: { verbosity: 'concise', tone: 'peer' },
        },
        rubric: 'max_bullet_lines:8',
      },
      'off',
    );
    expect(metrics.contextIncludesProfile).toBe(false);
  });
});
