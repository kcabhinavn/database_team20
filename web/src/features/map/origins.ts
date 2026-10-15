import type { GeoPoint } from '@/api/types';

export interface OriginPreset {
  key: string;
  label: string;
  point: GeoPoint;
}

/** San Francisco presets. Civic Center is the Part A Workflow 3 origin. */
export const ORIGINS: OriginPreset[] = [
  { key: 'civic-center', label: 'Civic Center', point: { lng: -122.4194, lat: 37.7749 } },
  { key: 'union-square', label: 'Union Square', point: { lng: -122.4075, lat: 37.788 } },
  { key: 'mission', label: 'Mission', point: { lng: -122.4148, lat: 37.7599 } },
];

export const DEFAULT_ORIGIN = ORIGINS[0];

/** Origin from the URL: a preset key, or custom lng/lat (from a map click). */
export function originFromParams(preset: string | null, lng: string | null, lat: string | null): { point: GeoPoint; presetKey: string | null } {
  const x = Number(lng);
  const y = Number(lat);
  if (lng !== null && lat !== null && Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= 180 && Math.abs(y) <= 90) {
    return { point: { lng: x, lat: y }, presetKey: null };
  }
  const found = ORIGINS.find((o) => o.key === preset) ?? DEFAULT_ORIGIN;
  return { point: found.point, presetKey: found.key };
}
