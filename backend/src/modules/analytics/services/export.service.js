import { BaseService } from '#core/service/base.service.js';
import { BadRequestError } from '#core/errors/app-error.js';

import { ANALYTICS_ERRORS, EXPORT_FORMAT } from '../constants/analytics.constants.js';
import { exporterRegistry } from '../interfaces/exporter.interface.js';
import { resolveRestaurantScope } from '../utils/tenant.util.js';

import { dashboardService } from './dashboard.service.js';

/**
 * Report export service. Pulls a report's rows from the DASHBOARD projections
 * (never transactional data) and serializes them via the pluggable exporter
 * (CSV implemented; Excel/PDF are interfaces enabled by registering a renderer).
 * Export generation is audited.
 */
export class ExportService extends BaseService {
  constructor({ dashboard = dashboardService, exporters = exporterRegistry, resolveScope = resolveRestaurantScope, eventBus } = {}) {
    super({ name: 'analytics.export', eventBus });
    this.dashboard = dashboard;
    this.exporters = exporters;
    this.resolveScope = resolveScope;
  }

  /** Build the tabular rows for a named report from the projections. */
  async #rows(tenant, restaurantId, report, range) {
    switch (report) {
      case 'sales': {
        const s = await this.dashboard.sales(tenant, restaurantId, range);
        return { rows: s.series.map((r) => ({ period: r.periodKey, grossRevenue: r.grossRevenue, netRevenue: r.netRevenue, tax: r.taxTotal, discount: r.discountTotal, refunds: r.refundTotal, ordersCompleted: r.ordersCompleted, aov: r.averageOrderValue })), columns: SALES_COLUMNS };
      }
      case 'orders': {
        const s = await this.dashboard.orders(tenant, restaurantId, range);
        return { rows: s.series.map((r) => ({ period: r.periodKey, placed: r.ordersPlaced, completed: r.ordersCompleted, cancelled: r.ordersCancelled, avgPrepMs: r.averagePrepTimeMs, avgCompletionMs: r.averageCompletionTimeMs })), columns: ORDER_COLUMNS };
      }
      case 'products': {
        const p = await this.dashboard.products(tenant, restaurantId);
        return { rows: p.bestSelling.map((e) => ({ productId: e.entityId, name: e.name, unitsSold: e.metrics.unitsSold ?? 0, revenue: e.metrics.revenue ?? 0 })), columns: PRODUCT_COLUMNS };
      }
      default:
        throw new BadRequestError(ANALYTICS_ERRORS.PROJECTION_NOT_FOUND);
    }
  }

  async exportReport(tenant, restaurantId, { report, format = EXPORT_FORMAT.CSV, range }, actorId = null) {
    const exporter = this.exporters.get(format);
    if (!exporter) throw new BadRequestError(ANALYTICS_ERRORS.UNSUPPORTED_FORMAT);
    if (!this.exporters.isReady(format)) throw new BadRequestError(`${format} export is not available yet`);
    // Resolve scope (also enforces tenant access via the dashboard reads).
    await this.resolveScope(tenant, restaurantId);
    const { rows, columns } = await this.#rows(tenant, restaurantId, report, range);
    const out = exporter.export(rows, columns);
    this.audit.success('analytics.export', { actorId, targetId: String(restaurantId), metadata: { report, format, rows: rows.length } });
    return { filename: `${report}-${Date.now()}.${out.extension}`, mimeType: out.mimeType, content: out.content };
  }
}

const SALES_COLUMNS = [
  { key: 'period', label: 'Period' },
  { key: 'grossRevenue', label: 'Gross Revenue' },
  { key: 'netRevenue', label: 'Net Revenue' },
  { key: 'tax', label: 'Tax' },
  { key: 'discount', label: 'Discount' },
  { key: 'refunds', label: 'Refunds' },
  { key: 'ordersCompleted', label: 'Orders Completed' },
  { key: 'aov', label: 'Avg Order Value' },
];
const ORDER_COLUMNS = [
  { key: 'period', label: 'Period' },
  { key: 'placed', label: 'Placed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'avgPrepMs', label: 'Avg Prep (ms)' },
  { key: 'avgCompletionMs', label: 'Avg Completion (ms)' },
];
const PRODUCT_COLUMNS = [
  { key: 'productId', label: 'Product Id' },
  { key: 'name', label: 'Name' },
  { key: 'unitsSold', label: 'Units Sold' },
  { key: 'revenue', label: 'Revenue' },
];

export const exportService = new ExportService();
export default exportService;
