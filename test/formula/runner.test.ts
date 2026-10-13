import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  parse,
  parseAndEvaluate,
  roundtripCanonical,
  serialize,
  evaluate,
  ParseError,
} from '../../src/formula/index.js';
import type { DialectTag, EvalContextV1 } from '../../src/formula/index.js';
import {
  classifyPbCompat,
  evaluateCms,
  evaluateKernel,
  evaluatePb,
} from '../../src/formula/adapters/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const matrixPath = join(here, 'matrix.jsonl');

interface MatrixRow {
  id: string;
  kind?: 'classify' | 'adapter';
  adapter?: 'kernel' | 'cms' | 'pb';
  dialect?: DialectTag;
  expr: string;
  context?: EvalContextV1;
  expected?: unknown;
  expectedClass?: string;
  expectError?: boolean;
  roundtrip?: boolean;
  skip?: boolean;
  notes?: string;
}

function loadMatrix(): MatrixRow[] {
  return readFileSync(matrixPath, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as MatrixRow);
}

const rows = loadMatrix();

describe('formula-core-v1 corpus', () => {
  test('matrix has >=12 eval rows and sh- classify lift', () => {
    expect(rows.length).toBeGreaterThanOrEqual(18);
    const tags = new Set(rows.filter((r) => r.dialect).map((r) => r.dialect));
    expect(tags.has('kernel-fn')).toBe(true);
    expect(tags.has('cms-brace')).toBe(true);
    expect(tags.has('pb-compat')).toBe(true);
    expect(rows.filter((r) => r.id.startsWith('sh-')).length).toBeGreaterThanOrEqual(6);
    expect(rows.some((r) => r.dialect === 'pb-compat' && r.expectError)).toBe(true);
  });

  for (const row of rows) {
    const title = `${row.id}${row.kind ? ` [${row.kind}]` : ''}`;
    if (row.skip) {
      test.skip(title, () => {});
      continue;
    }
    if (row.kind === 'classify') {
      test(title, () => {
        expect(classifyPbCompat(row.expr)).toBe(row.expectedClass);
      });
      continue;
    }
    if (row.kind === 'adapter') {
      test(title, () => {
        const ctx: EvalContextV1 = row.context ?? { record: {} };
        let got: unknown;
        switch (row.adapter) {
          case 'kernel':
            got = evaluateKernel(row.expr, ctx);
            break;
          case 'cms':
            got = evaluateCms(row.expr, ctx);
            break;
          case 'pb':
            got = evaluatePb(row.expr, ctx);
            break;
          default:
            throw new Error('missing adapter');
        }
        expect(got).toBe(row.expected);
      });
      continue;
    }
    if (row.expectError) {
      test(title, () => {
        expect(() => parse(row.expr, row.dialect!)).toThrow(ParseError);
      });
      continue;
    }
    test(title, () => {
      const ctx: EvalContextV1 = row.context ?? { record: {} };
      const got = parseAndEvaluate(row.expr, row.dialect!, ctx);
      expect(got).toBe(row.expected);
      if (row.roundtrip) {
        const canonical = roundtripCanonical(row.expr, row.dialect!);
        const ast = parse(canonical, row.dialect!);
        expect(evaluate(ast, ctx)).toBe(row.expected);
        const again = serialize(ast, row.dialect!);
        expect(parse(again, row.dialect!)).toEqual(ast);
      }
    });
  }
});
