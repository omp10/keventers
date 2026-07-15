import { RebuildRun } from '../models/rebuild-run.model.js';

import { AnalyticsScopedRepository } from './analytics-scoped.repository.js';

/** RebuildRun repository (rebuild/reconciliation audit records). */
export class RebuildRunRepository extends AnalyticsScopedRepository {
  constructor(model = RebuildRun) {
    super(model, { softDelete: false });
  }

  createScoped(scope, data) {
    return this.create({ organizationId: scope.organizationId, restaurantId: scope.restaurantId, branchId: scope.branchId ?? null, ...data });
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['type', 'status', 'domain'] });
  }
}

export const rebuildRunRepository = new RebuildRunRepository();
export default rebuildRunRepository;
