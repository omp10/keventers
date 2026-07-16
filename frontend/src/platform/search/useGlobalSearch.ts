import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { usePermissions } from '@/platform/permissions';
import { searchRegistry, type SearchProvider, type SearchResult } from './registry';

/** Register a search provider for the lifetime of a component. */
export function useSearchProvider(provider: SearchProvider) {
  useEffect(() => searchRegistry.register(provider), [provider]);
}

function useProviders(): SearchProvider[] {
  return useSyncExternalStore(
    (cb) => searchRegistry.subscribe(cb),
    () => searchRegistry.all(),
    () => searchRegistry.all(),
  );
}

export type SearchGroup = { group: string; results: SearchResult[] };

/**
 * useGlobalSearch — debounced, cancellable, permission-filtered search across all
 * registered providers. Returns results grouped by provider. Consumed by the
 * command palette + any global-search UI.
 */
export function useGlobalSearch(query: string, opts?: { debounceMs?: number; minLength?: number }) {
  const { debounceMs = 180, minLength = 1 } = opts ?? {};
  const providers = useProviders();
  const { can } = usePermissions();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const permitted = useMemo(() => providers.filter((p) => can(p.access)), [providers, can]);

  useEffect(() => {
    const q = query.trim();
    abortRef.current?.abort();
    if (q.length < minLength) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const settled = await Promise.allSettled(permitted.map((p) => Promise.resolve(p.search(q, controller.signal))));
        if (controller.signal.aborted) return;
        setResults(settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : [])));
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, permitted, debounceMs, minLength]);

  const groups = useMemo<SearchGroup[]>(() => {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      const arr = map.get(r.group) ?? [];
      arr.push(r);
      map.set(r.group, arr);
    }
    return [...map.entries()].map(([group, res]) => ({ group, results: res }));
  }, [results]);

  return { results, groups, isSearching };
}
