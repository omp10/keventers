import { BaseRepository } from '#core/repository/base.repository.js';

import { StorefrontCategory, CATEGORY_STATUS } from '../models/category.model.js';

export class CategoryRepository extends BaseRepository {
  constructor(model = StorefrontCategory) {
    super(model, { softDelete: true, searchableFields: ['name', 'slug', 'searchTerm'] });
  }

  /** Live categories for the customer storefront, in display order. */
  async findLive({ featuredOnly = true, limit = 20 } = {}) {
    const docs = await this.model
      .find({
        status: CATEGORY_STATUS.ACTIVE,
        deletedAt: { $in: [null, undefined] },
        ...(featuredOnly ? { featured: true } : {}),
      })
      .sort({ sortOrder: 1, name: 1 })
      .limit(limit)
      .exec();
    return docs.map((d) => this.toDomain(d));
  }
}

export const categoryRepository = new CategoryRepository();
export default categoryRepository;
