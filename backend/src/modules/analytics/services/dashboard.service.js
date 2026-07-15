import { BaseService } from '#core/service/base.service.js';
import { config } from '#config';

import { DOMAIN, ENTITY_TYPE, METRIC, PERIOD } from '../constants/analytics.constants.js';
import {
  toCustomersDTO,
  toEntityDTO,
  toKitchenDTO,
  toNotificationsDTO,
  toOrdersDTO,
  toPaymentsDTO,
  toQrDTO,
  toSalesDTO,
} from '../dto/analytics.dto.js';
import { entityProjectionRepository } from '../repositories/entity-projection.repository.js';
import { timeBucketRepository } from '../repositories/time-bucket.repository.js';
import { analyticsRedisStore } from '../stores/analytics-redis.store.js';
import { periodKeys } from '../utils/period.util.js';
import { startOfUtcDay } from '../utils/date-range.util.js';
import { resolveRestaurantScope } from '../utils/tenant.util.js';

/**
 * Dashboard READ service — serves every restaurant dashboard STRICTLY from the
 * read-optimized projection collections (never from transactional data). Range
 * reads are indexed (period, periodKey) scans over compact pre-aggregated buckets;
 * averages/rates are derived in the DTOs. KPI widgets are cached in Redis and
 * invalidated by the projection writer on every update.
 */
export class DashboardService extends BaseService {
  constructor({ buckets = timeBucketRepository, entities = entityProjectionRepository, store = analyticsRedisStore, resolveScope = resolveRestaurantScope, cacheCfg = config.analytics.cache, eventBus } = {}) {
    super({ name: 'analytics.dashboard', eventBus });
    this.buckets = buckets;
    this.entities = entities;
    this.store = store;
    this.resolveScope = resolveScope;
    this.cacheCfg = cacheCfg;
  }

