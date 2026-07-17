import { useState } from 'react';

import { Card, Icon, Skeleton, StatCard } from '@/design-system';
import { qk, useQueryResource } from '@/platform/query';
import { cn } from '@/lib/cn';

import { adminService } from '../../admin.service';
import type { AdminKitchen, PlatformKpis } from '../../types';

/** Analytics money is MINOR units (paise) — unlike catalog prices, which are major. */
const inr = (minor = 0) => `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const RANGES = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: '365d', label: 'Last year', days: 365 },
] as const;

const iso = (d: Date) => d.toISOString().slice(0, 10);

function rangeFor(days: number) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return { from: iso(from), to: iso(to) };
}

/**
 * RevenueTab — what this outlet earns, read from the analytics projections
 * narrowed to its branch (never recomputed on the client).
 *
 * Revenue accrues on ORDER COMPLETION and PAYMENT CAPTURE, not when an order is
 * placed. An outlet can therefore show orders but ₹0 — the callout below says so
 * explicitly, because a bare ₹0 next to five orders reads as a broken page
 * rather than as orders still in flight.
 */
export function RevenueTab({ kitchen: k }: { kitchen: AdminKitchen }) {
  const [rangeKey, setRangeKey] = useState<(typeof RANGES)[number]['key']>('30d');
  const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 30;
  const range = rangeFor(days);

  const kpis = useQueryResource<PlatformKpis>(qk('admin', 'kitchen-analytics', k.id, rangeKey), () =>
    adminService.kitchenAnalytics({ branchId: k.id, ...range }),
  );

  if (kpis.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const d = kpis.data;
  const sales = d?.sales;
  const orders = d?.orders;
  const payments = d?.payments;
  const noRevenueYet = (sales?.grossRevenue ?? 0) === 0 && (orders?.ordersPlaced ?? 0) > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-muted p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRangeKey(r.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                rangeKey === r.key ? 'bg-surface text-foreground shadow-sm' : 'text-foreground-muted hover:text-foreground',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-foreground-subtle">
          {range.from} → {range.to} · this outlet only
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Net revenue" value={inr(sales?.netRevenue)} icon="trend" hint="After discounts & refunds" />
        <StatCard label="Gross revenue" value={inr(sales?.grossRevenue)} icon="payment" hint="Before deductions" />
        <StatCard label="Average order value" value={inr(sales?.averageOrderValue)} icon="cart" hint="Per completed order" />
        <StatCard
          label="Orders completed"
          value={orders?.ordersCompleted ?? 0}
          icon="checkCircle"
          hint={`${orders?.ordersPlaced ?? 0} placed in this range`}
        />
      </div>

      {noRevenueYet && (
        <div className="flex items-start gap-2.5 rounded-lg border border-info/30 bg-info-soft px-3.5 py-2.5">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p className="text-sm text-foreground">
            This outlet has <strong>{orders?.ordersPlaced}</strong> order{orders?.ordersPlaced === 1 ? '' : 's'} in this
            range but ₹0 revenue: revenue is recorded when an order is <strong>completed</strong> and its payment is{' '}
            <strong>captured</strong>. Orders still in progress don't count yet.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="md" className="space-y-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Icon name="order" className="h-4 w-4 text-foreground-subtle" />
            Orders
          </p>
          <dl className="space-y-2.5 text-sm">
            <Metric label="Placed" value={orders?.ordersPlaced ?? 0} />
            <Metric label="Completed" value={orders?.ordersCompleted ?? 0} />
            <Metric label="Cancelled" value={orders?.ordersCancelled ?? 0} />
            <Metric label="Items sold" value={sales?.itemCount ?? 0} />
            <Metric label="Avg prep time" value={formatMs(orders?.averagePrepTimeMs)} />
            <Metric label="Avg completion" value={formatMs(orders?.averageCompletionTimeMs)} />
          </dl>
        </Card>

        <Card padding="md" className="space-y-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Icon name="payment" className="h-4 w-4 text-foreground-subtle" />
            Money in & out
          </p>
          <dl className="space-y-2.5 text-sm">
            <Metric label="Tax collected" value={inr(sales?.taxTotal)} />
            <Metric label="Discounts given" value={inr(sales?.discountTotal)} />
            <Metric label="Refunded" value={inr(sales?.refundTotal)} />
            <Metric label="Payments captured" value={payments?.captured ?? 0} />
            <Metric label="Captured amount" value={inr(payments?.capturedAmount)} />
            <Metric
              label="Payment success"
              value={payments?.successRate != null ? `${Math.round(payments.successRate * 100)}%` : '—'}
            />
          </dl>
        </Card>
      </div>

      <p className="flex items-start gap-2 text-xs text-foreground-subtle">
        <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Figures come from the analytics projections for this branch, not from live order records. They're backend-computed
        and update as orders complete.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function formatMs(ms?: number): string {
  if (!ms) return '—';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
