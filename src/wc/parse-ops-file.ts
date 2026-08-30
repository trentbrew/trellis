/** Parse legacy JSON array or JSONL op journal (`.trellis/ops.json`). */
export function parseOpsFile(raw: string): unknown[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // fall through — may be truncated array; try line-by-line
    }
  }
  const ops: unknown[] = [];
  for (const line of trimmed.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      ops.push(JSON.parse(t));
    } catch {
      // skip corrupt lines during live poll
    }
  }
  return ops;
}
