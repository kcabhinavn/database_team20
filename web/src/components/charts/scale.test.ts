import { describe, expect, it } from 'vitest';
import { bandIndex, niceScale, roundedTopBar } from './scale';

describe('niceScale', () => {
  it('rounds the axis up to a readable maximum', () => {
    expect(niceScale(797.44)).toEqual({ max: 800, step: 200, ticks: [0, 200, 400, 600, 800] });
    expect(niceScale(350).max).toBe(400);
    expect(niceScale(100).ticks).toEqual([0, 25, 50, 75, 100]);
  });
  it('always covers the value', () => {
    for (const v of [1, 7, 13.5, 99.99, 1234, 16801.83]) {
      expect(niceScale(v).max).toBeGreaterThanOrEqual(v);
    }
  });
  it('has a sensible default when there is no data', () => {
    expect(niceScale(0).max).toBe(100);
    expect(niceScale(Number.NaN).max).toBe(100);
  });
});

describe('bandIndex', () => {
  it('maps a pixel to the day under it and clamps at the edges', () => {
    expect(bandIndex(56, 56, 10, 30)).toBe(0);
    expect(bandIndex(75, 56, 10, 30)).toBe(1);
    expect(bandIndex(10, 56, 10, 30)).toBe(0);
    expect(bandIndex(10_000, 56, 10, 30)).toBe(29);
  });
});

describe('roundedTopBar', () => {
  it('draws nothing for empty bars', () => {
    expect(roundedTopBar(0, 0, 10, 0)).toBe('');
  });
  it('starts and ends on the baseline', () => {
    const d = roundedTopBar(10, 20, 8, 50);
    expect(d.startsWith('M10,70')).toBe(true);
    expect(d).toContain('V70');
  });
});
