import { BaseService } from '#core/service/base.service.js';
import { NotFoundError, ValidationError } from '#core/errors/app-error.js';

import { BRANCH_STATUS } from '../constants/organization.constants.js';
import { branchRepository } from '../repositories/branch.repository.js';
import { restaurantRepository } from '../repositories/restaurant.repository.js';
import { entityId } from '../utils/id.util.js';
import { slugify, uniqueSlug } from '../utils/slug.util.js';

import { publicDiscoveryService } from './public-discovery.service.js';

/**
 * Admin DTO for a "kitchen" (an outlet/branch as customers discover it). Flat
 * and edit-shaped: exactly the fields the admin form binds to.
 */
export function toKitchenAdminDTO(branch, restaurant) {
  const d = branch.discovery ?? {};
  const [lng, lat] = branch.location?.coordinates ?? [];
  return {
    id: entityId(branch),
    name: branch.name,
    code: branch.code || '',
    slug: branch.slug || '',
    status: branch.status,
    restaurant: restaurant
      ? { id: entityId(restaurant), name: restaurant.name, slug: restaurant.slug }
      : undefined,
    restaurantId: String(branch.restaurantId),
    address: {
      line1: branch.address?.line1 || '',
      city: branch.address?.city || '',
      state: branch.address?.state || '',
      pincode: branch.address?.pincode || '',
    },
    location: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
    discovery: {
      coverImageUrl: d.coverImageUrl || '',
      description: d.description || '',
      area: d.area || '',
      rating: d.rating ?? null,
      ratingCount: d.ratingCount ?? 0,
      prepTimeMinutes: d.prepTimeMinutes ?? null,
      featured: Boolean(d.featured),
      promoted: Boolean(d.promoted),
      offer: d.offer?.label ? { label: d.offer.label, description: d.offer.description || '' } : null,
      popularityScore: d.popularityScore ?? 0,
      services: (d.services ?? []).map((s) => ({
        mode: s.mode,
        available: Boolean(s.available),
        etaMinutes: s.etaMinutes ?? null,
      })),
    },
    acceptsOnlineOrders: branch.settings?.acceptsOnlineOrders !== false,
    tableCount: branch.settings?.tableCount ?? 0,
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
  };
}

/** {lat,lng} → GeoJSON Point (null clears the position). */
const toPoint = (loc) =>
  loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)
    ? { type: 'Point', coordinates: [loc.lng, loc.lat] }
    : null;

/**
 * KITCHEN ADMINISTRATION — the platform-admin view of outlets. This owns the
 * DISCOVERY PROFILE (slug, position, cover art, rating, offers, service modes)
 * that decides what customers see in nearby/trending/featured and on a branch
 * page. Tenant-scoped branch CRUD still belongs to BranchService; this is the
 * super-admin's cross-tenant storefront control.
 *
 * Every write invalidates the public discovery snapshot so the customer app
 * reflects changes on the next request rather than after the cache TTL.
 */
export class AdminKitchenService extends BaseService {
  constructor({
    branches = branchRepository,
    restaurants = restaurantRepository,
    discovery = publicDiscoveryService,
    eventBus,
  } = {}) {
    super({ name: 'org.admin-kitchen', eventBus });
    this.branches = branches;
    this.restaurants = restaurants;
    this.discovery = discovery;
  }

