import { BaseRepository } from '#core/repository/base.repository.js';

import { Branch } from '../models/branch.model.js';

export class BranchRepository extends BaseRepository {
  constructor(model = Branch) {
    super(model, { softDelete: true, searchableFields: ['name', 'code'] });
  }

  findByRestaurant(restaurantId, options = {}) {
    return this.find({ restaurantId }, options);
  }

  countByRestaurant(restaurantId, options = {}) {
    return this.count({ restaurantId }, options);
  }
}

export const branchRepository = new BranchRepository();
export default branchRepository;
