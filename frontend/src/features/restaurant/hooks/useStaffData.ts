import { useQueryResource } from '@/platform/query';
import { contextService, staffAnalyticsService, type AnalyticsRange } from '../services';
import { activityStore, useActivityItems } from '../realtime/activity-store';
import type { AnalyticsOverview, DashboardMetrics, HourlyPoint, SeriesPoint, StaffContext, TopProduct } from '../types';
import { K } from './keys';

/** The staff operational context (restaurant / branch / socket rooms). */
export function useStaffContext() {
  return useQueryResource<StaffContext>(K.context(), () => contextService.current(), { staleTime: 300_000, retry: false });
}

/** Today's KPI metrics — kept fresh by realtime invalidation, not polling. */
export function useDashboardMetrics() {
  return useQueryResource<DashboardMetrics>(K.dashboard(), () => staffAnalyticsService.dashboard(), { staleTime: 15_000 });
}

export function useRevenueSeries(range: AnalyticsRange = 'today') {
  return useQueryResource<SeriesPoint[]>(K.revenue(range), () => staffAnalyticsService.revenueSeries(range), { staleTime: 60_000 });
}

export function useHourlyOrders() {
  return useQueryResource<HourlyPoint[]>(K.hourly(), () => staffAnalyticsService.hourlyOrders(), { staleTime: 60_000 });
}

export function useTopProducts(limit = 5) {
  return useQueryResource<TopProduct[]>(K.topProducts(), () => staffAnalyticsService.topProducts(limit), { staleTime: 60_000 });
}

export function useAnalyticsOverview(range: AnalyticsRange = 'today') {
  return useQueryResource<AnalyticsOverview>(K.overview(range), () => staffAnalyticsService.overview(range), { staleTime: 60_000 });
}

/**
 * Recent activity feed — seeds from the server once, then stays live via the
 * activity store (fed by the realtime engine). Returns the merged, live list.
 */
export function useActivityFeed() {
  const query = useQueryResource(K.activity(), async () => {
    const items = await staffAnalyticsService.activity();
    activityStore.seed(items);
    return items;
  }, { staleTime: 30_000 });
  const items = useActivityItems();
  return { items, isLoading: query.isLoading };
}
