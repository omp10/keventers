import { useMemo, useState } from 'react';

import { useNearbyBranches, useBranchSearch } from './useBranchQueries';
import type { Branch, DiscoveryFilterState, GeoPoint } from '../types';

/** List | Map | Split — the feature extends the platform's list/map with split. */
export type DiscoveryViewMode = 'list' | 'map' | 'split';

const DEFAULT_FILTERS: DiscoveryFilterState = { sort: 'nearest' };

/**
 * useDiscoveryController — the SINGLE data + view controller for discovery
 * surfaces. List, map, and split all consume this one source (no duplicated
 * fetching or rendering logic). It picks nearby-vs-search from the filter state,
 * exposes infinite pagination, and tracks the active branch so map⇄list stay in
 * sync. The backend owns distance/availability; this only orchestrates queries.
 */
export function useDiscoveryController(opts?: {
  point?: GeoPoint | null;
  initialView?: DiscoveryViewMode;
  initialFilters?: DiscoveryFilterState;
}) {
  const point = opts?.point ?? null;
  const [view, setView] = useState<DiscoveryViewMode>(opts?.initialView ?? 'list');
  const [filters, setFilters] = useState<DiscoveryFilterState>({ ...DEFAULT_FILTERS, ...opts?.initialFilters });
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);

  const isSearching = Boolean(filters.q && filters.q.trim());

  const nearby = useNearbyBranches(point, isSearching ? undefined : filters);
  const search = useBranchSearch({ ...filters, lat: point?.lat, lng: point?.lng }, isSearching);

  const active = isSearching ? search : nearby;

  const branches = useMemo<Branch[]>(
    () => (active.data?.pages.flatMap((p) => p.items) ?? []) as Branch[],
    [active.data],
  );

  const total = active.data?.pages[0]?.meta.total;

  return {
    branches,
    total,
    mode: isSearching ? ('search' as const) : ('nearby' as const),
    status: active.status,
    isLoading: active.isLoading,
    isError: active.isError,
    error: active.error,
    refetch: active.refetch,
    fetchNextPage: active.fetchNextPage,
    hasNextPage: Boolean(active.hasNextPage),
    isFetchingNextPage: active.isFetchingNextPage,

    view,
    setView,
    filters,
    setFilters,
    patchFilters: (patch: Partial<DiscoveryFilterState>) => setFilters((f) => ({ ...f, ...patch })),
    resetFilters: () => setFilters({ ...DEFAULT_FILTERS }),

    activeBranchId,
    setActiveBranchId,
  };
}
