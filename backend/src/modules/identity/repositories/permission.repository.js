import { BaseRepository } from '#core/repository/base.repository.js';

import { Permission } from '../models/permission.model.js';

/**
 * Permission data access. Only layer touching the Permission collection.
 */
export class PermissionRepository extends BaseRepository {
  constructor(model = Permission) {
    super(model, { softDelete: true, searchableFields: ['name', 'resource', 'description'] });
  }

  findByName(name, options = {}) {
    return this.findOne({ name: String(name).toLowerCase() }, options);
  }

  findByNames(names = [], options = {}) {
    return this.find({ name: { $in: names.map((n) => String(n).toLowerCase()) } }, options);
  }

  existsByName(name) {
    return this.exists({ name: String(name).toLowerCase() });
  }
}

export const permissionRepository = new PermissionRepository();
export default permissionRepository;
