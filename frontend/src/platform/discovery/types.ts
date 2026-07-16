import type { Coordinates } from '@/platform/location';

/**
 * DISCOVERY PLATFORM — reusable machinery for "browse & find" surfaces (nearby,
 * trending, recommended, favorites, recent) with filtering, sorting, and list/map
 * views. It's generic over the item type; apps supply the data source + item
 * shape. No business entity is hardcoded here.
 */
export type DiscoverableItem = {
  id: string;
  /** Optional coordinates enable distance sort + map view. */
  location?: Coordinates;
  /** Optional popularity signal for trending. */
  score?: number;
  /** Arbitrary facet tags used by filters (cuisine, category, price band…). */
  tags?: string[];
  [key: string]: unknown;
};

export type DiscoveryFeed = 'nearby' | 'trending' | 'recommended' | 'favorites' | 'recent' | 'all';

export type DiscoveryView = 'list' | 'map';

export type SortKey = 'relevance' | 'distance' | 'popularity' | 'newest';

export type DiscoveryFilters = {
  query?: string;
  tags?: string[];
  /** Max distance in metres (requires user location + item.location). */
  radiusMeters?: number;
  [key: string]: unknown;
};

/**
 * A data source the app plugs in. Every method is optional — the engine falls
 * back to `fetchAll` + client-side derivation when a feed isn't provided.
 */
export type DiscoverySource<T extends DiscoverableItem> = {
  fetchAll?: (ctx: DiscoveryContext) => Promise<T[]> | T[];
  fetchNearby?: (ctx: DiscoveryContext) => Promise<T[]> | T[];
  fetchTrending?: (ctx: DiscoveryContext) => Promise<T[]> | T[];
  fetchRecommended?: (ctx: DiscoveryContext) => Promise<T[]> | T[];
  fetchFavorites?: (ctx: DiscoveryContext) => Promise<T[]> | T[];
};

export type DiscoveryContext = {
  origin?: Coordinates | null;
  filters: DiscoveryFilters;
};
