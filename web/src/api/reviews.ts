import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { request } from './client';
import { keys } from './keys';
import type { Page, ReviewItem, ReviewSummary, UUID } from './types';

export const fetchReviewSummary = (vehicleId?: UUID | null) =>
  request<ReviewSummary>('/reviews/summary', { query: { vehicle_id: vehicleId ?? undefined } });

export interface ReviewListParams {
  vehicle_id?: UUID | null;
  rating?: number | null;
  page?: number;
  page_size?: number;
}

export const fetchReviews = (params: ReviewListParams) =>
  request<Page<ReviewItem>>('/reviews', { query: { ...params } });

export function useReviewSummary(vehicleId?: UUID | null) {
  return useQuery({
    queryKey: [...keys.reviews, 'summary', vehicleId ?? 'all'],
    queryFn: () => fetchReviewSummary(vehicleId),
  });
}

export function useReviews(params: ReviewListParams) {
  return useQuery({
    queryKey: [...keys.reviews, 'list', params],
    queryFn: () => fetchReviews(params),
    placeholderData: keepPreviousData,
  });
}
