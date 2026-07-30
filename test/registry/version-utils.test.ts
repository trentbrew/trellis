import { describe, it, expect } from 'vitest';
import { compareVersions, satisfies, latestSatisfying } from '../../src/registry/version-utils.js';

describe('compareVersions', () => {
  it('compares equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('detects greater version', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
  });

  it('detects lesser version', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
  });

  it('handles partial versions', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1', '1.0.0')).toBe(0);
    expect(compareVersions('2', '1.9.9')).toBe(1);
  });

  it('handles pre-release variations', () => {
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
  });
});

describe('satisfies', () => {
  it('accepts wildcard', () => {
    expect(satisfies('1.0.0', '*')).toBe(true);
  });

  it('accepts latest keyword', () => {
    expect(satisfies('2.5.0', 'latest')).toBe(true);
  });

  it('matches exact version', () => {
    expect(satisfies('1.0.0', '1.0.0')).toBe(true);
    expect(satisfies('1.0.1', '1.0.0')).toBe(false);
  });

  it('matches >= constraints', () => {
    expect(satisfies('1.0.0', '>=1.0.0')).toBe(true);
    expect(satisfies('2.0.0', '>=1.0.0')).toBe(true);
    expect(satisfies('0.9.0', '>=1.0.0')).toBe(false);
  });

  it('matches > constraints', () => {
    expect(satisfies('1.0.1', '>1.0.0')).toBe(true);
    expect(satisfies('1.0.0', '>1.0.0')).toBe(false);
  });

  it('matches <= constraints', () => {
    expect(satisfies('1.0.0', '<=1.0.0')).toBe(true);
    expect(satisfies('0.9.0', '<=1.0.0')).toBe(true);
    expect(satisfies('1.0.1', '<=1.0.0')).toBe(false);
  });

  it('matches < constraints', () => {
    expect(satisfies('0.9.0', '<1.0.0')).toBe(true);
    expect(satisfies('1.0.0', '<1.0.0')).toBe(false);
  });

  it('matches ^ (caret) constraints', () => {
    expect(satisfies('1.2.3', '^1.0.0')).toBe(true);
    expect(satisfies('2.0.0', '^1.0.0')).toBe(false);
    expect(satisfies('1.0.0', '^1.0.0')).toBe(true);
  });

  it('matches ~ (tilde) constraints', () => {
    expect(satisfies('1.2.3', '~1.2.0')).toBe(true);
    expect(satisfies('1.3.0', '~1.2.0')).toBe(false);
    expect(satisfies('1.2.0', '~1.2.0')).toBe(true);
  });
});

describe('latestSatisfying', () => {
  const versions = ['1.0.0', '1.5.0', '2.0.0', '2.1.0', '3.0.0'];

  it('returns latest matching version', () => {
    expect(latestSatisfying(versions, '>=2.0.0')).toBe('3.0.0');
    expect(latestSatisfying(versions, '<2.0.0')).toBe('1.5.0');
  });

  it('returns null when no match', () => {
    expect(latestSatisfying(versions, '>=4.0.0')).toBeNull();
  });

  it('returns exact match', () => {
    expect(latestSatisfying(versions, '2.0.0')).toBe('2.0.0');
  });

  it('handles caret constraint', () => {
    expect(latestSatisfying(versions, '^2.0.0')).toBe('2.1.0');
  });
});
