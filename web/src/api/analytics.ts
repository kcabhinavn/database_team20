import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from './client';
import { keys } from './keys';
import type { FleetSummary, Page, RankingItem, RefreshResult, RevenueTrend, UUID } from './types';

export const fetchFleetSummary = () => request<FleetSummary>('/analytics/fleet-summary');

export const refreshFleetSummary = () => request<RefreshResult>('/analytics/fleet-summary/refresh', { method: 'POST' });

export const fetchRanking = (params: { page?: number; page_size?: number }) =>
  request<Page<RankingItem>>('/analytics/revenue-ranking', { query: { ...params } });

export interface TrendParams {
  days: number;
  zero_fill: boolean;
}

export const fetchRevenueTrend = (vehicleId: UUID, params: TrendParams) =>
  request<RevenueTrend>(`/analytics/vehicles/${vehicleId}/revenue-trend`, { query: { ...params } });

export function useFleetSummary() {
  return useQuery({ queryKey: [...keys.analytics, 'summary'], queryFn: fetchFleetSummary });
}

export function useRefreshFleetSummary() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: refreshFleetSummary,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [...keys.analytics, 'summary'] });
      void client.invalidateQueries({ queryKey: keys.vehicles });
    },
  });
}

export function useRanking(params: { page: number; page_size: number }) {
  return useQuery({
    queryKey: [...keys.analytics, 'ranking', params],
    queryFn: () => fetchRanking(params),
    placeholderData: keepPreviousData,
  });
}

export function useRevenueTrend(vehicleId: UUID | null | undefined, params: TrendParams) {
  return useQuery({
    queryKey: [...keys.analytics, 'trend', vehicleId, params],
    queryFn: () => fetchRevenueTrend(vehicleId as UUID, params),
    enabled: Boolean(vehicleId),
    placeholderData: keepPreviousData,
  });
}
