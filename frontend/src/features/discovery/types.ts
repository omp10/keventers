import type { DiscoverableItem } from '@/platform/discovery';

/**
 * DISCOVERY DOMAIN TYPES — modeled on the BACKEND'S branch-based architecture.
 * The ordering location is always a BRANCH, never a Restaurant. Discovery returns
 * branches; each carries its own location, hours, distance, services, and ordering
 * status. The frontend RENDERS these — it never computes distance, serviceability,
 * or availability (the backend is authoritative).
 *
 * Extends the platform's generic `DiscoverableItem` so branches flow through the
 * Discovery Platform engine (view/feed/favorites) without adapters.
 */
export type GeoPoint = { lat: number; lng: number };

export type ServiceMode = 'dine_in' | 'takeaway' | 'delivery' | 'drive_thru' | 'curbside';

/** Backend-decided ordering availability for a branch. */
export type OrderingStatus = 'available' | 'busy' | 'unavailable' | 'closed' | 'coming_soon';

export type OpeningHours = {
  /** Open right now — computed by the backend in the branch's timezone. */
  openNow: boolean;
  /** Human 'HH:mm' the branch closes/opens next, if provided. */
  closesAt?: string;
  opensAt?: string;
};

export type BranchServiceInfo = {
  mode: ServiceMode;
  available: boolean;
  /** Prep / delivery estimate in minutes (backend). */
  etaMinutes?: number;
};

export type RestaurantSummary = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  cuisines?: string[];
};

export type BranchOffer = { label: string; description?: string };

/** A discoverable branch — the core unit of the Discovery experience. */
export type Branch = DiscoverableItem & {
  id: string;
  /** SEO-friendly slug used in URLs (/r/:slug). Never expose DB ids. */
  slug: string;
  name: string;
  restaurant: RestaurantSummary;
  coverImageUrl?: string;
  location: GeoPoint;
  address?: string;
  area?: string;
  city?: string;
  /** Backend-computed straight-line/route distance. Absent when no origin. */
  distanceMeters?: number;
  rating?: number;
  ratingCount?: number;
  prepTimeMinutes?: number;
  hours: OpeningHours;
  services: BranchServiceInfo[];
  orderingStatus: OrderingStatus;
  featured?: boolean;
  promoted?: boolean;
  offer?: BranchOffer | null;
};

export type BranchDetail = Branch & {
  description?: string;
  gallery?: { url: string; alt?: string }[];
  phone?: string;
  email?: string;
  website?: string;
  amenities?: string[];
  /** Placeholder for the future Reviews module. */
  reviewsSummary?: { average: number; count: number } | null;
  /** Future: other branches of the same chain. */
  siblingBranches?: Branch[];
};

// ---- Discovery query contract (frontend → backend) --------------------------
export type DiscoverySort = 'nearest' | 'rating' | 'popular' | 'newest';

export type DiscoveryFilterState = {
  q?: string;
  radiusKm?: number;
  openNow?: boolean;
  minRating?: number;
  services?: ServiceMode[];
  cuisines?: string[];
  sort?: DiscoverySort;
};

export type DiscoveryQuery = DiscoveryFilterState & {
  lat?: number;
  lng?: number;
  page?: number;
  limit?: number;
};

/**
 * ADMIN-MANAGED promotional banner (homepage carousel). Curated by platform
 * admins via /admin/banners; the client renders `theme` through its design
 * tokens so banners stay white-label.
 */
export type PromoBanner = {
  id: string;
  title: string;
  subtitle?: string;
  theme: 'brand' | 'accent' | 'image';
  imageUrl?: string;
  cta?: { label: string; href: string };
  branchSlug?: string;
  sortOrder: number;
};

/**
 * ADMIN-MANAGED storefront browse category (the home tiles). Curated via
 * /admin/categories; `searchTerm` is what tapping the tile searches for.
 */
export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  icon: string;
  searchTerm: string;
  sortOrder: number;
};

/** Lightweight place suggestion for the search autocomplete. */
export type PlaceSuggestion = {
  id: string;
  label: string;
  kind: 'area' | 'city' | 'cuisine' | 'restaurant' | 'branch';
  location?: GeoPoint;
  slug?: string;
};
