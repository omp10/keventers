import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Coordinates } from '@/platform/location';
import { applyFilters, collectFacets, sortItems, withDistance } from './engine';
import type {
  DiscoverableItem,
  DiscoveryContext,
  DiscoveryFeed,
  DiscoveryFilters,
  DiscoverySource,
  DiscoveryView,
  SortKey,
} from './types';

/**
 * useDiscovery — orchestrates a discovery surface: it fetches the chosen feed from
 * the injected source, then applies distance/filter/sort on the client and tracks
 * the list⇄map view. Apps plug in a `source` + optional `origin` (user location);
 * the machinery is identical across restaurants, products, offers, etc.
 */
export function useDiscovery<T extends DiscoverableItem>(config: {
  source: DiscoverySource<T>;
  origin?: Coordinates | null;
  initialFeed?: DiscoveryFeed;
  initialView?: DiscoveryView;
  initialSort?: SortKey;
  initialFilters?: DiscoveryFilters;
}) {
  const { source, origin = null } = config;
  const [feed, setFeed] = useState<DiscoveryFeed>(config.initialFeed ?? 'all');
  const [view, setView] = useState<DiscoveryView>(config.initialView ?? 'list');
  const [sort, setSort] = useState<SortKey>(config.initialSort ?? 'relevance');
  const [filters, setFilters] = useState<DiscoveryFilters>(config.initialFilters ?? {});
  const [raw, setRaw] = useState<T[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);

  const ctx = useMemo<DiscoveryContext>(() => ({ origin, filters }), [origin, filters]);

  const fetchFeed = useCallback(
    async (which: DiscoveryFeed, c: DiscoveryContext): Promise<T[]> => {
      const s = source;
      const pick =
        (which === 'nearby' && s.fetchNearby) ||
        (which === 'trending' && s.fetchTrending) ||
        (which === 'recommended' && s.fetchRecommended) ||
        (which === 'favorites' && s.fetchFavorites) ||
        s.fetchAll;
      if (!pick) return [];
      return Promise.resolve(pick(c));
    },
    [source],
  );

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setError(null);
    Promise.resolve(fetchFeed(feed, ctx))
      .then((items) => {
        if (!alive) return;
        setRaw(items);
        setStatus('ready');
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e);
        setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [feed, ctx, fetchFeed]);

  const items = useMemo(() => {
    const filtered = applyFilters(raw, filters, origin);
    const distanced = withDistance(filtered, origin);
    // Default trending/nearby to a sensible sort unless the user chose one.
    const effectiveSort: SortKey = sort !== 'relevance' ? sort : feed === 'nearby' ? 'distance' : feed === 'trending' ? 'popularity' : 'relevance';
    return sortItems(distanced, effectiveSort);
  }, [raw, filters, origin, sort, feed]);

  const facets = useMemo(() => collectFacets(raw), [raw]);

  return {
    items,
    facets,
    status,
    error,
    feed,
    setFeed,
    view,
    setView,
    sort,
    setSort,
    filters,
    setFilters,
    patchFilters: (patch: Partial<DiscoveryFilters>) => setFilters((f) => ({ ...f, ...patch })),
  };
}
