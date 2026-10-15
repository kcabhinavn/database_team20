import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, request } from './client';
import { invalidateAfterTripChange } from './trips';
import type { BookingRequest, BookingResult } from './types';

function isBookingResult(value: unknown): value is BookingResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    ((value as BookingResult).status === 'COMMITTED' || (value as BookingResult).status === 'ROLLED_BACK')
  );
}

/**
 * Resolves with the BookingResult for both COMMITTED (201) and every
 * ROLLED_BACK answer (400/404/409): a rejected booking is a normal outcome.
 * Only network/validation/server errors throw.
 */
export async function createBooking(input: BookingRequest): Promise<BookingResult> {
  try {
    return await request<BookingResult>('/bookings', { method: 'POST', body: input });
  } catch (error) {
    if (error instanceof ApiError && isBookingResult(error.body)) return error.body;
    throw error;
  }
}

export function useCreateBooking() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createBooking,
    onSettled: () => invalidateAfterTripChange(client),
  });
}
