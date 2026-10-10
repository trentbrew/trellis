#!/usr/bin/env bun
/**
 * Runs every committed fixture against the independent validator and asserts
 * the expected verdict (see README.md). Exit 0 = all fixtures behaved as
 * expected.
 *
 *   bun docs/spec/conformance/run-conformance.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseJournal, validateJournal } from './validate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const keyring = JSON.parse(readFileSync(join(here, 'fixtures/keys.json'), 'utf8'));

const cases = [
  ['linear-signed.jsonl', true],
  ['unsigned-prefix.jsonl', true],
  ['signed-then-unsigned.jsonl', false],
  ['tampered-hash.jsonl', false],
  ['broken-chain.jsonl', false],
];

let failed = 0;
for (const [file, expected] of cases) {
  const ops = parseJournal(readFileSync(join(here, 'fixtures', file), 'utf8'));
  const result = validateJournal(ops, keyring);
  const pass = result.valid === expected;
  if (!pass) failed += 1;
  console.log(
    `${pass ? 'ok  ' : 'FAIL'} ${file} — expected ${expected ? 'valid' : 'invalid'}, got ${result.valid ? 'valid' : 'invalid'}` +
      (result.violations.length ? `\n     ${result.violations.join('\n     ')}` : ''),
  );
}

console.log(failed ? `\n${failed}/${cases.length} fixtures failed` : `\nall ${cases.length} fixtures as expected`);
process.exit(failed ? 1 : 0);
