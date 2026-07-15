import { Table } from '../models/table.model.js';

import { BranchScopedRepository } from './branch-scoped.repository.js';

export class TableRepository extends BranchScopedRepository {
  constructor(model = Table) {
    super(model, { softDelete: true, searchableFields: ['number', 'name', 'zone', 'floor'] });
  }

  existsByNumber(scope, number) {
    return this.existsScoped(scope, { number: String(number) });
  }

  findByGroup(scope, groupId, options = {}) {
    return this.findScoped(scope, { groupId }, { sort: 'displayOrder', ...options });
  }

  countByGroup(scope, groupId, options = {}) {
    return this.countScoped(scope, { groupId }, options);
  }
}

export const tableRepository = new TableRepository();
export default tableRepository;
