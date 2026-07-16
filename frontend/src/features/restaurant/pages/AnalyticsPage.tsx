import { useState } from 'react';

import { formatMoney } from '@/features/ordering';
import { cn } from '@/lib/cn';
import { useAnalyticsOverview } from '../hooks';
import type { AnalyticsRange } from '../services';
import { HourlyOrdersWidget, KpiWidget, RevenueWidget, TopProductsWidget } from '../widgets';

const RANGES: { key: AnalyticsRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
];

const pct = (v?: number) => (v == null ? '—' : `${Math.round(v <= 1 ? v * 100 : v)}%`);

/**
 * AnalyticsPage — the analytics overview. Consumes the backend Analytics Engine
 * (revenue, orders, avg ticket, prep time, completion/cancellation rates, peak
 * hours, best sellers). Realtime-fresh, read-only — no frontend calculations.
 */
export function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('today');
  const q = useAnalyticsOverview(range);
  const a = q.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <div role="tablist" aria-label="Range" className="inline-flex rounded-lg border border-border bg-surface p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={range === r.key}
              onClick={() => setRange(r.key)}
              className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition', range === r.key ? 'bg-primary text-primary-foreground' : 'text-foreground-muted hover:text-foreground')}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiWidget label="Revenue" value={formatMoney(a?.revenue)} icon="payment" loading={q.isLoading} />
        <KpiWidget label="Orders" value={a?.orders ?? 0} icon="order" loading={q.isLoading} />
        <KpiWidget label="Avg. ticket" value={formatMoney(a?.avgTicket)} icon="trend" loading={q.isLoading} />
        <KpiWidget label="Completion rate" value={pct(a?.completionRate)} icon="checkCircle" loading={q.isLoading} />
        <KpiWidget label="Cancellation rate" value={pct(a?.cancellationRate)} icon="close" positiveIsGood={false} loading={q.isLoading} />
        <KpiWidget label="Customers" value={a?.customerCount ?? 0} icon="users" loading={q.isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RevenueWidget data={a?.revenueSeries ?? []} loading={q.isLoading} total={a?.revenue} />
        <HourlyOrdersWidget data={a?.peakHours ?? []} loading={q.isLoading} />
      </div>

      <TopProductsWidget products={a?.bestSellers ?? []} loading={q.isLoading} />
    </div>
  );
}
