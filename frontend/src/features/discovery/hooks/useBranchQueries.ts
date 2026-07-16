import { useCallback } from 'react';

import { qk, queryClient, useInfiniteResource, useQueryResource } from '@/platform/query';
import { discoveryService } from '../services';
import type { Branch, BranchDetail, DiscoveryQuery, GeoPoint, PromoBanner, StorefrontCategory } from '../types';

const LIMIT = 12;

/** Nearby branches for an origin — infinite scroll. Backend computes distance. */
export function useNearbyBranches(point: GeoPoint | null, filters?: Omit<DiscoveryQuery, 'lat' | 'lng' | 'page' | 'limit'>) {
  return useInfiniteResource<Branch>(
    qk('discovery', 'nearby', point ?? null, filters ?? {}),
    (page) => discoveryService.nearby({ ...filters, lat: point?.lat, lng: point?.lng, page, limit: LIMIT }),
    { enabled: Boolean(point) },
  );
}

/** Full search — infinite scroll. Works with or without an origin. */
export function useBranchSearch(query: DiscoveryQuery, enabled = true) {
  return useInfiniteResource<Branch>(
    qk('discovery', 'search', query),
    (page) => discoveryService.search({ ...query, page, limit: LIMIT }),
    { enabled },
  );
}

/** Curated popular branches near an origin (home rail). */
export function usePopularBranches(point: GeoPoint | null) {
  return useQueryResource<Branch[]>(
    qk('discovery', 'popular', point ?? null),
    () => discoveryService.popular({ lat: point?.lat, lng: point?.lng }),
  );
}

/** Featured / promoted branches (home rail; sponsor slots later plug in here). */
export function useFeaturedBranches(point: GeoPoint | null) {
  return useQueryResource<Branch[]>(
    qk('discovery', 'featured', point ?? null),
    () => discoveryService.featured({ lat: point?.lat, lng: point?.lng }),
  );
}

/** Admin-curated homepage banners (the promo carousel's data source). */
export function usePromoBanners() {
  return useQueryResource<PromoBanner[]>(
    qk('discovery', 'banners', 'customer_home'),
    () => discoveryService.banners('customer_home'),
    { staleTime: 120_000 },
  );
}

/** Admin-curated storefront categories (the home tiles' data source). */
export function useStorefrontCategories() {
  return useQueryResource<StorefrontCategory[]>(
    qk('discovery', 'categories'),
    () => discoveryService.categories(),
    { staleTime: 300_000 },
  );
}

/** A branch's full detail by SEO slug. */
export function useBranchDetail(slug: string | undefined, point?: GeoPoint | null) {
  return useQueryResource<BranchDetail>(
    qk('discovery', 'branch', slug ?? null, point ?? null),
    () => discoveryService.branchBySlug(slug!, point ?? undefined),
    { enabled: Boolean(slug) },
  );
}

/** Prefetch a branch's detail (call on card hover/focus for instant navigation). */
export function usePrefetchBranch(point?: GeoPoint | null) {
  return useCallback(
    (slug: string) => {
      void queryClient.prefetchQuery({
        queryKey: qk('discovery', 'branch', slug, point ?? null),
        queryFn: () => discoveryService.branchBySlug(slug, point ?? undefined),
        staleTime: 30_000,
      });
    },
    [point],
  );
}
