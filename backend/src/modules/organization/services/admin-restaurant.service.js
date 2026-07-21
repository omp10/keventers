import { BaseService } from '#core/service/base.service.js';
import { ConflictError, NotFoundError } from '#core/errors/app-error.js';

import { RESTAURANT_STATUS } from '../constants/organization.constants.js';
import { branchRepository } from '../repositories/branch.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { restaurantRepository } from '../repositories/restaurant.repository.js';
import { entityId } from '../utils/id.util.js';
import { slugify, uniqueSlug } from '../utils/slug.util.js';

/**
 * Admin DTO for a BRAND (a restaurant). Carries the outlet count because that is
 * the number that makes the hierarchy legible in a list — "Keventers · 12
 * outlets" tells an admin what they're looking at; a bare name does not.
 */
export function toBrandDTO(restaurant, { organization = null, outletCount } = {}) {
  const s = restaurant.settings ?? {};
  return {
    id: entityId(restaurant),
    name: restaurant.name,
    slug: restaurant.slug,
    type: restaurant.type,
    cuisines: restaurant.cuisines ?? [],
    status: restaurant.status,
    organizationId: String(restaurant.organizationId),
    organization: organization ? { id: entityId(organization), name: organization.name } : undefined,
    outletCount: outletCount ?? undefined,
    branding: {
      logoUrl: s.branding?.logoUrl ?? null,
      coverImageUrl: s.branding?.coverImageUrl ?? null,
      primaryColor: s.theme?.primaryColor ?? null,
      secondaryColor: s.theme?.secondaryColor ?? null,
    },
    createdAt: restaurant.createdAt ?? null,
  };
}

/**
 * Brand (restaurant) administration for the platform admin.
 *
 * The admin panel previously had no way to reach this layer at all — it could
 * manage Organizations (the tenant) and Kitchens (the outlets), but the brand
 * BETWEEN them, which is what actually owns the menu, coupons and loyalty rule,
 * was unreachable. Everything here is platform-scoped: the caller is a super
 * admin, so there is no tenant to derive and ids are explicit.
 */
export class AdminRestaurantService extends BaseService {
  constructor({
    restaurants = restaurantRepository,
    branches = branchRepository,
    organizations = organizationRepository,
    eventBus,
  } = {}) {
    super({ name: 'organization.admin-restaurant', eventBus });
    this.restaurants = restaurants;
    this.branches = branches;
    this.organizations = organizations;
  }

  /** Outlet counts for a page of brands — one query, not one per row. */
  async #outletCounts(restaurantIds) {
    const counts = new Map();
    if (!restaurantIds.length) return counts;
    const rows = await this.branches.model.aggregate([
      { $match: { restaurantId: { $in: restaurantIds }, deletedAt: null } },
      { $group: { _id: '$restaurantId', n: { $sum: 1 } } },
    ]);
    for (const r of rows) counts.set(String(r._id), r.n);
    return counts;
  }

  async list(query = {}) {
    const filter = {};
    if (query.organizationId) filter.organizationId = query.organizationId;
    if (query.status) filter.status = query.status;
    const page = await this.restaurants.paginate({
      filter,
      search: query.search,
      sort: query.sort ?? '-createdAt',
      pagination: { page: query.page, limit: query.limit },
      allowedFilterFields: ['status', 'type', 'organizationId'],
    });

    const ids = page.items.map((r) => r._id ?? r.id);
    const [counts, orgs] = await Promise.all([
      this.#outletCounts(ids),
      this.organizations.find({ _id: { $in: page.items.map((r) => r.organizationId) } }, { limit: page.items.length || 1 }),
    ]);
    const orgById = new Map(orgs.map((o) => [entityId(o), o]));
    // `{ items, meta }` — the shape the admin list endpoints already use.
    // BaseService.paginated() emits `pagination` instead, which the controllers
    // here don't read, so the page meta would silently vanish.
    return {
      items: page.items.map((r) =>
        toBrandDTO(r, {
          organization: orgById.get(String(r.organizationId)),
          outletCount: counts.get(String(entityId(r))) ?? 0,
        }),
      ),
      meta: page.meta,
    };
  }

  async getById(id) {
    const restaurant = await this.restaurants.findById(id);
    if (!restaurant) throw new NotFoundError('Brand not found');
    const [organization, outlets] = await Promise.all([
      this.organizations.findById(restaurant.organizationId).catch(() => null),
      this.branches.find({ restaurantId: entityId(restaurant) }, { sort: 'name', limit: 200 }),
    ]);
    return {
      ...toBrandDTO(restaurant, { organization, outletCount: outlets.length }),
      outlets: outlets.map((b) => ({
        id: entityId(b),
        name: b.name,
        slug: b.slug ?? null,
        status: b.status,
        city: b.address?.city ?? null,
      })),
    };
  }

  async create(data, actorId = null) {
    const organization = await this.organizations.findById(data.organizationId);
    if (!organization) throw new NotFoundError('Organization not found');

    // Slugs are unique WITHIN an organization (see the model's index), so derive
    // and de-duplicate against that org rather than globally.
    const base = slugify(data.slug || data.name);
    const slug = await uniqueSlug(base, (candidate) =>
      this.restaurants.existsBySlugInOrg(data.organizationId, candidate),
    );
    if (await this.restaurants.existsBySlugInOrg(data.organizationId, slug)) {
      throw new ConflictError('A brand with this slug already exists in the organization');
    }

    const restaurant = await this.restaurants.create({
      organizationId: data.organizationId,
      name: data.name,
      slug,
      type: data.type,
      cuisines: data.cuisines ?? [],
      status: data.status ?? RESTAURANT_STATUS.ACTIVE,
    });
    this.audit.success('organization.brand.created', { actorId, targetId: entityId(restaurant), metadata: { name: data.name } });
    return toBrandDTO(restaurant, { organization, outletCount: 0 });
  }

  async update(id, data, actorId = null) {
    const restaurant = await this.restaurants.findById(id);
    if (!restaurant) throw new NotFoundError('Brand not found');

    const patch = {};
    for (const key of ['name', 'type', 'cuisines', 'status']) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    // Branding is nested under settings; merge so we never clobber sibling keys
    // (tax, hours, the loyalty rule) that other screens own.
    if (data.branding) {
      const s = restaurant.settings ?? {};
      patch.settings = {
        ...(s.toObject ? s.toObject() : s),
        branding: {
          ...(s.branding ?? {}),
          ...(data.branding.logoUrl !== undefined ? { logoUrl: data.branding.logoUrl } : {}),
          ...(data.branding.coverImageUrl !== undefined ? { coverImageUrl: data.branding.coverImageUrl } : {}),
        },
        theme: {
          ...(s.theme ?? {}),
          ...(data.branding.primaryColor !== undefined ? { primaryColor: data.branding.primaryColor } : {}),
          ...(data.branding.secondaryColor !== undefined ? { secondaryColor: data.branding.secondaryColor } : {}),
        },
      };
    }

    const updated = await this.restaurants.updateById(id, patch);
    this.audit.success('organization.brand.updated', { actorId, targetId: String(id), metadata: { keys: Object.keys(patch) } });
    return toBrandDTO(updated);
  }
}

export const adminRestaurantService = new AdminRestaurantService();
export default adminRestaurantService;
