import { cn } from '@/lib/cn';
import type { KitchenEntry } from '../types';
import { elapsedSince, formatDuration, SLA_PRESENTATION } from './format';
import { useTick } from './useTick';

/**
 * PrepTimer — the large, high-contrast kitchen timer. It ticks a DISPLAY clock
 * (shared 1s ticker, no network) from the backend timestamps, and colors itself
 * from the backend `sla.state` (the backend owns the SLA decision). Shows remaining
 * SLA when a target is provided.
 */
export function PrepTimer({ entry, size = 'md', className }: { entry: KitchenEntry; size?: 'md' | 'lg'; className?: string }) {
  const now = useTick();
  const pres = SLA_PRESENTATION[entry.sla.state];

  // Elapsed since the relevant phase started (preparing → startedAt, else queued).
  const base =
    entry.status === 'preparing' || entry.status === 'recalled' || entry.status === 'refired'
      ? entry.timers.startedAt ?? entry.timers.queuedAt
      : entry.timers.queuedAt;
  const elapsed = elapsedSince(base, now);

  const target = entry.sla.targetSeconds;
  const remaining = target != null ? target - elapsed : undefined;

  return (
    <div className={cn('text-center leading-none', className)}>
      <div className={cn('font-mono font-bold tabular-nums', size === 'lg' ? 'text-5xl' : 'text-3xl', pres.text)}>
        {formatDuration(elapsed)}
      </div>
      {remaining != null && (
        <div className={cn('mt-1 text-xs font-semibold', remaining < 0 ? 'text-danger' : 'text-foreground-muted')}>
          {remaining >= 0 ? `${formatDuration(remaining)} to SLA` : `Over by ${formatDuration(-remaining)}`}
        </div>
      )}
    </div>
  );
}
