import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { request } from './client';
import { keys } from './keys';
import type { Page, RiderDetail, RiderItem, UUID, WalletAudit } from './types';

export interface RiderListParams {
  search?: string;
  has_active_trip?: boolean;
  page?: number;
  page_size?: number;
}

export const fetchRiders = (params: RiderListParams = {}) =>
  request<Page<RiderItem>>('/riders', { query: { ...params } });

export const fetchRider = (id: UUID) => request<RiderDetail>(`/riders/${id}`);

export interface WalletAuditParams {
  from?: string | null;
  to?: string | null;
  order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export const fetchWalletAudit = (riderId: UUID, params: WalletAuditParams = {}) =>
  request<WalletAudit>(`/riders/${riderId}/wallet-audit`, { query: { ...params } });

export function useRiders(params: RiderListParams) {
  return useQuery({
    queryKey: [...keys.riders, 'list', params],
    queryFn: () => fetchRiders(params),
    placeholderData: keepPreviousData,
  });
}

export function useRider(id: UUID | null | undefined) {
  return useQuery({
    queryKey: [...keys.riders, 'detail', id],
    queryFn: () => fetchRider(id as UUID),
    enabled: Boolean(id),
  });
}

export function useWalletAudit(riderId: UUID | null | undefined, params: WalletAuditParams) {
  return useQuery({
    queryKey: [...keys.audit, riderId, params],
    queryFn: () => fetchWalletAudit(riderId as UUID, params),
    enabled: Boolean(riderId),
    placeholderData: keepPreviousData,
  });
}
