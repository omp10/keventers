import { TableGroup } from '../models/table-group.model.js';

import { BranchScopedRepository } from './branch-scoped.repository.js';

export class TableGroupRepository extends BranchScopedRepository {
  constructor(model = TableGroup) {
    super(model, { softDelete: true, searchableFields: ['name', 'floor', 'description'] });
  }

  existsByName(scope, name) {
    return this.existsScoped(scope, { name: String(name) });
  }
}

export const tableGroupRepository = new TableGroupRepository();
export default tableGroupRepository;
