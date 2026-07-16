import { BaseService } from '#core/service/base.service.js';

import {
  CAMPAIGN_STATUS,
  NOTIFICATION_ERRORS,
} from '../constants/notification.constants.js';
import { toCampaignDTO } from '../dto/notification.dto.js';
import { campaignRepository } from '../repositories/campaign.repository.js';
import { entityId } from '../utils/id.util.js';
import { loadForStaff, resolveRestaurantScope } from '../utils/tenant.util.js';

/**
 * Campaign service. Owns the restaurant campaign CATALOG + scheduling + reporting
 * counters. Audience EXECUTION (segment queries → batched fan-out into the outbox)
 * is a later phase; the model + status machine + reporting are in place so it
 * plugs into the SAME outbox/delivery pipeline without redesign. All campaign
 * changes are audited.
 */
export class CampaignService extends BaseService {
  constructor({ campaigns = campaignRepository, resolveScope = resolveRestaurantScope, eventBus } = {}) {
    super({ name: 'notification.campaign', eventBus });
    this.campaigns = campaigns;
    this.resolveScope = resolveScope;
  }

  async createCampaign(tenant, restaurantId, data, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const campaign = await this.campaigns.createScoped(scope, {
      name: data.name,
      description: data.description ?? null,
      category: data.category,
      channels: data.channels ?? [],
      templateKey: data.templateKey,
      segment: data.segment ?? {},
      variables: data.variables ?? {},
      status: data.scheduledAt ? CAMPAIGN_STATUS.SCHEDULED : CAMPAIGN_STATUS.DRAFT,
      scheduledAt: data.scheduledAt ?? null,
      createdBy: actorId,
    });
    this.audit.success('notification.campaign.created', { actorId, targetId: entityId(campaign), metadata: { name: data.name } });
    return toCampaignDTO(campaign);
  }

  async listCampaigns(tenant, restaurantId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const page = await this.campaigns.paginateForStaff(scope, {
      filter: query.status ? { status: query.status } : {},
      search: query.search,
      sort: query.sort ?? '-createdAt',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toCampaignDTO);
  }

  async getCampaign(tenant, id) {
    const campaign = await loadForStaff(this.campaigns, tenant, id, NOTIFICATION_ERRORS.CAMPAIGN_NOT_FOUND);
    return toCampaignDTO(campaign);
  }

  async updateCampaign(tenant, id, data, actorId = null) {
    const campaign = await loadForStaff(this.campaigns, tenant, id, NOTIFICATION_ERRORS.CAMPAIGN_NOT_FOUND);
    const patch = {};
    for (const f of ['name', 'description', 'channels', 'templateKey', 'segment', 'variables', 'scheduledAt']) if (data[f] !== undefined) patch[f] = data[f];
    if (data.scheduledAt) patch.status = CAMPAIGN_STATUS.SCHEDULED;
    const updated = await this.campaigns.updateById(entityId(campaign), patch);
    this.audit.success('notification.campaign.updated', { actorId, targetId: entityId(campaign) });
    return toCampaignDTO(updated);
  }

  async cancelCampaign(tenant, id, actorId = null) {
    const campaign = await loadForStaff(this.campaigns, tenant, id, NOTIFICATION_ERRORS.CAMPAIGN_NOT_FOUND);
    const updated = await this.campaigns.updateById(entityId(campaign), { status: CAMPAIGN_STATUS.CANCELLED });
    this.audit.success('notification.campaign.cancelled', { actorId, targetId: entityId(campaign) });
    return toCampaignDTO(updated);
  }

  /** Record delivery outcomes against a campaign's reporting counters. */
  recordStats(campaignId, inc) {
    return this.campaigns.bumpStats(campaignId, inc);
  }
}

export const campaignService = new CampaignService();
export default campaignService;
