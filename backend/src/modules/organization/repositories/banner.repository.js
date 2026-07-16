import { BaseRepository } from '#core/repository/base.repository.js';

import { Banner, BANNER_STATUS } from '../models/banner.model.js';

export class BannerRepository extends BaseRepository {
  constructor(model = Banner) {
    super(model, { softDelete: true, searchableFields: ['title', 'subtitle'] });
  }

  /**
   * Active banners for a placement, inside their scheduling window, in display
   * order — exactly what the public customer endpoint serves.
   */
  async findLive(placement, { now = new Date(), limit = 10 } = {}) {
    const docs = await this.model
      .find({
        placement,
        status: BANNER_STATUS.ACTIVE,
        deletedAt: { $in: [null, undefined] },
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      })
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(limit)
      .exec();
    return docs.map((d) => this.toDomain(d));
  }
}

export const bannerRepository = new BannerRepository();
export default bannerRepository;
