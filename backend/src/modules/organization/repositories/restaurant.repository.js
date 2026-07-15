import { BaseRepository } from '#core/repository/base.repository.js';

import { Restaurant } from '../models/restaurant.model.js';

export class RestaurantRepository extends BaseRepository {
  constructor(model = Restaurant) {
    super(model, { softDelete: true, searchableFields: ['name', 'slug'] });
  }

  /** All restaurants in an organization (tenant-scoped). */
  findByOrganization(organizationId, options = {}) {
    return this.find({ organizationId }, options);
  }

  findFirstByOrganization(organizationId, options = {}) {
    return this.findOne({ organizationId }, options);
  }

  existsBySlugInOrg(organizationId, slug) {
    return this.exists({ organizationId, slug: String(slug).toLowerCase() });
  }
}

export const restaurantRepository = new RestaurantRepository();
export default restaurantRepository;
