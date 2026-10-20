/**
 * Inline SVG sparkline path generator.
 * Returns the `d` attribute for an SVG `<path>`:
 * x evenly spaced from 0 to w, y = h · (1 − value).
 * One value = a dot at the middle.
 * Clamps values to [0, 1] and never outputs NaN.
 */
export function sparklinePath(values: readonly number[], w: number, h: number): string {
  if (!values || values.length === 0) return '';
  const safeW = Number.isFinite(w) ? Math.max(0, w) : 0;
  const safeH = Number.isFinite(h) ? Math.max(0, h) : 0;

  const clamp = (v: number): number => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
  };

  const f = (n: number): number => Number(n.toFixed(4));

  if (values.length === 1) {
    const x = f(safeW / 2);
    const y = f(safeH * (1 - clamp(values[0])));
    return `M ${x} ${y} L ${x} ${y}`;
  }

  const n = values.length;
  const points = values.map((v, i) => {
    const x = f((i / (n - 1)) * safeW);
    const y = f(safeH * (1 - clamp(v)));
    return `${x} ${y}`;
  });

  return `M ${points.join(' L ')}`;
}
