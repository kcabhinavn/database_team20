import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { request } from './client';
import { keys } from './keys';
import type { Page, TripDetail, TripItem, TripStatus, UUID } from './types';

export type TripStatusFilter = TripStatus | 'ACTIVE';

export interface TripListParams {
  search?: string;
  status?: TripStatusFilter;
  rider_id?: UUID;
  vehicle_id?: UUID;
  from?: string | null;
  to?: string | null;
  page?: number;
  page_size?: number;
}

export const fetchTrips = (params: TripListParams = {}) => request<Page<TripItem>>('/trips', { query: { ...params } });

export const fetchTrip = (id: UUID) => request<TripDetail>(`/trips/${id}`);

export const advanceTrip = (id: UUID, status: TripStatus) =>
  request<TripItem>(`/trips/${id}/status`, { method: 'PATCH', body: { status } });

/** Anything that depends on trips or wallets is refetched after a write. */
export function invalidateAfterTripChange(client: QueryClient) {
  for (const root of [keys.trips, keys.riders, keys.audit, keys.analytics, keys.vehicles]) {
    void client.invalidateQueries({ queryKey: root });
  }
}

export function useTrips(params: TripListParams, enabled = true) {
  return useQuery({
    queryKey: [...keys.trips, 'list', params],
    queryFn: () => fetchTrips(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useTrip(id: UUID | null | undefined) {
  return useQuery({
    queryKey: [...keys.trips, 'detail', id],
    queryFn: () => fetchTrip(id as UUID),
    enabled: Boolean(id),
  });
}

export function useAdvanceTrip() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: UUID; status: TripStatus }) => advanceTrip(id, status),
    onSuccess: () => invalidateAfterTripChange(client),
  });
}
