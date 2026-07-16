import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Card } from '@/design-system/components/Card';
import { Skeleton } from '@/design-system/components/Skeleton';
import { EmptyState } from '@/design-system/components/States';
import { color } from '@/theme';

/**
 * ChartWrapper — a chart-LIBRARY-AGNOSTIC frame (title, actions, legend,
 * loading/empty states, responsive height). Charts plug into `children`; the
 * wrapper standardizes the surrounding chrome so every chart in Analytics looks
 * consistent. `chartColors` exposes the brand palette for whichever chart lib is
 * used (Recharts, visx, etc.), so charts inherit the theme.
 */
export type ChartWrapperProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  legend?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: ReactNode;
  height?: number;
  className?: string;
  children?: ReactNode;
};

/** The brand-derived series palette for charts (resolves to live theme values). */
export const chartColors = {
  primary: color('primary'),
  accent: color('accent'),
  success: color('success'),
  warning: color('warning'),
  danger: color('danger'),
  info: color('info'),
  grid: color('border'),
  axis: color('foregroundSubtle'),
  series: [color('primary'), color('accent'), color('info'), color('success'), color('warning'), color('danger')],
};

export function ChartWrapper({ title, description, actions, legend, loading, empty, emptyMessage = 'No data for this period.', height = 280, className, children }: ChartWrapperProps) {
  return (
    <Card padding="md" className={cn('flex flex-col gap-4', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h3 className="text-base font-semibold text-foreground truncate">{title}</h3>}
            {description && <p className="mt-0.5 text-sm text-foreground-muted">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      <div style={{ height }} className="relative w-full">
        {loading ? (
          <Skeleton className="absolute inset-0 h-full w-full" />
        ) : empty ? (
          <EmptyState size="sm" title="Nothing to show" description={emptyMessage} className="h-full" />
        ) : (
          children
        )}
      </div>
      {legend && !loading && !empty && <div className="flex flex-wrap items-center gap-4 text-xs text-foreground-muted">{legend}</div>}
    </Card>
  );
}
