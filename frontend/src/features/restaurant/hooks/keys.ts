import { qk } from '@/platform/query';
import type { OrderFilters, AnalyticsRange } from '../services';

/** Centralized query keys for the staff dashboard (precise realtime invalidation). */
export const K = {
  context: () => qk('staff', 'context'),
  dashboard: () => qk('staff', 'dashboard'),
  orders: (filters?: OrderFilters) => qk('staff', 'orders', filters ?? {}),
  order: (id?: string) => qk('staff', 'order', id ?? null),
  revenue: (range: AnalyticsRange) => qk('staff', 'revenue', range),
  hourly: () => qk('staff', 'hourly'),
  topProducts: () => qk('staff', 'top-products'),
  overview: (range: AnalyticsRange) => qk('staff', 'overview', range),
  activity: () => qk('staff', 'activity'),
};
