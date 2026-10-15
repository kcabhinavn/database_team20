/** Display formatting rules from docs/design/style_guide.md ("Formatting"). */

export const MINUS = '−';
const EMPTY = '—';

const money2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat('en-US');
const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const dateOnly = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });

/** `$2,275.44`, `−$24.50`, `+$60.00` (with `sign`), `$6,322,471` (with `whole`). */
export function formatMoney(value: number | null | undefined, opts: { sign?: boolean; whole?: boolean } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  const text = (opts.whole ? money0 : money2).format(Math.abs(value));
  const rounded = opts.whole ? Math.round(value) : Math.round(value * 100) / 100;
  if (rounded < 0) return `${MINUS}${text}`;
  if (opts.sign && rounded > 0) return `+${text}`;
  return text;
}

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? EMPTY : integer.format(value);
}

/** Timestamp in the viewer's time zone: `09 Oct 2026, 09:12`. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return EMPTY;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? EMPTY : dateTime.format(d);
}

/** Calendar day (`YYYY-MM-DD`, or the date part of a timestamp) as `09 Oct 2026`. */
export function formatDay(day: string | null | undefined): string {
  if (!day) return EMPTY;
  const d = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? EMPTY : dateOnly.format(d);
}

export function formatDayShort(day: string): string {
  return dayMonth.format(new Date(`${day.slice(0, 10)}T00:00:00Z`));
}

/** `just now`, `8 s ago`, `3 min ago`, `2 h ago`, then the date. */
export function formatRelative(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return EMPTY;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return EMPTY;
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 3) return 'just now';
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDay(iso);
}

/** First 8 characters of a UUID: `f35d765d…`. */
export function shortId(id: string | null | undefined): string {
  return id ? `${id.slice(0, 8)}…` : EMPTY;
}

export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatRating(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? EMPTY : value.toFixed(digits);
}

/** `inspection_records` → `Inspection records`, `child_seat` → `Child seat`. */
export function humanize(key: string): string {
  const text = key.replace(/[_-]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : key;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
