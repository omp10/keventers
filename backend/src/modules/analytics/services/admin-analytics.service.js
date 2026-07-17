import { BaseService } from '#core/service/base.service.js';

import { DOMAIN, ENTITY_TYPE, PERIOD } from '../constants/analytics.constants.js';
import {
  toCustomersDTO,
  toEntityDTO,
  toNotificationsDTO,
  toOrdersDTO,
  toPaymentsDTO,
  toSalesDTO,
} from '../dto/analytics.dto.js';
import { entityProjectionRepository } from '../repositories/entity-projection.repository.js';
import { timeBucketRepository } from '../repositories/time-bucket.repository.js';
import { periodKeys } from '../utils/period.util.js';

/**
 * Platform (super-admin) analytics — aggregates the read-optimized projections
 * across ALL tenants (optionally within one organization). Revenue/orders/
 * customers/payment-provider distribution/notification health all come from the
 * projection collections, never from transactional data.
 */
export class AdminAnalyticsService extends BaseService {
  constructor({ buckets = timeBucketRepository, entities = entityProjectionRepository, eventBus } = {}) {
    super({ name: 'analytics.admin', eventBus });
    this.buckets = buckets;
    this.entities = entities;
  }

  #key(date, period = PERIOD.DAY) {
    return periodKeys(date)[period];
  }

  async #platformSum(domain, range, scope) {
    return this.buckets.sumPlatform(domain, PERIOD.DAY, this.#key(range.from), this.#key(range.to), scope);
  }

  /**
   * Platform-wide KPIs (revenue, orders, customers, provider mix, notif health).
   *
   * `scope` narrows the same projections progressively — organization, then
   * restaurant, then a single branch — so the kitchen detail page reads one
   * outlet's numbers through the same path the platform dashboard uses, rather
   * than a parallel implementation that could drift from it.
   */
  async platform(range, { organizationId = null, restaurantId = null, branchId = null } = {}) {
    const scope = { organizationId, restaurantId, branchId };
    const [sales, orders, customers, payments, notifications, providers] = await Promise.all([
      this.#platformSum(DOMAIN.SALES, range, scope),
      this.#platformSum(DOMAIN.ORDERS, range, scope),
      this.#platformSum(DOMAIN.CUSTOMERS, range, scope),
      this.#platformSum(DOMAIN.PAYMENTS, range, scope),
      this.#platformSum(DOMAIN.NOTIFICATIONS, range, scope),
      this.entities.aggregatePlatform(DOMAIN.PAYMENTS, ENTITY_TYPE.PROVIDER, { organizationId }),
    ]);
    return {
      sales: toSalesDTO(sales),
      orders: toOrdersDTO(orders),
      customers: toCustomersDTO(customers),
      payments: toPaymentsDTO(payments),
      notificationHealth: toNotificationsDTO(notifications),
      providerDistribution: providers.map(toEntityDTO),
    };
  }

  async revenue(range, { organizationId = null, restaurantId = null, branchId = null } = {}) {
    const sales = await this.#platformSum(DOMAIN.SALES, range, { organizationId, restaurantId, branchId });
    return { summary: toSalesDTO(sales) };
  }

  /** Restaurant leaderboard by revenue (aggregate all-time sales per restaurant). */
  async restaurants({ organizationId = null } = {}) {
    const rows = await this.buckets.model.aggregate([
      { $match: { domain: DOMAIN.SALES, period: PERIOD.ALL, ...(organizationId ? { organizationId } : {}) } },
      { $project: { restaurantId: 1, net: { $ifNull: ['$metrics.netRevenue', 0] }, orders: { $ifNull: ['$metrics.ordersCompleted', 0] } } },
      { $sort: { net: -1 } },
      { $limit: 100 },
    ]);
    return rows.map((r) => ({ restaurantId: String(r.restaurantId), netRevenue: r.net, ordersCompleted: r.orders }));
  }

  async providers(range, { organizationId = null } = {}) {
    const providers = await this.entities.aggregatePlatform(DOMAIN.PAYMENTS, ENTITY_TYPE.PROVIDER, { organizationId });
    const channels = await this.entities.aggregatePlatform(DOMAIN.NOTIFICATIONS, ENTITY_TYPE.CHANNEL, { organizationId });
    return { paymentProviders: providers.map(toEntityDTO), notificationChannels: channels.map(toEntityDTO) };
  }
}

export const adminAnalyticsService = new AdminAnalyticsService();
export default adminAnalyticsService;
