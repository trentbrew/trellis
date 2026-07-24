/**
 * CSS color alpha helper for runtime UI (drawer badges, tinted fills).
 * Keep the algorithm in sync with the inline copy in `src/ui/client.html`.
 */

/** Clamp alpha to [0, 1]. */
function clampAlpha(alpha01: number): number {
  if (!Number.isFinite(alpha01)) return 0;
  return Math.min(1, Math.max(0, alpha01));
}

/**
 * Return a CSS color with the given alpha in [0, 1].
 * Handles `#rgb` / `#rrggbb` and `rgba()` / `rgb()`. Empty or garbage → `transparent`.
 */
export function withAlpha(color: string, alpha01: number): string {
  const a = clampAlpha(alpha01);
  const s = (color ?? '').trim();
  if (!s) return 'transparent';

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3) {
      h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(
    s,
  );
  if (rgb) {
    return `rgba(${Number(rgb[1])}, ${Number(rgb[2])}, ${Number(rgb[3])}, ${a})`;
  }

  return 'transparent';
}
