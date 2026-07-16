import { useMemo } from 'react';

import { Icon, type IconName } from '@/design-system';
import { ORDER_STATUS_PRESENTATION } from '@/features/ordering';
import { cn } from '@/lib/cn';
import type { OrderStatus, StaffOrderDetail } from '../types';

type TimelineRow = { icon: IconName; label: string; at: string; note?: string; tone: string };

const STATUS_ICON: Partial<Record<OrderStatus, IconName>> = {
  placed: 'checkCircle',
  confirmed: 'check',
  preparing: 'flame',
  ready: 'bag',
  served: 'checkCircle',
  completed: 'checkCircle',
  cancelled: 'close',
};

/**
 * StaffOrderTimeline — the merged operational timeline: order status transitions,
 * payment, kitchen, and audit events in chronological order. Fed by realtime order
 * data (the drawer keeps it live), so it updates without refresh.
 */
export function StaffOrderTimeline({ order }: { order: StaffOrderDetail }) {
  const rows = useMemo<TimelineRow[]>(() => {
    const fromStatuses = order.timeline.map((t) => ({
      icon: STATUS_ICON[t.status] ?? 'circle',
      label: ORDER_STATUS_PRESENTATION[t.status]?.label ?? t.status,
      at: t.at,
      note: t.note,
      tone: 'text-primary',
    }));
    const fromAudit = (order.auditEvents ?? []).map((a) => ({
      icon: 'info' as IconName,
      label: a.message,
      at: a.at,
      note: a.actor,
      tone: 'text-foreground-subtle',
    }));
    return [...fromStatuses, ...fromAudit].sort((a, b) => (a.at < b.at ? -1 : 1));
  }, [order.timeline, order.auditEvents]);

  if (rows.length === 0) return <p className="text-sm text-foreground-subtle">No events yet.</p>;

  return (
    <ol className="relative ml-2 space-y-4 border-l-2 border-border pl-5">
      {rows.map((r, i) => (
        <li key={i} className="relative">
          <span className={cn('absolute -left-[1.7rem] grid h-6 w-6 place-items-center rounded-full border-2 border-border bg-background', r.tone)}>
            <Icon name={r.icon} className="h-3 w-3" />
          </span>
          <p className="text-sm font-medium text-foreground">{r.label}</p>
          <p className="text-xs text-foreground-muted">
            {new Date(r.at).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
            {r.note ? ` · ${r.note}` : ''}
          </p>
        </li>
      ))}
    </ol>
  );
}
