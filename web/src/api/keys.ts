/**
 * Query-key roots. Mutations invalidate by root, e.g. a booking invalidates
 * every key that starts with 'riders', 'trips', 'audit' and 'analytics'.
 */
export const keys = {
  health: ['health'] as const,
  riders: ['riders'] as const,
  trips: ['trips'] as const,
  vehicles: ['vehicles'] as const,
  audit: ['audit'] as const,
  analytics: ['analytics'] as const,
  map: ['map'] as const,
  reviews: ['reviews'] as const,
};
