import { QueryClient } from '@tanstack/react-query';

/**
 * The shared TanStack Query client — sensible enterprise defaults (retry with
 * backoff, no refetch-on-focus spam, a 30s freshness window). Data-fetching
 * hooks/services build on this; the design system stays presentation-only.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        // Don't retry 4xx client errors; do retry transient failures (max 2).
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});
