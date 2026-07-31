/**
 * Palette fuzzy matching — pure, deterministic, testable (ADR 0034 §6).
 *
 * Score is a plain subsequence match: every query character must appear in
 * order in the target (case-insensitive), or the score is 0 (no match).
 * Longer consecutive runs and earlier positions score higher, so "psh" beats
 * "psh" in "push" vs "pin-shed", and exact-prefix matches get a bonus.
 *
 * @module trellis/palette
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
    // +1 per matched char, +2 per consecutive-run continuation,
    // −1 per gap between matches (earlier, tighter matches win).
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