  #key(date, period) {
    return periodKeys(date)[period];
  }

  #summary(scope, domain, from, to) {
    return this.buckets.sumRange(scope, domain, PERIOD.DAY, this.#key(from, PERIOD.DAY), this.#key(to, PERIOD.DAY));
  }

  async #series(scope, domain, period, from, to) {
    const rows = await this.buckets.findRange(scope, domain, period, this.#key(from, period), this.#key(to, period));
    return rows.map((r) => ({ periodKey: r.periodKey, metrics: r.metrics ?? {} }));
  }

  /** Sum the `hourly` (24) / `weekday` (7) histograms across day buckets in range. */
  async #peaks(scope, domain, from, to) {
    const rows = await this.buckets.findRange(scope, domain, PERIOD.DAY, this.#key(from, PERIOD.DAY), this.#key(to, PERIOD.DAY));
    const hourly = new Array(24).fill(0);
    const weekday = new Array(7).fill(0);
    for (const r of rows) {
      (r.hourly ?? []).forEach((v, i) => { if (i < 24) hourly[i] += v ?? 0; });
      (r.weekday ?? []).forEach((v, i) => { if (i < 7) weekday[i] += v ?? 0; });
    }
    const peakHour = hourly.indexOf(Math.max(...hourly));
    const peakDay = weekday.indexOf(Math.max(...weekday));
    return { hourly, weekday, peakHour: hourly[peakHour] ? peakHour : null, peakDay: weekday[peakDay] ? peakDay : null };
  }

  // ==================== SECTIONS ====================

  async sales(tenant, restaurantId, range) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const [summary, series] = await Promise.all([
      this.#summary(scope, DOMAIN.SALES, range.from, range.to),
      this.#series(scope, DOMAIN.SALES, range.period, range.from, range.to),
    ]);
    return {
      summary: toSalesDTO(summary),
      series: series.map((s) => ({ periodKey: s.periodKey, ...toSalesDTO(s.metrics) })),
    };
  }

  async orders(tenant, restaurantId, range) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const [summary, peaks, series] = await Promise.all([
      this.#summary(scope, DOMAIN.ORDERS, range.from, range.to),
      this.#peaks(scope, DOMAIN.ORDERS, range.from, range.to),
      this.#series(scope, DOMAIN.ORDERS, range.period, range.from, range.to),
    ]);
    return {
      summary: toOrdersDTO(summary),
      peakHours: peaks.hourly,
      peakDays: peaks.weekday,
      peakHour: peaks.peakHour,
      peakDay: peaks.peakDay,
      series: series.map((s) => ({ periodKey: s.periodKey, ...toOrdersDTO(s.metrics) })),
    };
  }

  async products(tenant, restaurantId) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const [best, worst, categories, modifiers, addons] = await Promise.all([
      this.entities.topBy(scope, DOMAIN.PRODUCTS, ENTITY_TYPE.PRODUCT, METRIC.UNITS_SOLD, { limit: 10 }),
      this.entities.topBy(scope, DOMAIN.PRODUCTS, ENTITY_TYPE.PRODUCT, METRIC.UNITS_SOLD, { limit: 10, ascending: true }),
      this.entities.topBy(scope, DOMAIN.PRODUCTS, ENTITY_TYPE.CATEGORY, METRIC.PRODUCT_REVENUE, { limit: 20 }),
      this.entities.topBy(scope, DOMAIN.PRODUCTS, ENTITY_TYPE.MODIFIER, METRIC.USAGE_COUNT, { limit: 20 }),
      this.entities.topBy(scope, DOMAIN.PRODUCTS, ENTITY_TYPE.ADDON, METRIC.USAGE_COUNT, { limit: 20 }),
    ]);
    return {
      bestSelling: best.map(toEntityDTO),
      worstSelling: worst.map(toEntityDTO),
      categoryRevenue: categories.map(toEntityDTO),
      modifierUsage: modifiers.map(toEntityDTO),
      addonUsage: addons.map(toEntityDTO),
    };
  }

  async customers(tenant, restaurantId, range) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const summary = await this.#summary(scope, DOMAIN.CUSTOMERS, range.from, range.to);
    return { summary: toCustomersDTO(summary) };
  }

  async kitchen(tenant, restaurantId, range) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const [summary, chefs, stations] = await Promise.all([
      this.#summary(scope, DOMAIN.KITCHEN, range.from, range.to),
      this.entities.topBy(scope, DOMAIN.KITCHEN, ENTITY_TYPE.CHEF, METRIC.READY_COUNT, { limit: 20 }),
      this.entities.topBy(scope, DOMAIN.KITCHEN, ENTITY_TYPE.STATION, METRIC.READY_COUNT, { limit: 20 }),
    ]);
    return { summary: toKitchenDTO(summary), chefPerformance: chefs.map(toEntityDTO), stationPerformance: stations.map(toEntityDTO) };
  }

  async payments(tenant, restaurantId, range) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const [summary, providers] = await Promise.all([
      this.#summary(scope, DOMAIN.PAYMENTS, range.from, range.to),
      this.entities.findByType(scope, DOMAIN.PAYMENTS, ENTITY_TYPE.PROVIDER),
    ]);
    return { summary: toPaymentsDTO(summary), providerDistribution: providers.map(toEntityDTO) };
  }

  async qr(tenant, restaurantId, range) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const [summary, tables] = await Promise.all([
      this.#summary(scope, DOMAIN.QR, range.from, range.to),
      this.entities.topBy(scope, DOMAIN.TABLES, ENTITY_TYPE.TABLE, METRIC.SESSIONS_STARTED, { limit: 50 }),
    ]);
    return { summary: toQrDTO(summary), tableUtilization: tables.map(toEntityDTO) };
  }

  // ==================== HEADLINE DASHBOARD ====================

  /** Restaurant KPI dashboard — today's headline numbers (cached). */
  async dashboard(tenant, restaurantId) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const cached = await this.store.getKpi(scope.restaurantId, 'dashboard');
    if (cached) return cached;

    const today = startOfUtcDay();
    const dayKey = this.#key(today, PERIOD.DAY);
    const [salesToday, ordersToday, custToday, qrToday, bestProducts, peaks] = await Promise.all([
      this.buckets.findBucket(scope, DOMAIN.SALES, PERIOD.DAY, dayKey),
      this.buckets.findBucket(scope, DOMAIN.ORDERS, PERIOD.DAY, dayKey),
      this.buckets.findBucket(scope, DOMAIN.CUSTOMERS, PERIOD.DAY, dayKey),
      this.buckets.findBucket(scope, DOMAIN.QR, PERIOD.DAY, dayKey),
      this.entities.topBy(scope, DOMAIN.PRODUCTS, ENTITY_TYPE.PRODUCT, METRIC.UNITS_SOLD, { limit: 5 }),
      this.#peaks(scope, DOMAIN.ORDERS, new Date(today.getTime() - 29 * 86400000), today),
    ]);
    const sales = toSalesDTO(salesToday?.metrics ?? {});
    const qr = toQrDTO(qrToday?.metrics ?? {});
    const dto = {
      date: dayKey,
      todaysRevenue: sales.netRevenue,
      todaysGrossRevenue: sales.grossRevenue,
      todaysOrders: (ordersToday?.metrics?.[METRIC.ORDERS_PLACED]) ?? 0,
      todaysCompletedOrders: sales.ordersCompleted,
      averageTicketSize: sales.averageOrderValue,
      newCustomers: custToday?.metrics?.[METRIC.NEW_CUSTOMERS] ?? 0,
      // Open tables today ≈ started − (completed + abandoned). A live gauge is
      // available from the QR/KDS modules; this is the projection-derived view.
      activeTables: Math.max(0, (qr.sessionsStarted ?? 0) - (qr.sessionsCompleted ?? 0) - (qr.sessionsAbandoned ?? 0)),
      topProducts: bestProducts.map(toEntityDTO),
      peakHour: peaks.peakHour,
      peakHours: peaks.hourly,
    };
    await this.store.setKpi(scope.restaurantId, 'dashboard', dto, this.cacheCfg.dashboardTtlSeconds);
    return dto;
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
