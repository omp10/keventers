import { useEffect, useState } from 'react';

import { qk, useQueryResource } from '@/platform/query';
import { discoveryService } from '../services';
import type { GeoPoint, PlaceSuggestion } from '../types';

/**
 * useDiscoverySearch — debounced autocomplete for the discovery search bar. Returns
 * place/brand suggestions from the backend. Extensible: the backend can add offer/
 * promotion/reservation suggestion kinds without any change here.
 */
export function useDiscoverySearch(term: string, origin?: GeoPoint | null, opts?: { debounceMs?: number; minLength?: number }) {
  const { debounceMs = 200, minLength = 2 } = opts ?? {};
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), debounceMs);
    return () => clearTimeout(t);
  }, [term, debounceMs]);

  const enabled = debounced.length >= minLength;
  const query = useQueryResource<PlaceSuggestion[]>(
    qk('discovery', 'suggest', debounced, origin ?? null),
    () => discoveryService.suggest(debounced, origin ?? undefined),
    { enabled, staleTime: 60_000 },
  );

  return {
    suggestions: enabled ? query.data ?? [] : [],
    isSearching: enabled && query.isFetching,
    term: debounced,
  };
}
