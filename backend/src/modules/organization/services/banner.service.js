import { BaseService } from '#core/service/base.service.js';
import { NotFoundError } from '#core/errors/app-error.js';

import { BANNER_PLACEMENT } from '../models/banner.model.js';
import { bannerRepository } from '../repositories/banner.repository.js';
import { entityId } from '../utils/id.util.js';

/** Public banner DTO — exactly what the customer app renders. */
export function toBannerDTO(banner) {
  return {
    id: entityId(banner),
    placement: banner.placement,
    title: banner.title,
    subtitle: banner.subtitle || undefined,
    theme: banner.theme,
    imageUrl: banner.imageUrl || undefined,
    cta: banner.cta?.label ? { label: banner.cta.label, href: banner.cta.href || '' } : undefined,
    branchSlug: banner.branchSlug || undefined,
    sortOrder: banner.sortOrder ?? 0,
  };
}

/** Admin DTO — adds lifecycle fields the dashboard needs. */
export function toBannerAdminDTO(banner) {
  return {
    ...toBannerDTO(banner),
    status: banner.status,
    startsAt: banner.startsAt ?? null,
    endsAt: banner.endsAt ?? null,
    createdAt: banner.createdAt,
    updatedAt: banner.updatedAt,
  };
}

/**
 * Banner curation — ADMIN-MANAGED promotional content for customer surfaces.
 * Super admins create/schedule/order banners; the public read serves only
 * live ones. No pricing/business rules live here — banners are pure content.
 */
export class BannerService extends BaseService {
  constructor({ banners = bannerRepository, eventBus } = {}) {
    super({ name: 'org.banner', eventBus });
    this.banners = banners;
  }

  async #getOrThrow(id) {
    const banner = await this.banners.findById(id);
    if (!banner) throw new NotFoundError('Banner not found');
    return banner;
  }

  /** PUBLIC: live banners for a placement, in display order. */
  async listLive(placement = BANNER_PLACEMENT.CUSTOMER_HOME) {
    const banners = await this.banners.findLive(placement);
    return banners.map(toBannerDTO);
  }

  /** ADMIN: paginated list (any status). */
  async list(query = {}) {
    const page = await this.banners.paginate({
      filter: {
        ...(query.placement ? { placement: query.placement } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      search: query.search,
      sort: query.sort ?? 'sortOrder',
      pagination: { page: query.page, limit: query.limit },
    });
    return { items: page.items.map(toBannerAdminDTO), meta: page.meta };
  }

  async create(data, actorId = null) {
    const banner = await this.banners.create({ ...data, createdBy: actorId });
    this.audit.success('banner.created', { actorId, targetId: entityId(banner) });
    return toBannerAdminDTO(banner);
  }

  async update(id, data, actorId = null) {
    await this.#getOrThrow(id);
    const banner = await this.banners.updateById(id, data);
    this.audit.success('banner.updated', { actorId, targetId: id });
    return toBannerAdminDTO(banner);
  }

  async remove(id, actorId = null) {
    await this.#getOrThrow(id);
    await this.banners.deleteById(id);
    this.audit.success('banner.deleted', { actorId, targetId: id });
    return { id };
  }
}

export const bannerService = new BannerService();
export default bannerService;
