/** Pure helpers for chart axes (unit-tested in scale.test.ts). */

export interface NiceScale {
  max: number;
  step: number;
  ticks: number[];
}

/** A rounded axis (steps of 1/2/2.5/5 × 10^n) that covers `value` with about `targetTicks` intervals. */
export function niceScale(value: number, targetTicks = 4): NiceScale {
  if (!(value > 0) || !Number.isFinite(value)) {
    return { max: 100, step: 25, ticks: [0, 25, 50, 75, 100] };
  }
  const raw = value / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  const step = nice * magnitude;
  const max = Math.ceil(value / step - 1e-9) * step;
  const count = Math.round(max / step);
  const ticks = Array.from({ length: count + 1 }, (_, i) => Number((i * step).toFixed(10)));
  return { max, step, ticks };
}

/** Index of the band under pixel `x` (clamped to the data range). */
export function bandIndex(x: number, left: number, bandWidth: number, count: number): number {
  if (count <= 0 || bandWidth <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.floor((x - left) / bandWidth)));
}

/** SVG path for a bar with rounded top corners and a square baseline. */
export function roundedTopBar(x: number, y: number, width: number, height: number, radius = 4): string {
  if (height <= 0 || width <= 0) return '';
  const r = Math.min(radius, width / 2, height);
  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height}`,
    'Z',
  ].join(' ');
}
