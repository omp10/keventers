import { api } from '@/platform/api';
import type { Branch, BranchDetail, DiscoveryQuery, PlaceSuggestion } from '../types';

/**
 * DISCOVERY SERVICE — the ONE place the Customer app talks to the backend Discovery
 * APIs. Components never call `api` directly; they go Pages → hooks → this service
 * → API Platform. The backend owns nearby/distance/availability/serviceability; we
 * only pass the query and render what comes back.
 *
 * Endpoints are centralized here as a documented contract, so re-pointing to the
 * real backend routes is a one-file change. All discovery reads are public
 * (`skipAuth`) — a guest can browse before any session exists.
 */
const BASE = '/public/discovery';

/** Flatten the typed query into API query params (arrays → comma lists). */
function toParams(q: DiscoveryQuery): Record<string, string | number | boolean | undefined> {
  return {
    q: q.q || undefined,
    lat: q.lat,
    lng: q.lng,
    radiusKm: q.radiusKm,
    openNow: q.openNow || undefined,
    minRating: q.minRating,
    services: q.services?.length ? q.services.join(',') : undefined,
    cuisines: q.cuisines?.length ? q.cuisines.join(',') : undefined,
    sort: q.sort,
    page: q.page,
    limit: q.limit,
  };
}

class DiscoveryService {
  /** Nearby branches for an origin (backend computes distance + ordering status). */
  nearby(query: DiscoveryQuery) {
    return api.paginate<Branch>(`${BASE}/nearby`, { query: toParams(query), skipAuth: true });
  }

  /** Full search across restaurants/branches/areas/cuisines with filters + sort. */
  search(query: DiscoveryQuery) {
    return api.paginate<Branch>(`${BASE}/search`, { query: toParams(query), skipAuth: true });
  }

  /** Curated popular branches near an origin (home rails). */
  popular(query: DiscoveryQuery) {
    return api.get<Branch[]>(`${BASE}/popular`, { query: toParams(query), skipAuth: true });
  }

  /** Featured / promoted branches (home rails, sponsor slots — future). */
  featured(query: DiscoveryQuery) {
    return api.get<Branch[]>(`${BASE}/featured`, { query: toParams(query), skipAuth: true });
  }

  /** Autocomplete suggestions for the search bar (areas, cities, cuisines, brands). */
  suggest(term: string, origin?: { lat: number; lng: number }) {
    return api.get<PlaceSuggestion[]>(`${BASE}/suggest`, { query: { q: term, lat: origin?.lat, lng: origin?.lng }, skipAuth: true });
  }

  /** Full branch detail by SEO slug (never by DB id). */
  branchBySlug(slug: string, origin?: { lat: number; lng: number }) {
    return api.get<BranchDetail>(`/public/branches/${encodeURIComponent(slug)}`, { query: { lat: origin?.lat, lng: origin?.lng }, skipAuth: true });
  }
}

export const discoveryService = new DiscoveryService();
