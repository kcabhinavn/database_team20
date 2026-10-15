import type { TripStatus } from '@/api/types';

/** Colour roles from the style guide. Every badge also carries text. */
export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  REQUESTED: 'Requested',
  IN_TRANSIT: 'In transit',
  COMPLETED: 'Completed',
};

export const TRIP_STATUS_TONE: Record<TripStatus, Tone> = {
  REQUESTED: 'warning',
  IN_TRANSIT: 'info',
  COMPLETED: 'success',
};

export const TRIP_STEPS: TripStatus[] = ['REQUESTED', 'IN_TRANSIT', 'COMPLETED'];

/** Button text for moving a trip to `next`. */
export function advanceLabel(next: TripStatus): string {
  return next === 'IN_TRANSIT' ? 'Mark in transit' : 'Mark completed';
}
