import { api } from '@/platform/api';
import type { ActivityItem, AnalyticsOverview, DashboardMetrics, HourlyPoint, SeriesPoint, TopProduct } from '../types';

/**
 * STAFF ANALYTICS SERVICE — reads the backend Analytics Engine projections. ALL
 * numbers (revenue, counts, averages, rates, SLA) are computed by the backend; the
 * frontend only renders them. Realtime freshness comes from the Socket Platform
 * invalidating these queries — never polling.
 */
export type AnalyticsRange = 'today' | '7d' | '30d';

class StaffAnalyticsService {
  dashboard() {
    return api.get<DashboardMetrics>('/restaurant/analytics/dashboard');
  }

  revenueSeries(range: AnalyticsRange = 'today') {
    return api.get<SeriesPoint[]>('/restaurant/analytics/revenue', { query: { range } });
  }

  hourlyOrders() {
    return api.get<HourlyPoint[]>('/restaurant/analytics/hourly');
  }

  topProducts(limit = 5) {
    return api.get<TopProduct[]>('/restaurant/analytics/top-products', { query: { limit } });
  }

  overview(range: AnalyticsRange = 'today') {
    return api.get<AnalyticsOverview>('/restaurant/analytics/overview', { query: { range } });
  }

  /** Initial recent-activity load; live updates arrive via the Socket Platform. */
  activity() {
    return api.get<ActivityItem[]>('/restaurant/activity');
  }
}

export const staffAnalyticsService = new StaffAnalyticsService();
