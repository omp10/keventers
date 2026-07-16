import { BaseService } from '#core/service/base.service.js';
import { NotFoundError } from '#core/errors/app-error.js';

import { BRANCH_STATUS, RESTAURANT_STATUS } from '../constants/organization.constants.js';
import { branchRepository } from '../repositories/branch.repository.js';
import { restaurantRepository } from '../repositories/restaurant.repository.js';
import { entityId } from '../utils/id.util.js';

/* ────────────────────────── geo + hours helpers ────────────────────────── */

const EARTH_RADIUS_M = 6_371_000;
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Great-circle distance in meters between two {lat, lng} points. */
function haversineMeters(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s)));
}

/** Current weekday key + minutes-since-midnight in the branch's timezone. */
function localNow(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'Asia/Kolkata',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
    const day = get('weekday').toLowerCase();
    const hour = Number(get('hour')) % 24;
    const minute = Number(get('minute'));
    return { day, minutes: hour * 60 + minute };
  } catch {
    const now = new Date();
    return { day: DAY_KEYS[now.getDay()], minutes: now.getHours() * 60 + now.getMinutes() };
  }
}

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm ?? '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

/**
 * Compute the customer-facing hours snapshot ({openNow, closesAt, opensAt})
 * from a branch's weekly businessHours in ITS timezone. Overnight windows
 * (close < open) are honored. This is the backend's authority — the client
 * never re-derives open state.
 */
function computeHours(businessHours = [], timezone) {
  const { day, minutes } = localNow(timezone);
  const byDay = new Map(businessHours.map((h) => [h.day, h]));
  const today = byDay.get(day);

  const isOpenAt = (entry, mins) => {
    if (!entry || entry.isOpen === false) return false;
    const open = toMinutes(entry.open);
    const close = toMinutes(entry.close);
    if (open == null || close == null) return false;
    return close >= open ? mins >= open && mins < close : mins >= open || mins < close;
  };

  if (isOpenAt(today, minutes)) {
    return { openNow: true, closesAt: today.close };
  }

  // Closed — find the next opening (today later, or scan following days).
  if (today && today.isOpen !== false && toMinutes(today.open) != null && minutes < toMinutes(today.open)) {
    return { openNow: false, opensAt: today.open };
  }
  const startIdx = DAY_KEYS.indexOf(day);
  for (let i = 1; i <= 7; i += 1) {
    const entry = byDay.get(DAY_KEYS[(startIdx + i) % 7]);
    if (entry && entry.isOpen !== false && entry.open) return { openNow: false, opensAt: entry.open };
  }
  return { openNow: false };
}

/* ────────────────────────────── DTO mapping ────────────────────────────── */

