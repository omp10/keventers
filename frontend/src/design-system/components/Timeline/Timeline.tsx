import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/design-system/icons';

export type TimelineItem = {
  title: ReactNode;
  description?: ReactNode;
  timestamp?: ReactNode;
  icon?: IconName;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  active?: boolean;
};

const DOT_TONE = {
  default: 'bg-muted text-foreground-muted border-border',
  primary: 'bg-primary-soft text-primary border-primary/30',
  success: 'bg-success-soft text-success border-success/30',
  warning: 'bg-warning-soft text-warning border-warning/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
};

/**
 * Timeline — vertical activity/order-status feed (order lifecycle, audit log).
 * Connector line + tone-colored icon nodes. Token-driven; used across order &
 * kitchen views.
 */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn('relative flex flex-col', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <li key={i} className="relative flex gap-3.5 pb-6 last:pb-0">
            {!isLast && <span className="absolute left-[0.9375rem] top-8 -bottom-0 w-px bg-border" aria-hidden />}
            <span className={cn('z-10 grid size-8 shrink-0 place-items-center rounded-full border', DOT_TONE[item.tone ?? 'default'], item.active && 'ring-4 ring-primary-soft')}>
              {item.icon ? <Icon name={item.icon} size="sm" /> : <span className="size-2 rounded-full bg-current" />}
            </span>
            <div className="flex-1 pt-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {item.timestamp && <time className="text-xs text-foreground-subtle whitespace-nowrap">{item.timestamp}</time>}
              </div>
              {item.description && <p className="mt-0.5 text-sm text-foreground-muted">{item.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
