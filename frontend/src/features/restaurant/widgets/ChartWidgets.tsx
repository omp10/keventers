import type { ReactNode } from 'react';

import { ChartWrapper } from '@/design-system';
import { formatMoney } from '@/features/ordering';
import type { HourlyPoint, Money, SeriesPoint } from '../types';
import { MiniAreaChart } from './charts/MiniAreaChart';
import { MiniBarChart } from './charts/MiniBarChart';

/** Revenue trend widget. Presentational — pass backend series + total. */
export function RevenueWidget({
  data,
  loading,
  total,
  actions,
}: {
  data: SeriesPoint[];
  loading?: boolean;
  total?: Money;
  actions?: ReactNode;
}) {
  return (
    <ChartWrapper
      title="Revenue"
      description={total ? formatMoney(total) : undefined}
      actions={actions}
      loading={loading}
      empty={!loading && data.length < 2}
      emptyMessage="No revenue yet today"
      height={200}
    >
      <MiniAreaChart data={data} height={160} />
    </ChartWrapper>
  );
}

/** Orders-by-hour widget (peak-hour highlight). */
export function HourlyOrdersWidget({ data, loading }: { data: HourlyPoint[]; loading?: boolean }) {
  const bars = data.map((d) => ({ label: d.hour, value: d.orders }));
  return (
    <ChartWrapper title="Orders by hour" loading={loading} empty={!loading && bars.length === 0} emptyMessage="No orders yet" height={200}>
      <MiniBarChart data={bars} height={160} colorClass="text-accent" />
    </ChartWrapper>
  );
}
