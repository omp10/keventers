import { BaseRepository } from '#core/repository/base.repository.js';

import { Staff } from '../models/staff.model.js';

/**
 * Staff data access. Only layer touching the Staff collection.
 */
export class StaffRepository extends BaseRepository {
  constructor(model = Staff) {
    super(model, { softDelete: true, searchableFields: ['employeeId', 'designation', 'department'] });
  }

  findByUserId(userId, options = {}) {
    return this.findOne({ userId }, options);
  }

  findByEmployeeId(employeeId, options = {}) {
    return this.findOne({ employeeId }, options);
  }

  existsByEmployeeId(employeeId) {
    return this.exists({ employeeId });
  }
}

export const staffRepository = new StaffRepository();
export default staffRepository;