  async #getOrThrow(id) {
    const branch = await this.branches.findById(id);
    if (!branch) throw new NotFoundError('Kitchen not found');
    return branch;
  }

  /** Attach each branch's restaurant in one round-trip (no N+1). */
  async #withRestaurants(branches) {
    const ids = [...new Set(branches.map((b) => String(b.restaurantId)))];
    const restaurants = await this.restaurants.find({ _id: { $in: ids } });
    const byId = new Map(restaurants.map((r) => [String(entityId(r)), r]));
    return branches.map((b) => toKitchenAdminDTO(b, byId.get(String(b.restaurantId))));
  }

  /** ADMIN: paginated kitchens across all tenants. */
  async list(query = {}) {
    const page = await this.branches.paginate({
      filter: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.restaurantId ? { restaurantId: query.restaurantId } : {}),
      },
      search: query.search,
      sort: query.sort ?? '-createdAt',
      pagination: { page: query.page, limit: query.limit },
    });
    return { items: await this.#withRestaurants(page.items), meta: page.meta };
  }

  async get(id) {
    const branch = await this.#getOrThrow(id);
    const restaurant = await this.restaurants.findById(branch.restaurantId);
    return toKitchenAdminDTO(branch, restaurant);
  }

  /** Build the persisted patch from the flat admin payload. */
  async #toPersist(data, { branch = null } = {}) {
    const patch = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.code !== undefined) patch.code = data.code;
    if (data.status !== undefined) patch.status = data.status;
    if (data.address !== undefined) patch.address = { ...(branch?.address ?? {}), ...data.address };
    if (data.location !== undefined) patch.location = toPoint(data.location);

    if (data.slug !== undefined) {
      const base = data.slug || data.name || branch?.name;
      patch.slug = base
        ? await uniqueSlug(slugify(base), async (candidate) => {
            const existing = await this.branches.findOne({ slug: candidate });
            return Boolean(existing) && entityId(existing) !== (branch ? entityId(branch) : null);
          })
        : null;
    }

    if (data.discovery !== undefined) {
      const current = branch?.discovery ?? {};
      const d = data.discovery;
      patch.discovery = {
        ...current,
        ...d,
        // An empty offer label means "no offer" rather than an empty banner.
        offer: d.offer?.label ? { label: d.offer.label, description: d.offer.description ?? '' } : null,
        services: d.services ?? current.services ?? [],
      };
    }

    if (data.acceptsOnlineOrders !== undefined || data.tableCount !== undefined) {
      patch.settings = {
        ...(branch?.settings ?? { currency: 'INR', timezone: 'Asia/Kolkata' }),
        ...(data.acceptsOnlineOrders !== undefined ? { acceptsOnlineOrders: data.acceptsOnlineOrders } : {}),
        ...(data.tableCount !== undefined ? { tableCount: data.tableCount } : {}),
      };
    }
    return patch;
  }

  async create(data, actorId = null) {
    const restaurant = await this.restaurants.findById(data.restaurantId);
    if (!restaurant) throw new ValidationError('A valid restaurantId is required');

    const patch = await this.#toPersist({ ...data, slug: data.slug ?? data.name });
    const branch = await this.branches.create({
      organizationId: restaurant.organizationId,
      restaurantId: entityId(restaurant),
      businessHours: data.businessHours ?? [],
      status: data.status ?? BRANCH_STATUS.ACTIVE,
      ...patch,
      settings: {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        acceptsOnlineOrders: data.acceptsOnlineOrders !== false,
        tableCount: data.tableCount ?? 0,
      },
    });

    this.discovery.invalidate();
    this.audit.success('kitchen.created', { actorId, targetId: entityId(branch) });
    return toKitchenAdminDTO(branch, restaurant);
  }

  async update(id, data, actorId = null) {
    const existing = await this.#getOrThrow(id);
    const patch = await this.#toPersist(data, { branch: existing });
    const branch = await this.branches.updateById(id, patch);
    const restaurant = await this.restaurants.findById(branch.restaurantId);

    this.discovery.invalidate();
    this.audit.success('kitchen.updated', { actorId, targetId: id });
    return toKitchenAdminDTO(branch, restaurant);
  }

  async remove(id, actorId = null) {
    await this.#getOrThrow(id);
    await this.branches.deleteById(id);
    this.discovery.invalidate();
    this.audit.success('kitchen.deleted', { actorId, targetId: id });
    return { id };
  }

  /** Restaurant options for the kitchen form's owner picker. */
  async restaurantOptions() {
    const restaurants = await this.restaurants.find({}, { limit: 200, sort: 'name' });
    return restaurants.map((r) => ({ id: entityId(r), name: r.name, slug: r.slug, status: r.status }));
  }
}

export const adminKitchenService = new AdminKitchenService();
export default adminKitchenService;
