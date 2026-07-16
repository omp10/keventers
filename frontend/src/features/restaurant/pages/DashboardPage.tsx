import { formatMoney } from '@/features/ordering';
import {
  useActivityFeed,
  useDashboardMetrics,
  useHourlyOrders,
  useOrderDrawer,
  useRevenueSeries,
  useTopProducts,
} from '../hooks';
import {
  ActivityFeedWidget,
  HourlyOrdersWidget,
  KitchenSlaWidget,
  KpiWidget,
  OrdersBreakdownWidget,
  PaymentsWidget,
  RevenueWidget,
  TopProductsWidget,
} from '../widgets';

/**
 * DashboardPage — the operations overview. Dense KPIs + charts + top products +
 * live activity. Every number comes from the backend Analytics Engine and stays
 * fresh via the realtime engine (no polling). Widgets are reusable (Admin later).
 */
export function DashboardPage() {
  const metrics = useDashboardMetrics();
  const revenue = useRevenueSeries('today');
  const hourly = useHourlyOrders();
  const top = useTopProducts(6);
  const activity = useActivityFeed();
  const drawer = useOrderDrawer();

  const m = metrics.data;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-foreground">Today</h1>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiWidget label="Revenue" value={formatMoney(m?.revenue)} icon="payment" loading={metrics.isLoading} delta={m?.revenueDeltaPct != null ? { value: m.revenueDeltaPct } : undefined} />
        <KpiWidget label="Orders" value={m?.orders ?? 0} icon="order" loading={metrics.isLoading} delta={m?.ordersDeltaPct != null ? { value: m.ordersDeltaPct } : undefined} />
        <KpiWidget label="Avg. order value" value={formatMoney(m?.avgOrderValue)} icon="trend" loading={metrics.isLoading} />
        <KpiWidget label="Avg. prep time" value={m?.avgPrepMinutes != null ? `${m.avgPrepMinutes}m` : '—'} icon="clock" positiveIsGood={false} loading={metrics.isLoading} />
      </div>

      {/* Operational status */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2"><OrdersBreakdownWidget metrics={m} /></div>
        <KitchenSlaWidget sla={m?.kitchenSla} loading={metrics.isLoading} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RevenueWidget data={revenue.data ?? []} loading={revenue.isLoading} total={m?.revenue} />
        <HourlyOrdersWidget data={hourly.data ?? []} loading={hourly.isLoading} />
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <TopProductsWidget products={top.data ?? []} loading={top.isLoading} />
        <PaymentsWidget revenue={m?.revenue} avgOrderValue={m?.avgOrderValue} loading={metrics.isLoading} />
        <ActivityFeedWidget items={activity.items} loading={activity.isLoading} onOpenOrder={drawer.open} />
      </div>
    </div>
  );
}
