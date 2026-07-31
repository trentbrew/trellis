/**
 * Fuzzy matching utilities — shared furniture (ADR 0034 §3).
 *
 * Score is a plain subsequence match: every query character must appear in
 * order in the target (case-insensitive), or the score is 0 (no match).
 * Longer consecutive runs and earlier positions score higher, so "psh" beats
 * "psh" in "push" vs "pin-shed", and exact-prefix matches get a bonus.
 *
 * Also exports `fuzzyRanges` — the matched character index pairs per result,
 * used by combobox highlight rendering.
 *
 * @module trellis/headless
 */

/**
 * Score `query` against `target`; 0 means no match.
 * Empty query matches everything with score 1.
 */
export function fuzzyScore(query: string, target: string): number {
  if (query === '') return 1;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (q === t) return 1000;

  let score = 0;
  let lastIndex = -1;
  let run = 0;
  for (const char of q) {
    const idx = t.indexOf(char, lastIndex + 1);
    if (idx === -1) return 0;
    run = idx === lastIndex + 1 ? run + 1 : 0;
    score += 1 + run * 2 - (idx - lastIndex - 1);
    lastIndex = idx;
  }
  if (t.startsWith(q)) score += 10;
  return Math.max(1, score);
}

/**
 * Score an item across its searchable text: label first, then keywords and
 * description. Returns the best (highest) score; 0 = no match.
 */
export function fuzzyMatch(
  query: string,
  text: string[],
): number {
  let best = 0;
  for (const t of text) {
    const s = fuzzyScore(query, t);
    if (s > best) best = s;
  }
  return best;
}

/**
 * Return the matched character ranges for `query` inside `target`.
 * Each range is `[start, end)` (end-exclusive). Consecutive matched
 * characters merge into one range.
 *
 * Returns an empty array when query is empty or any query character is
 * absent from target (no match).
 */
export function fuzzyRanges(
  query: string,
  target: string,
): Array<[number, number]> {
  if (query === '') return [];
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const indices: number[] = [];
  let lastIndex = -1;
  for (const char of q) {
    const idx = t.indexOf(char, lastIndex + 1);
    if (idx === -1) return [];
    indices.push(idx);
    lastIndex = idx;
  }
  const ranges: Array<[number, number]> = [];
  for (const idx of indices) {
    const last = ranges[ranges.length - 1];
    if (last && idx === last[1]) {
      last[1] = idx + 1;
    } else {
      ranges.push([idx, idx + 1]);
    }
  }
  return ranges;
}