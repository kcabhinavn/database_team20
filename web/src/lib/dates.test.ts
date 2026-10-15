import { describe, expect, it } from 'vitest';
import { eachDay, matchPreset, presetRange } from './dates';

const NOW = new Date('2026-10-14T12:00:00Z');

describe('date presets', () => {
  it('builds inclusive UTC ranges', () => {
    expect(presetRange('7d', NOW)).toEqual({ from: '2026-10-08', to: '2026-10-14' });
    expect(presetRange('30d', NOW)).toEqual({ from: '2026-09-15', to: '2026-10-14' });
    expect(presetRange('all', NOW)).toEqual({ from: null, to: null });
  });
  it('recognises which preset a range is', () => {
    expect(matchPreset({ from: '2026-10-08', to: '2026-10-14' }, NOW)).toBe('7d');
    expect(matchPreset({ from: null, to: null }, NOW)).toBe('all');
    expect(matchPreset({ from: '2026-10-01', to: '2026-10-02' }, NOW)).toBeNull();
  });
});

describe('eachDay', () => {
  it('lists every calendar day, across month ends', () => {
    expect(eachDay('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
  });
  it('returns one day for a single-day range and none for a reversed one', () => {
    expect(eachDay('2026-06-01', '2026-06-01')).toEqual(['2026-06-01']);
    expect(eachDay('2026-06-02', '2026-06-01')).toEqual([]);
  });
});
