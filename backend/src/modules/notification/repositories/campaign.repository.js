import { NotificationCampaign } from '../models/notification-campaign.model.js';

import { NotificationScopedRepository } from './notification-scoped.repository.js';

/** Campaign repository (restaurant-scoped). */
export class CampaignRepository extends NotificationScopedRepository {
  constructor(model = NotificationCampaign) {
    super(model, { softDelete: true, searchableFields: ['name', 'description'] });
  }

  /** Atomic stat increments (delivery reporting). */
  async bumpStats(id, inc = {}) {
    const $inc = {};
    for (const [k, v] of Object.entries(inc)) if (v) $inc[`stats.${k}`] = v;
    if (!Object.keys($inc).length) return this.findById(id);
    const doc = await this.model.findByIdAndUpdate(id, { $inc }, { new: true });
    return this.toDomain(doc);
  }

  findDue(now = new Date(), limit = 50) {
    return this.find({ status: 'scheduled', scheduledAt: { $lte: now }, deletedAt: null }, { limit });
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['status', 'category'] });
  }
}

export const campaignRepository = new CampaignRepository();
export default campaignRepository;
