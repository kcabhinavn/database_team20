import { useQuery } from '@tanstack/react-query';
import { request } from './client';
import { keys } from './keys';
import type { Health } from './types';

export const fetchHealth = () => request<Health>('/health');

export function useHealth() {
  return useQuery({ queryKey: keys.health, queryFn: fetchHealth, refetchInterval: 15_000, retry: false });
}
