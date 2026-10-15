import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

/**
 * 4xx answers are final (bad input, not found, business rule), so only
 * network and 5xx errors are retried, at most twice.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          failureCount < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
      mutations: { retry: false },
    },
  });
}