const geoPoint = (branch) => {
  const [lng, lat] = branch.location?.coordinates ?? [];
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

/** Map a (branch, restaurant) pair onto the public discovery Branch DTO. */
function toPublicBranch({ branch, restaurant }, origin) {
  const d = branch.discovery ?? {};
  const hours = computeHours(branch.businessHours, branch.settings?.timezone);
  const location = geoPoint(branch);

  const orderingStatus = !branch.settings?.acceptsOnlineOrders
    ? 'unavailable'
    : hours.openNow
      ? 'available'
      : 'closed';

  return {
    id: entityId(branch),
    slug: branch.slug,
    name: branch.name,
    restaurant: {
      id: entityId(restaurant),
      name: restaurant.name,
      slug: restaurant.slug,
      logoUrl: restaurant.settings?.branding?.logoUrl ?? undefined,
      cuisines: restaurant.cuisines ?? [],
    },
    coverImageUrl: d.coverImageUrl ?? undefined,
    location: location ?? { lat: 0, lng: 0 },
    address: [branch.address?.line1, branch.address?.line2].filter(Boolean).join(', ') || undefined,
    area: d.area || branch.address?.line2 || undefined,
    city: branch.address?.city || undefined,
    distanceMeters: origin && location ? haversineMeters(origin, location) : undefined,
    rating: d.rating ?? undefined,
    ratingCount: d.ratingCount || undefined,
    prepTimeMinutes: d.prepTimeMinutes ?? undefined,
    hours,
    services: (d.services ?? []).map((s) => ({
      mode: s.mode,
      available: Boolean(s.available),
      etaMinutes: s.etaMinutes ?? undefined,
    })),
    orderingStatus,
    featured: Boolean(d.featured) || undefined,
    promoted: Boolean(d.promoted) || undefined,
    offer: d.offer?.label ? { label: d.offer.label, description: d.offer.description || undefined } : null,
  };
}

function toPublicBranchDetail(pair, origin) {
  const { branch, restaurant } = pair;
  const d = branch.discovery ?? {};
  return {
    ...toPublicBranch(pair, origin),
    description: d.description || undefined,
    gallery: (d.gallery ?? []).map((g) => ({ url: g.url, alt: g.alt || undefined })),
    phone: restaurant.settings?.contact?.phone || undefined,
    email: restaurant.settings?.contact?.email || undefined,
    website: restaurant.settings?.contact?.website || undefined,
    amenities: d.amenities ?? [],
    reviewsSummary: d.rating ? { average: d.rating, count: d.ratingCount ?? 0 } : null,
  };
}

/* ─────────────────────────────── service ───────────────────────────────── */

const CATALOG_TTL_MS = 30_000;
const MAX_CATALOG = 500;

/**
 * PUBLIC DISCOVERY — the customer app's unauthenticated read surface (nearby /
 * search / popular / featured rails, suggestions, branch pages). The backend
 * owns distance, open-state and ordering-status; the client only renders.
 *
 * Implementation note: discoverable branches (active + slugged) are loaded with
 * their restaurants into a short-lived in-memory snapshot and ranked in
 * process. At the current catalog scale this beats per-request geo aggregation;
 * swap `#catalog()` for a $geoNear pipeline when the catalog grows past
 * MAX_CATALOG without touching any consumer.
 */
export class PublicDiscoveryService extends BaseService {
  constructor({ branches = branchRepository, restaurants = restaurantRepository, eventBus } = {}) {
    super({ name: 'org.public-discovery', eventBus });
    this.branches = branches;
    this.restaurants = restaurants;
    this._snapshot = null;
    this._snapshotAt = 0;
  }

  async #catalog() {
    const now = Date.now();
    if (this._snapshot && now - this._snapshotAt < CATALOG_TTL_MS) return this._snapshot;

    const branches = await this.branches.find(
      { status: BRANCH_STATUS.ACTIVE, slug: { $ne: null } },
      { limit: MAX_CATALOG },
    );
    const restaurantIds = [...new Set(branches.map((b) => String(b.restaurantId)))];
    const restaurants = await this.restaurants.find({ _id: { $in: restaurantIds } });
    const byId = new Map(restaurants.map((r) => [String(entityId(r)), r]));

    this._snapshot = branches
      .map((branch) => ({ branch, restaurant: byId.get(String(branch.restaurantId)) }))
      .filter((p) => p.restaurant && p.restaurant.status === RESTAURANT_STATUS.ACTIVE);
    this._snapshotAt = now;
    return this._snapshot;
  }

  /** Invalidate the snapshot (used by seeds/tests after writes). */
  invalidate() {
    this._snapshot = null;
  }

  /** Shared list pipeline: DTO-map → filter → sort → paginate. */
  async list(query = {}) {
    const origin =
      Number.isFinite(query.lat) && Number.isFinite(query.lng) ? { lat: query.lat, lng: query.lng } : null;
    const pairs = await this.#catalog();
    let items = pairs.map((p) => toPublicBranch(p, origin));

    const term = (query.q ?? '').trim().toLowerCase();
    if (term) {
      items = items.filter((b) =>
        [b.name, b.restaurant.name, b.area, b.city, ...(b.restaurant.cuisines ?? [])]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term)),
      );
    }
    if (query.openNow) items = items.filter((b) => b.hours.openNow);
    if (query.minRating) items = items.filter((b) => (b.rating ?? 0) >= query.minRating);
    if (origin && query.radiusKm) {
      items = items.filter((b) => b.distanceMeters != null && b.distanceMeters <= query.radiusKm * 1000);
    }
    if (query.services?.length) {
      items = items.filter((b) =>
        query.services.every((m) => b.services.some((s) => s.mode === m && s.available)),
      );
    }
    if (query.cuisines?.length) {
      const wanted = query.cuisines.map((c) => c.toLowerCase());
      items = items.filter((b) =>
        (b.restaurant.cuisines ?? []).some((c) => wanted.includes(String(c).toLowerCase())),
      );
    }

    const popularity = new Map(pairs.map((p) => [entityId(p.branch), p.branch.discovery?.popularityScore ?? 0]));
    const sort = query.sort ?? (origin ? 'nearest' : 'popular');
    const by = {
      nearest: (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
      rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
      popular: (a, b) => (popularity.get(b.id) ?? 0) - (popularity.get(a.id) ?? 0),
      newest: () => 0, // catalog order already reflects insertion; refined later
    };
    items.sort(by[sort] ?? by.popular);

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 12));
    const total = items.length;
    return {
      items: items.slice((page - 1) * limit, page * limit),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  /** Curated "popular" rail — top branches by popularity score. */
  async popular(query = {}) {
    const { items } = await this.list({ ...query, sort: 'popular', page: 1, limit: 10 });
    return items;
  }

  /** Featured / promoted rail. */
  async featured(query = {}) {
    const origin =
      Number.isFinite(query.lat) && Number.isFinite(query.lng) ? { lat: query.lat, lng: query.lng } : null;
    const pairs = await this.#catalog();
    return pairs
      .filter((p) => p.branch.discovery?.featured || p.branch.discovery?.promoted)
      .sort(
        (a, b) =>
          Number(Boolean(b.branch.discovery?.featured)) - Number(Boolean(a.branch.discovery?.featured)) ||
          (b.branch.discovery?.popularityScore ?? 0) - (a.branch.discovery?.popularityScore ?? 0),
      )
      .slice(0, 10)
      .map((p) => toPublicBranch(p, origin));
  }

  /** Search-bar autocomplete: branches, brands, areas, cities, cuisines. */
  async suggest(term = '') {
    const t = term.trim().toLowerCase();
    if (t.length < 2) return [];
    const pairs = await this.#catalog();
    const out = [];
    const seen = new Set();
    const push = (s) => {
      if (!seen.has(s.id) && out.length < 8) {
        seen.add(s.id);
        out.push(s);
      }
    };

    for (const { branch, restaurant } of pairs) {
      if (branch.name.toLowerCase().includes(t)) {
        push({ id: `branch-${entityId(branch)}`, label: branch.name, kind: 'branch', slug: branch.slug });
      }
      if (restaurant.name.toLowerCase().includes(t)) {
        push({ id: `rest-${entityId(restaurant)}`, label: restaurant.name, kind: 'restaurant', slug: branch.slug });
      }
      const area = branch.discovery?.area || branch.address?.line2;
      const loc = geoPoint(branch);
      if (area && area.toLowerCase().includes(t) && loc) {
        push({ id: `area-${area.toLowerCase()}`, label: area, kind: 'area', location: loc });
      }
      const city = branch.address?.city;
      if (city && city.toLowerCase().includes(t) && loc) {
        push({ id: `city-${city.toLowerCase()}`, label: city, kind: 'city', location: loc });
      }
      for (const cuisine of restaurant.cuisines ?? []) {
        if (cuisine.toLowerCase().includes(t)) {
          push({ id: `cuisine-${cuisine.toLowerCase()}`, label: cuisine, kind: 'cuisine' });
        }
      }
    }
    return out;
  }

  /** Full branch detail by SEO slug. */
  async branchBySlug(slug, query = {}) {
    const origin =
      Number.isFinite(query.lat) && Number.isFinite(query.lng) ? { lat: query.lat, lng: query.lng } : null;
    const pairs = await this.#catalog();
    const pair = pairs.find((p) => p.branch.slug === String(slug).toLowerCase());
    if (!pair) throw new NotFoundError('Branch not found');
    return toPublicBranchDetail(pair, origin);
  }
}

export const publicDiscoveryService = new PublicDiscoveryService();
export default publicDiscoveryService;
