import { BaseRepository } from '#core/repository/base.repository.js';

import { Zone, ZONE_STATUS } from '../models/zone.model.js';

export class ZoneRepository extends BaseRepository {
  constructor(model = Zone) {
    super(model, { softDelete: true, searchableFields: ['name', 'code', 'city'] });
  }

  /** Active zones, in display order. */
  async findLive({ city, limit = 100 } = {}) {
    const docs = await this.model
      .find({
        status: ZONE_STATUS.ACTIVE,
        deletedAt: { $in: [null, undefined] },
        ...(city ? { city } : {}),
      })
      .sort({ sortOrder: 1, name: 1 })
      .limit(limit)
      .exec();
    return docs.map((d) => this.toDomain(d));
  }
}

export const zoneRepository = new ZoneRepository();
export default zoneRepository;
