import { useCallback, useEffect, useState } from 'react';

import { qk, queryClient, useQueryResource } from '@/platform/query';
import { menuService } from '../services';
import type { BranchMenu, Product, ProductDetail } from '../types';

/** The full branch menu (categories + products + curated rails). */
export function useMenu(branchSlug: string | undefined) {
  return useQueryResource<BranchMenu>(
    qk('ordering', 'menu', branchSlug ?? null),
    () => menuService.branchMenu(branchSlug!),
    { enabled: Boolean(branchSlug), staleTime: 60_000 },
  );
}

/** A single product's full detail. */
export function useProduct(branchSlug: string | undefined, productSlug: string | undefined) {
  return useQueryResource<ProductDetail>(
    qk('ordering', 'product', branchSlug ?? null, productSlug ?? null),
    () => menuService.product(branchSlug!, productSlug!),
    { enabled: Boolean(branchSlug && productSlug) },
  );
}

/** Prefetch a product (call on card hover/focus) for instant drawer open. */
export function usePrefetchProduct(branchSlug: string | undefined) {
  return useCallback(
    (productSlug: string) => {
      if (!branchSlug) return;
      void queryClient.prefetchQuery({
        queryKey: qk('ordering', 'product', branchSlug, productSlug),
        queryFn: () => menuService.product(branchSlug, productSlug),
        staleTime: 30_000,
      });
    },
    [branchSlug],
  );
}

/** Debounced in-menu search. */
export function useMenuSearch(branchSlug: string | undefined, term: string) {
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 180);
    return () => clearTimeout(t);
  }, [term]);

  const enabled = Boolean(branchSlug) && debounced.length >= 2;
  const query = useQueryResource<Product[]>(
    qk('ordering', 'menu-search', branchSlug ?? null, debounced),
    () => menuService.search(branchSlug!, debounced),
    { enabled, staleTime: 30_000 },
  );
  return { results: enabled ? query.data ?? [] : [], isSearching: enabled && query.isFetching, term: debounced };
}
