import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { withAlpha } from '../../src/ui/theme/color-tint.js';

describe('withAlpha', () => {
  it('expands #rrggbb with alpha', () => {
    expect(withAlpha('#edb2f1', 0.13)).toBe('rgba(237, 178, 241, 0.13)');
    expect(withAlpha('#00ceb9', 0.13)).toBe('rgba(0, 206, 185, 0.13)');
  });

  it('expands #rgb shorthand', () => {
    expect(withAlpha('#abc', 0.5)).toBe('rgba(170, 187, 204, 0.5)');
  });

  it('replaces alpha on rgba() — does not concatenate', () => {
    expect(withAlpha('rgba(255, 255, 255, 0.618)', 0.13)).toBe(
      'rgba(255, 255, 255, 0.13)',
    );
  });

  it('promotes rgb() to rgba()', () => {
    expect(withAlpha('rgb(1, 2, 3)', 0.5)).toBe('rgba(1, 2, 3, 0.5)');
  });

  it('returns transparent for empty or garbage', () => {
    expect(withAlpha('', 0.13)).toBe('transparent');
    expect(withAlpha('not-a-color', 0.13)).toBe('transparent');
    expect(withAlpha('hsl(120, 50%, 50%)', 0.13)).toBe('transparent');
  });

  it('clamps alpha to [0, 1]', () => {
    expect(withAlpha('#ffffff', -1)).toBe('rgba(255, 255, 255, 0)');
    expect(withAlpha('#ffffff', 2)).toBe('rgba(255, 255, 255, 1)');
  });
});

describe('client.html badge tint', () => {
  it('does not append hex-suffix 22 for entity drawer badges', () => {
    const html = readFileSync(join(process.cwd(), 'src/ui/client.html'), 'utf-8');
    expect(html).not.toMatch(/ENTITY_COLORS\[[^\]]+\]\s*\|\|\s*ENTITY_COLORS\.default\}\s*22/);
    expect(html).not.toMatch(/\$\{[^}]+\}22/);
    expect(html).toMatch(/withAlpha\(/);
    expect(html).toMatch(/keep in sync with src\/ui\/theme\/color-tint\.ts/);
  });
});
