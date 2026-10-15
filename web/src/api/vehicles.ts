import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ApiError, request } from './client';
import { keys } from './keys';
import type { CatalogDocument, UUID, VehicleDetail, VehiclePage } from './types';

export type VehicleSort = 'plate' | 'earnings' | 'trips';

export interface VehicleListParams {
  search?: string;
  class?: string;
  is_active?: boolean;
  sort?: VehicleSort;
  page?: number;
  page_size?: number;
}

export const fetchVehicles = (params: VehicleListParams = {}) =>
  request<VehiclePage>('/vehicles', { query: { ...params } });

export const fetchVehicle = (id: UUID) => request<VehicleDetail>(`/vehicles/${id}`);

export const fetchVehicleClasses = () => request<string[]>('/vehicles/classes');

/** The catalog document, or null when the vehicle has none (404). */
export async function fetchVehicleMetadata(id: UUID): Promise<CatalogDocument | null> {
  try {
    return await request<CatalogDocument>(`/vehicles/${id}/metadata`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function useVehicles(params: VehicleListParams) {
  return useQuery({
    queryKey: [...keys.vehicles, 'list', params],
    queryFn: () => fetchVehicles(params),
    placeholderData: keepPreviousData,
  });
}

export function useVehicle(id: UUID | null | undefined) {
  return useQuery({
    queryKey: [...keys.vehicles, 'detail', id],
    queryFn: () => fetchVehicle(id as UUID),
    enabled: Boolean(id),
  });
}

export function useVehicleClasses() {
  return useQuery({ queryKey: [...keys.vehicles, 'classes'], queryFn: fetchVehicleClasses, staleTime: Infinity });
}

export function useVehicleMetadata(id: UUID | null | undefined) {
  return useQuery({
    queryKey: [...keys.vehicles, 'metadata', id],
    queryFn: () => fetchVehicleMetadata(id as UUID),
    enabled: Boolean(id),
  });
}
