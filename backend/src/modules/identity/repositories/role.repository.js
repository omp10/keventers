import { BaseRepository } from '#core/repository/base.repository.js';

import { Role } from '../models/role.model.js';

/**
 * Role data access. Only layer touching the Role collection.
 */
export class RoleRepository extends BaseRepository {
  constructor(model = Role) {
    super(model, { softDelete: true, searchableFields: ['name', 'displayName', 'description'] });
  }

  findByName(name, options = {}) {
    return this.findOne({ name: String(name).toLowerCase() }, options);
  }

  /** Batch fetch by names in a single query (avoids N+1 at auth time). */
  findByNames(names = [], options = {}) {
    return this.find({ name: { $in: names.map((n) => String(n).toLowerCase()) } }, options);
  }

  existsByName(name) {
    return this.exists({ name: String(name).toLowerCase() });
  }
}

export const roleRepository = new RoleRepository();
export default roleRepository;
