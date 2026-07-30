export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export function satisfies(version: string, range: string): boolean {
  if (range === '*' || range === 'latest') return true;
  if (range.startsWith('>=')) return compareVersions(version, range.slice(2)) >= 0;
  if (range.startsWith('>')) return compareVersions(version, range.slice(1)) > 0;
  if (range.startsWith('<=')) return compareVersions(version, range.slice(2)) <= 0;
  if (range.startsWith('<')) return compareVersions(version, range.slice(1)) < 0;
  if (range.startsWith('^')) {
    const min = range.slice(1);
    const parts = min.split('.');
    const major = parseInt(parts[0], 10);
    if (parts.length >= 2) {
      const nextMajor = `${major + 1}.0.0`;
      return compareVersions(version, min) >= 0 && compareVersions(version, nextMajor) < 0;
    }
    return version.startsWith(`${major}.`) || version === min;
  }
  if (range.startsWith('~')) {
    const min = range.slice(1);
    const parts = min.split('.');
    if (parts.length >= 2) {
      const nextMinor = `${parts[0]}.${parseInt(parts[1], 10) + 1}.0`;
      return compareVersions(version, min) >= 0 && compareVersions(version, nextMinor) < 0;
    }
    return version === min;
  }
  return version === range;
}

export function latestSatisfying(versions: string[], range: string): string | null {
  const matching = versions.filter((v) => satisfies(v, range));
  if (matching.length === 0) return null;
  matching.sort((a, b) => compareVersions(b, a));
  return matching[0];
}
