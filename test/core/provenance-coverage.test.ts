/**
 * Architectural fitness test for ADR 0021 acceptance criterion #5:
 * "Every op minted through kernel/SDK/HTTP/MCP carries a non-default
 * provenance.origin; none report `sdk` by accident."
 *
 * Provenance is only useful if it is *accurate*. The failure mode this guards
 * is silent: a new surface calls `kernel.createEntity(...)` without a context,
 * inherits the `sdk` default, and its ops are misattributed forever — in an
 * append-only log, so the mistake is not fixable after the fact.
 *
 * This scans source rather than behaviour because the alternative is booting
 * every surface. If it fails, the fix is to pass a `ctx` with `provenance` at
 * the reported call site — not to add it to the allowlist.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'fs';

const SRC = join(fileURLToPath(new URL('../../', import.meta.url)), 'src');

const MUTATORS =
  '(mutate|createEntity|updateEntity|deleteEntity|addFact|removeFact|addLink|removeLink)';

/**
 * Files exempt from needing an explicit provenance context.
 *
 * `client/sdk.ts` is the SDK itself — the `sdk` default is the correct and
 * intended attribution there, not an accident.
 * `core/kernel/**` is where provenance is resolved, so it cannot pass it.
 */
const ALLOWLIST = [/^client\/sdk\.ts$/, /^core\/kernel\//];

/** Strip comments so JSDoc usage examples are not mistaken for call sites. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/** Extract a full call expression by walking to its matching close paren. */
function callAt(src: string, openIdx: number): string {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')') {
      depth--;
      if (depth === 0) return src.slice(openIdx, i + 1);
    }
  }
  return src.slice(openIdx);
}

function tsFiles(): string[] {
  return globSync('**/*.ts', { cwd: SRC }).filter((f) => !f.endsWith('.d.ts'));
}

describe('ADR 0021 §2 — provenance coverage', () => {
  it('every production mint site declares its provenance', () => {
    const offenders: string[] = [];

    for (const rel of tsFiles()) {
      if (ALLOWLIST.some((re) => re.test(rel))) continue;

      const src = stripComments(readFileSync(join(SRC, rel), 'utf8'));
      const re = new RegExp(`kernel\\.${MUTATORS}\\(`, 'g');

      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const call = callAt(src, m.index + m[0].length - 1);
        if (/_CTX|provenance|httpWriteContext|wctx/.test(call)) continue;

        const line = src.slice(0, m.index).split('\n').length;
        offenders.push(`${rel}:${line} — ${call.split('\n')[0]!.slice(0, 60)}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('the allowlist itself still matches real files', () => {
    // A stale allowlist would silently exempt nothing (or worse, everything).
    const files = tsFiles();
    expect(files).toContain('client/sdk.ts');
    expect(files.some((f) => f.startsWith('core/kernel/'))).toBe(true);
  });
});
