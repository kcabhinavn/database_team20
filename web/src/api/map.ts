import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from './client';
import { keys } from './keys';
import type { GeoPoint, NearbyResult, SimulateResult } from './types';

export const RADIUS_M = 5000;
export const POLL_MS = 5000;
export const NEARBY_LIMIT = 20;

export const fetchNearby = (origin: GeoPoint) =>
  request<NearbyResult>('/map/nearby-vehicles', {
    query: { lng: origin.lng, lat: origin.lat, radius_m: RADIUS_M, limit: NEARBY_LIMIT },
  });

export const simulatePings = (origin: GeoPoint, count = 10) =>
  request<SimulateResult>('/map/pings/simulate', { method: 'POST', body: { ...origin, count } });

/** Polls every 5 s (paused while the tab is hidden, or when `paused`). */
export function useNearby(origin: GeoPoint, paused: boolean) {
  return useQuery({
    queryKey: [...keys.map, 'nearby', origin.lng, origin.lat],
    queryFn: () => fetchNearby(origin),
    refetchInterval: paused ? false : POLL_MS,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });
}

export function useSimulatePings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ origin, count }: { origin: GeoPoint; count?: number }) => simulatePings(origin, count),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.map }),
  });
}
