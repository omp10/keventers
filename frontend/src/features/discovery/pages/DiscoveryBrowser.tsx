import { useMemo, useState } from 'react';

import { Icon } from '@/design-system';
import { useCapabilities } from '@/platform/capabilities';
import { SearchBar } from '../search';
import { DiscoveryFilters } from '../filters';
import { LocationPrompt } from '../location/LocationPrompt';
import { useDiscoveryOrigin } from '../location';
import { DiscoveryResults, ViewToggle } from '../components';
import { usePrefetchBranch, useDiscoveryController, type DiscoveryViewMode } from '../hooks';
import type { DiscoveryFilterState } from '../types';

/**
 * DiscoveryBrowser — the shared browse surface behind /discover, /search and
 * /nearby. One controller feeds search + filters + list/map/split, so the three
 * pages differ only by their initial state, never by duplicated logic. Search
 * works with or without an origin; location only sharpens ranking.
 */
export function DiscoveryBrowser({
  initialFilters,
  initialView = 'list',
  showLocationBar = true,
}: {
  initialFilters?: DiscoveryFilterState;
  initialView?: DiscoveryViewMode;
  showLocationBar?: boolean;
}) {
  const caps = useCapabilities();
  const origin = useDiscoveryOrigin();
  const controller = useDiscoveryController({ point: origin.point, initialView, initialFilters });
  const prefetch = usePrefetchBranch(origin.point);
  const [term, setTerm] = useState(initialFilters?.q ?? '');

  // Cuisine facets derived from the loaded set (presentation only — not serviceability).
  const cuisines = useMemo(() => {
    const set = new Set<string>();
    controller.branches.forEach((b) => b.restaurant.cuisines?.forEach((c) => set.add(c)));
    return [...set].slice(0, 12);
  }, [controller.branches]);

  const runSearch = (q: string) => {
    setTerm(q);
    controller.patchFilters({ q: q || undefined });
  };

  return (
    <div className="space-y-4">
      <SearchBar
        value={term}
        onChange={runSearch}
        onSubmit={runSearch}
        onSelect={(s) => {
          if (s.location) origin.setManualOrigin(s.location, s.label);
          runSearch(s.slug ? '' : s.label);
        }}
        origin={origin.point}
      />

      {showLocationBar && (
        <LocationPrompt
          origin={origin.origin}
          permission={origin.permission}
          status={origin.status}
          onUseLocation={() => void origin.requestGps()}
          onManualSearch={() => document.querySelector<HTMLInputElement>('input[type="search"]')?.focus()}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <DiscoveryFilters filters={controller.filters} patch={controller.patchFilters} reset={controller.resetFilters} cuisines={cuisines} className="min-w-0 flex-1" />
        <ViewToggle view={controller.view} setView={controller.setView} allowSplit={caps.hover} className="shrink-0" />
      </div>

      {typeof controller.total === 'number' && controller.total > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-foreground-muted">
          <Icon name="store" className="h-4 w-4" />
          {controller.total} place{controller.total === 1 ? '' : 's'}
        </p>
      )}

      <DiscoveryResults
        branches={controller.branches}
        view={controller.view}
        loading={controller.isLoading}
        hasNextPage={controller.hasNextPage}
        isFetchingNextPage={controller.isFetchingNextPage}
        fetchNextPage={controller.fetchNextPage}
        activeBranchId={controller.activeBranchId}
        setActiveBranchId={controller.setActiveBranchId}
        origin={origin.point}
        onPrefetch={prefetch}
      />
    </div>
  );
}
