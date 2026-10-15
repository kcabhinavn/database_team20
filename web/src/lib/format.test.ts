import { describe, expect, it } from 'vitest';
import { formatDateTime, formatDay, formatDistance, formatMoney, formatRelative, humanize, MINUS, shortId } from './format';

describe('formatMoney', () => {
  it('formats dollars with two decimals and separators', () => {
    expect(formatMoney(2275.44)).toBe('$2,275.44');
    expect(formatMoney(0)).toBe('$0.00');
  });
  it('uses a true minus sign and an optional plus sign', () => {
    expect(formatMoney(-24.5)).toBe(`${MINUS}$24.50`);
    expect(formatMoney(60, { sign: true })).toBe('+$60.00');
    expect(formatMoney(-60, { sign: true })).toBe(`${MINUS}$60.00`);
  });
  it('never shows "-$0.00" for tiny negatives', () => {
    expect(formatMoney(-0.001)).toBe('$0.00');
    expect(formatMoney(-0.001, { sign: true })).toBe('$0.00');
  });
  it('rounds to whole dollars for large totals', () => {
    expect(formatMoney(6322470.96, { whole: true })).toBe('$6,322,471');
  });
  it('shows a dash for missing values', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
  });
});

describe('dates', () => {
  it('formats timestamps as day month year, 24 h', () => {
    expect(formatDateTime('2026-10-09T09:12:04Z')).toBe('09 Oct 2026, 09:12');
  });
  it('formats calendar days without shifting time zones', () => {
    expect(formatDay('2026-06-01')).toBe('01 Jun 2026');
    expect(formatDay('2026-06-01T23:30:00Z')).toBe('01 Jun 2026');
  });
  it('describes recent times relatively', () => {
    const now = Date.parse('2026-10-09T10:00:00Z');
    expect(formatRelative('2026-10-09T09:59:59Z', now)).toBe('just now');
    expect(formatRelative('2026-10-09T09:59:52Z', now)).toBe('8 s ago');
    expect(formatRelative('2026-10-09T09:57:00Z', now)).toBe('3 min ago');
    expect(formatRelative('2026-10-09T08:00:00Z', now)).toBe('2 h ago');
    expect(formatRelative('2026-10-01T08:00:00Z', now)).toBe('01 Oct 2026');
  });
});

describe('small helpers', () => {
  it('shortens ids', () => {
    expect(shortId('f35d765d-1b25-4f4e-b8b1-dcbed8151cd7')).toBe('f35d765d…');
  });
  it('formats distance in km', () => {
    expect(formatDistance(310)).toBe('0.31 km');
    expect(formatDistance(4660)).toBe('4.66 km');
  });
  it('humanizes document keys', () => {
    expect(humanize('inspection_records')).toBe('Inspection records');
    expect(humanize('child_seat')).toBe('Child seat');
  });
});
