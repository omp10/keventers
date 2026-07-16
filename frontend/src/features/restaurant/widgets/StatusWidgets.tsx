import { Card, CircularProgress, Icon } from '@/design-system';
import { formatMoney } from '@/features/ordering';
import { cn } from '@/lib/cn';
import type { DashboardMetrics, Money } from '../types';

/** Kitchen SLA gauge — on-time rate + breach count (backend-computed). */
export function KitchenSlaWidget({ sla, loading }: { sla?: DashboardMetrics['kitchenSla']; loading?: boolean }) {
  const rate = Math.round((sla?.onTimeRate ?? 0) * (sla && sla.onTimeRate <= 1 ? 100 : 1));
  const tone = rate >= 90 ? 'success' : rate >= 75 ? 'warning' : 'danger';
  return (
    <Card padding="md" className="flex items-center gap-4">
      <CircularProgress value={loading ? 0 : rate} size={64} strokeWidth={6} tone={tone} showValue indeterminate={loading} />
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Icon name="flame" className="h-4 w-4 text-primary" /> Kitchen SLA
        </h3>
        <p className="text-xs text-foreground-muted">On-time rate today</p>
        {sla?.breachedCount ? <p className="mt-1 text-xs font-medium text-danger">{sla.breachedCount} breached</p> : null}
      </div>
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-border p-2.5 text-center">
      <p className={cn('text-xl font-bold tabular-nums', tone)}>{value}</p>
      <p className="text-[0.6875rem] text-foreground-muted">{label}</p>
    </div>
  );
}

/** Live orders breakdown widget (live / preparing / completed / cancelled). */
export function OrdersBreakdownWidget({ metrics }: { metrics?: DashboardMetrics }) {
  return (
    <Card padding="md">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon name="order" className="h-4 w-4 text-primary" /> Orders now
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Live" value={metrics?.live ?? 0} tone="text-info" />
        <MiniStat label="Preparing" value={metrics?.preparing ?? 0} tone="text-primary" />
        <MiniStat label="Completed" value={metrics?.completed ?? 0} tone="text-success" />
        <MiniStat label="Cancelled" value={metrics?.cancelled ?? 0} tone="text-danger" />
      </div>
    </Card>
  );
}

/** Payments summary widget (revenue + average order value today). */
export function PaymentsWidget({ revenue, avgOrderValue, loading }: { revenue?: Money; avgOrderValue?: Money; loading?: boolean }) {
  return (
    <Card padding="md">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon name="payment" className="h-4 w-4 text-primary" /> Payments
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-foreground-muted">Captured today</p>
          <p className="text-lg font-bold text-foreground">{loading ? '—' : formatMoney(revenue)}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Avg. order</p>
          <p className="text-lg font-bold text-foreground">{loading ? '—' : formatMoney(avgOrderValue)}</p>
        </div>
      </div>
    </Card>
  );
}
