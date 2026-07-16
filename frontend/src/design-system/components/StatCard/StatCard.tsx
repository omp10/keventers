import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Card } from '@/design-system/components/Card';
import { Icon, type IconName } from '@/design-system/icons';
import { Skeleton } from '@/design-system/components/Skeleton';

export type StatDelta = { value: number; direction?: 'up' | 'down'; label?: string };

export type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  icon?: IconName;
  delta?: StatDelta;
  /** Whether "up" is good (revenue) or bad (churn) — colors the delta. */
  positiveIsGood?: boolean;
  hint?: ReactNode;
  loading?: boolean;
  className?: string;
};

/**
 * StatCard — the KPI tile for dashboards. Label, big value, trend delta (colored
 * by intent) and an optional icon. Loading state renders skeletons in place.
 * Token-driven; consistent across Restaurant + Admin dashboards.
 */
export function StatCard({ label, value, icon, delta, positiveIsGood = true, hint, loading, className }: StatCardProps) {
  const up = (delta?.direction ?? (delta && delta.value >= 0 ? 'up' : 'down')) === 'up';
  const good = up === positiveIsGood;
  return (
    <Card padding="md" className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground-muted">{label}</span>
        {icon && (
          <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
            <Icon name={icon} size="sm" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{value}</span>
          {delta && (
            <span className={cn('mb-1 inline-flex items-center gap-0.5 text-xs font-semibold', good ? 'text-success' : 'text-danger')}>
              <Icon name={up ? 'trend' : 'trend'} size="xs" className={cn(!up && 'rotate-180')} />
              {Math.abs(delta.value)}%{delta.label ? ` ${delta.label}` : ''}
            </span>
          )}
        </div>
      )}
      {hint && <p className="text-xs text-foreground-subtle">{hint}</p>}
    </Card>
  );
}

export type MetricCardProps = StatCardProps & { chart?: ReactNode; title?: ReactNode };

/** MetricCard — a richer StatCard with a title + inline chart/sparkline slot. */
export function MetricCard({ title, chart, className, ...stat }: MetricCardProps) {
  return (
    <Card padding="md" className={cn('flex flex-col gap-4', className)}>
      {title && <span className="text-sm font-semibold text-foreground">{title}</span>}
      <StatCard {...stat} className="!p-0 !border-0 !shadow-none !bg-transparent" />
      {chart && <div className="mt-1 h-24">{chart}</div>}
    </Card>
  );
}
