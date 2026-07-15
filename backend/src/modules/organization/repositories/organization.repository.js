import { BaseRepository } from '#core/repository/base.repository.js';

import { Organization } from '../models/organization.model.js';

export class OrganizationRepository extends BaseRepository {
  constructor(model = Organization) {
    super(model, { softDelete: true, searchableFields: ['name', 'brandName', 'slug'] });
  }

  findBySlug(slug, options = {}) {
    return this.findOne({ slug: String(slug).toLowerCase() }, options);
  }

  existsBySlug(slug) {
    return this.exists({ slug: String(slug).toLowerCase() });
  }

  findByOwner(ownerUserId, options = {}) {
    return this.find({ ownerUserId }, options);
  }
}

export const organizationRepository = new OrganizationRepository();
export default organizationRepository;
