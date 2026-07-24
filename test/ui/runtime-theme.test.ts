import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { resolveRuntimeThemeCss } from '../../src/ui/theme/resolve-runtime-theme-css.js';

const THEME_PATH = join(process.cwd(), 'src/ui/theme/runtime-theme.css');
const SERVER_PATH = join(process.cwd(), 'src/ui/server.ts');
const CLIENT_PATH = join(process.cwd(), 'src/ui/client.html');
const LANES_PATH = join(process.cwd(), 'src/ui/lanes.html');
const TML_PATH = join(process.cwd(), 'src/ui/tml-lanes.html');

describe('runtime-theme.css contract (Phase B)', () => {
  it('exists at src/ui/theme/runtime-theme.css', () => {
    expect(existsSync(THEME_PATH)).toBe(true);
  });

  it('declares semantic tokens and legacy aliases', () => {
    const css = readFileSync(THEME_PATH, 'utf-8');
    const required = [
      '--background-base:',
      '--text-interactive-base:',
      '--tml-badge-success-bg:',
      '--tml-kanban-body-inset:',
      '--bg: var(--background-base)',
      '--font: var(--font-family-sans)',
      '--mono: var(--font-family-mono)',
    ];
    for (const token of required) {
      expect(css).toContain(token);
    }
  });

  it('uses Studio dark Phase B values', () => {
    const css = readFileSync(THEME_PATH, 'utf-8');
    expect(css).toContain('#9dbefe');
    expect(css).toContain('#161616');
    expect(css).toContain('--surface-inset-alpha:');
    expect(css).toMatch(/--text-interactive-base:\s*#9dbefe/);
  });

  it('activates inset ladder, glass, and entity tokens', () => {
    const css = readFileSync(THEME_PATH, 'utf-8');
    expect(css).toMatch(/--surface-1:/);
    expect(css).toMatch(/--surface-2:/);
    expect(css).toMatch(/--surface-3:/);
    expect(css).toContain('--tml-glass-surface:');
    expect(css).toContain('--entity-file:');
    expect(css).toContain('--entity-milestone:');
    expect(css).toContain('--entity-issue:');
    expect(css).toContain('--entity-branch:');
    expect(css).toMatch(/--surface2:\s*var\(--surface-inset-base\)/);
  });

  it('re-derives badges and accent glow via color-mix', () => {
    const css = readFileSync(THEME_PATH, 'utf-8');
    expect(css).toMatch(/--tml-badge-success-bg:\s*color-mix/);
    expect(css).toMatch(/--tml-accent-glow:\s*color-mix/);
  });

  it('uses system font stacks (no Inter / JetBrains primary)', () => {
    const css = readFileSync(THEME_PATH, 'utf-8');
    const sans = css.match(/--font-family-sans:\s*([^;]+);/)?.[1] ?? '';
    const mono = css.match(/--font-family-mono:\s*([^;]+);/)?.[1] ?? '';
    expect(sans).not.toMatch(/Inter/);
    expect(mono).not.toMatch(/JetBrains/);
    expect(sans).toMatch(/system-ui|BlinkMacSystemFont|-apple-system/);
  });
});

describe('runtime-theme.css Phase C vantage', () => {
  it('declares live --ui-vantage default 8 (not comment-only)', () => {
    const css = readFileSync(THEME_PATH, 'utf-8');
    const live = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(live).toMatch(/--ui-vantage:\s*8/);
    expect(css).toMatch(/\[data-trellis-shell=/);
    expect(css).toContain('.ui-thing');
  });

  it('documents TRL-25 dual-shell as out of scope', () => {
    const css = readFileSync(THEME_PATH, 'utf-8');
    expect(css).toMatch(/dual-shell/);
    expect(css).toMatch(/TRL-25/);
  });
});

describe('resolveRuntimeThemeCss', () => {
  it('resolves theme CSS from repo rootPath', () => {
    const path = resolveRuntimeThemeCss(process.cwd());
    expect(path).toBeTruthy();
    expect(path!).toContain('runtime-theme.css');
    expect(existsSync(path!)).toBe(true);
  });
});

describe('Phase B surface migration', () => {
  it('legacy UI server serves /theme/runtime-theme.css', () => {
    const src = readFileSync(SERVER_PATH, 'utf-8');
    expect(src).toContain("/theme/runtime-theme.css");
    expect(src).toContain('resolveRuntimeThemeCss');
  });

  it('client.html links theme, sets L3 band, drops Google Fonts and purple islands', () => {
    const html = readFileSync(CLIENT_PATH, 'utf-8');
    expect(html).toContain('data-trellis-band="L3"');
    expect(html).toContain('href="/theme/runtime-theme.css"');
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toMatch(/#6d5bfa/);
    expect(html).not.toMatch(/109,\s*91,\s*250/);
    expect(html).toContain('getPropertyValue');
    expect(html).toContain("'--entity-file'");
    expect(html).not.toMatch(/--accent:\s*#6d5bfa/);
  });

  it('lanes.html has no Google Fonts', () => {
    const html = readFileSync(LANES_PATH, 'utf-8');
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).toContain('href="/theme/runtime-theme.css"');
  });
});

describe('Phase C surface hooks', () => {
  it('client.html has focal data-ui-vantage, scrubber radiogroup, and one morph host', () => {
    const html = readFileSync(CLIENT_PATH, 'utf-8');
    expect(html).toContain('data-ui-vantage');
    expect(html).toContain('aria-label="UI vantage"');
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('id="ui-thing"');
    expect(html).toContain('data-trellis-shell');
    expect(html).toContain('initVantage');
  });

  it('tml-lanes issue cards expose data-trellis-shell=card', () => {
    const html = readFileSync(TML_PATH, 'utf-8');
    expect(html).toContain('class="issue-card" data-trellis-shell="card"');
    const count = (html.match(/data-trellis-shell="card"/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
