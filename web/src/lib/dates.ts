/**
 * Date-range helpers. The API interprets dates as UTC calendar days
 * (inclusive), so presets are computed in UTC too.
 */
export type RangePreset = '7d' | '30d' | '90d' | 'all';

export interface DateRange {
  from: string | null;
  to: string | null;
}

export const RANGE_PRESETS: { value: RangePreset; label: string; days: number | null }[] = [
  { value: '7d', label: '7 d', days: 7 },
  { value: '30d', label: '30 d', days: 30 },
  { value: '90d', label: '90 d', days: 90 },
  { value: 'all', label: 'All', days: null },
];

export function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function presetRange(preset: RangePreset, now: Date = new Date()): DateRange {
  const days = RANGE_PRESETS.find((p) => p.value === preset)?.days ?? null;
  if (days === null) return { from: null, to: null };
  const to = toIsoDay(now);
  const from = toIsoDay(new Date(now.getTime() - (days - 1) * 86_400_000));
  return { from, to };
}

/** Which preset (if any) a range corresponds to, for highlighting the chip. */
export function matchPreset(range: DateRange, now: Date = new Date()): RangePreset | null {
  for (const p of RANGE_PRESETS) {
    const r = presetRange(p.value, now);
    if (r.from === range.from && r.to === range.to) return p.value;
  }
  return null;
}

/** Every calendar day from `from` to `to` inclusive, as `YYYY-MM-DD`. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}
