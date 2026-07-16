import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryOptions,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import type { ApiError, Paginated } from '@/platform/api';

/**
 * REACT QUERY PLATFORM — reusable resource hooks that wrap TanStack Query + the
 * API Platform. Business hooks compose THESE (they never call `useQuery`/the api
 * client directly), so caching, error typing, invalidation and optimistic
 * patterns are consistent everywhere.
 */

/** Read a single resource. */
export function useQueryResource<T>(
  key: QueryKey,
  fetcher: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, ApiError, T>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T, ApiError>({ queryKey: key, queryFn: fetcher, ...options });
}

/** Read a paginated resource with page controls (keeps previous page while loading). */
export function usePaginatedResource<T>(
  scope: QueryKey,
  fetcher: (page: number, limit: number) => Promise<Paginated<T>>,
  opts?: { initialPage?: number; limit?: number } & Omit<UseQueryOptions<Paginated<T>, ApiError>, 'queryKey' | 'queryFn'>,
) {
  const { initialPage = 1, limit = 20, ...queryOpts } = opts ?? {};
  const [page, setPage] = useState(initialPage);
  const query = useQuery<Paginated<T>, ApiError>({
    queryKey: [...(scope as unknown[]), { page, limit }],
    queryFn: () => fetcher(page, limit),
    placeholderData: (prev) => prev,
    ...queryOpts,
  });
  const meta = query.data?.meta;
  return {
    ...query,
    items: query.data?.items ?? [],
    meta,
    page,
    setPage,
    pageCount: meta?.totalPages ?? 0,
    hasNext: meta ? page < meta.totalPages : false,
    hasPrev: page > 1,
    next: () => setPage((p) => p + 1),
    prev: () => setPage((p) => Math.max(1, p - 1)),
  };
}

/** Infinite list (cursor/offset) — for feeds, notifications, discovery. */
export function useInfiniteResource<T>(
  key: QueryKey,
  fetcher: (pageParam: number) => Promise<Paginated<T>>,
  options?: Omit<UseInfiniteQueryOptions<Paginated<T>, ApiError, InfiniteData<Paginated<T>>>, 'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'>,
) {
  return useInfiniteQuery<Paginated<T>, ApiError, InfiniteData<Paginated<T>>>({
    queryKey: key,
    queryFn: ({ pageParam }) => fetcher(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    ...options,
  });
}

/** Mutate + auto-invalidate the given key scopes on success. */
export function useMutationResource<TData, TVars>(
  mutationFn: (vars: TVars) => Promise<TData>,
  opts?: { invalidate?: QueryKey[] } & Omit<UseMutationOptions<TData, ApiError, TVars>, 'mutationFn'>,
) {
  const qc = useQueryClient();
  const { invalidate, onSuccess, ...rest } = opts ?? {};
  return useMutation<TData, ApiError, TVars>({
    mutationFn,
    onSuccess: (data, vars, ctx, mutationContext) => {
      invalidate?.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      onSuccess?.(data, vars, ctx, mutationContext);
    },
    ...rest,
  });
}

/**
 * Optimistic mutation — updates the cache immediately, rolls back on error, and
 * reconciles on settle. `updater` receives the current cached value + the vars.
 */
export function useOptimisticMutation<TData, TVars, TCache>(config: {
  mutationFn: (vars: TVars) => Promise<TData>;
  queryKey: QueryKey;
  updater: (current: TCache | undefined, vars: TVars) => TCache;
  invalidate?: QueryKey[];
}) {
  const qc = useQueryClient();
  return useMutation<TData, ApiError, TVars, { previous: TCache | undefined }>({
    mutationFn: config.mutationFn,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: config.queryKey });
      const previous = qc.getQueryData<TCache>(config.queryKey);
      qc.setQueryData<TCache>(config.queryKey, (old) => config.updater(old, vars));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(config.queryKey, ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: config.queryKey });
      config.invalidate?.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
    },
  });
}

/** Imperative invalidation helper (for socket-driven refreshes, etc.). */
export function useInvalidate() {
  const qc = useQueryClient();
  return useCallback((key: QueryKey) => qc.invalidateQueries({ queryKey: key }), [qc]);
}
