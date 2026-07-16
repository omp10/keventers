import { distanceMeters, type Coordinates } from '@/platform/location';
import type { DiscoverableItem, DiscoveryFilters, SortKey } from './types';

/** Pure text match across an item's string-ish fields + tags. */
function matchesQuery(item: DiscoverableItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [item.name, item.title, item.label, ...(item.tags ?? [])]
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function applyFilters<T extends DiscoverableItem>(items: T[], filters: DiscoveryFilters, origin?: Coordinates | null): T[] {
  return items.filter((item) => {
    if (filters.query && !matchesQuery(item, filters.query)) return false;
    if (filters.tags?.length && !filters.tags.every((t) => item.tags?.includes(t))) return false;
    if (filters.radiusMeters && origin && item.location) {
      if (distanceMeters(origin, item.location) > filters.radiusMeters) return false;
    }
    return true;
  });
}

/** Attach a `_distance` (metres) to items when an origin is known. */
export function withDistance<T extends DiscoverableItem>(items: T[], origin?: Coordinates | null): Array<T & { _distance?: number }> {
  if (!origin) return items;
  return items.map((i) => (i.location ? { ...i, _distance: distanceMeters(origin, i.location) } : i));
}

export function sortItems<T extends DiscoverableItem & { _distance?: number; createdAt?: string }>(items: T[], key: SortKey): T[] {
  const copy = [...items];
  switch (key) {
    case 'distance':
      return copy.sort((a, b) => (a._distance ?? Infinity) - (b._distance ?? Infinity));
    case 'popularity':
      return copy.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    case 'newest':
      return copy.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
    case 'relevance':
    default:
      return copy;
  }
}

/** Collect the distinct facet values present in a result set (for filter chips). */
export function collectFacets<T extends DiscoverableItem>(items: T[]): string[] {
  const set = new Set<string>();
  for (const i of items) i.tags?.forEach((t) => set.add(t));
  return [...set].sort();
}
