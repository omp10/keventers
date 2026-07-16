import { Card, CircularProgress, Icon } from '@/design-system';
import { KpiWidget } from '@/features/restaurant';
import { cn } from '@/lib/cn';
import { formatDuration, PrepTimer, SlaBadge } from '../components';
import { useKitchenMetrics, useKitchenQueue } from '../hooks';
import type { KitchenEntry } from '../types';

const pct = (v?: number) => (v == null ? 0 : Math.round(v <= 1 ? v * 100 : v));

/**
 * KitchenDashboard — the at-a-glance operations view. KPIs + SLA + performance +
 * a live "needs attention" list. Every number is backend-computed (Analytics /
 * Kitchen engine) and stays fresh via the realtime engine — no polling. Reuses the
 * F4.1 KpiWidget.
 */
export function KitchenDashboard() {
  const metrics = useKitchenMetrics();
  const queue = useKitchenQueue();
  const m = metrics.data;

  const attention = (queue.data ?? []).filter((e) => e.sla.state !== 'on_time' && e.status !== 'served' && e.status !== 'cancelled');

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-foreground">Kitchen overview</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiWidget label="Active" value={m?.active ?? 0} icon="flame" loading={metrics.isLoading} />
        <KpiWidget label="Waiting" value={m?.waiting ?? 0} icon="clock" positiveIsGood={false} loading={metrics.isLoading} />
        <KpiWidget label="Preparing" value={m?.preparing ?? 0} icon="flame" loading={metrics.isLoading} />
        <KpiWidget label="Ready" value={m?.ready ?? 0} icon="bag" loading={metrics.isLoading} />
        <KpiWidget label="Served today" value={m?.served ?? 0} icon="checkCircle" loading={metrics.isLoading} />
        <KpiWidget label="Avg prep time" value={m?.avgPrepSeconds != null ? formatDuration(m.avgPrepSeconds) : '—'} icon="clock" positiveIsGood={false} loading={metrics.isLoading} />
        <KpiWidget label="SLA on-time" value={`${pct(m?.sla.onTimeRate)}%`} icon="check" loading={metrics.isLoading} />
        <KpiWidget label="SLA breached" value={m?.sla.breached ?? 0} icon="warning" positiveIsGood={false} loading={metrics.isLoading} />
      </div>

      {/* Performance + SLA */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card padding="md" className="flex items-center gap-4">
          <CircularProgress value={pct(m?.performance)} size={72} strokeWidth={7} tone={pct(m?.performance) >= 85 ? 'success' : pct(m?.performance) >= 70 ? 'warning' : 'danger'} showValue indeterminate={metrics.isLoading} />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Kitchen performance</h3>
            <p className="text-xs text-foreground-muted">Backend-scored efficiency</p>
          </div>
        </Card>
        <Card padding="md" className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-foreground">SLA status</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <SlaStat label="On time" value={m?.sla ? Math.max(0, (m.active ?? 0) - (m.sla.approaching ?? 0) - (m.sla.breached ?? 0)) : 0} tone="text-success" />
            <SlaStat label="Approaching" value={m?.sla.approaching ?? 0} tone="text-warning" />
            <SlaStat label="Breached" value={m?.sla.breached ?? 0} tone="text-danger" />
          </div>
        </Card>
      </div>

      {/* Needs attention (live) */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-foreground">
          <Icon name="warning" className="h-5 w-5 text-warning" /> Needs attention
        </h2>
        {attention.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-4 text-sm text-foreground-muted">All orders are on time.</p>
        ) : (
          <div className="space-y-2">
            {attention.map((e) => <AttentionRow key={e.id} entry={e} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function SlaStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className={cn('text-2xl font-bold tabular-nums', tone)}>{value}</p>
      <p className="text-xs text-foreground-muted">{label}</p>
    </div>
  );
}

function AttentionRow({ entry }: { entry: KitchenEntry }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <span className="text-lg font-bold text-foreground">#{entry.orderNumber}</span>
      {entry.tableLabel && <span className="text-sm text-foreground-muted">{entry.tableLabel}</span>}
      {entry.station && <span className="text-sm text-foreground-muted">· {entry.station.name}</span>}
      <SlaBadge sla={entry.sla} className="ml-auto" />
      <PrepTimer entry={entry} className="w-24" />
    </div>
  );
}
