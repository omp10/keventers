import { Badge, Button, Icon } from '@/design-system';
import { formatMoney } from '@/features/ordering';
import { cn } from '@/lib/cn';
import { useOrderActions } from '../hooks';
import type { OrderSummary } from '../types';
import { OrderStatusBadge } from './OrderStatusBadge';
import { nextAction, waitingLabel } from './board-utils';

const PAYMENT_TONE = { captured: 'bg-success', pending: 'bg-warning', failed: 'bg-danger', processing: 'bg-info', authorized: 'bg-info', cancelled: 'bg-border-strong' } as const;

/**
 * OrderCard — the reusable order tile for every board view (list/kanban/compact).
 * Shows the essentials + a one-tap advance action (via the backend state machine).
 * Animates in on mount for new-order arrivals. Business logic is identical across
 * views; only layout differs.
 */
export function OrderCard({
  order,
  onOpen,
  compact,
  className,
}: {
  order: OrderSummary;
  onOpen: (id: string) => void;
  compact?: boolean;
  className?: string;
}) {
  const actions = useOrderActions();
  const next = nextAction(order.status);
  const isRush = order.priority === 'rush' || order.slaBreached;

  return (
    <article
      onClick={() => onOpen(order.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(order.id)}
      className={cn(
        'group cursor-pointer rounded-xl border bg-surface p-3 text-left transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'animate-[kv-pop-in_200ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none',
        isRush ? 'border-danger/50' : 'border-border',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', PAYMENT_TONE[order.paymentStatus] ?? 'bg-border-strong')} title={`Payment: ${order.paymentStatus}`} />
          <span className="font-semibold text-foreground">#{order.orderNumber}</span>
          {order.priority === 'vip' && <Badge tone="accent" variant="solid" className="text-[0.625rem]">VIP</Badge>}
          {isRush && <Badge tone="danger" variant="solid" className="text-[0.625rem]">Rush</Badge>}
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-foreground-muted">
          <Icon name="clock" className="h-3 w-3" /> {waitingLabel(order.createdAt)}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-sm text-foreground-muted">
        {order.tableLabel && <span className="inline-flex items-center gap-1"><Icon name="grid" className="h-3 w-3" /> {order.tableLabel}</span>}
        <span className="truncate">{order.customerName ?? 'Guest'}</span>
        <span className="text-foreground-subtle">· {order.itemCount} item{order.itemCount === 1 ? '' : 's'}</span>
      </div>

      {!compact && (
        <div className="mt-2 flex items-center justify-between">
          <OrderStatusBadge status={order.status} />
          <span className="font-semibold text-foreground">{formatMoney(order.total)}</span>
        </div>
      )}

      {next && (
        <div className="mt-2.5 flex gap-2">
          <Button
            size="sm"
            fullWidth
            loading={actions.isPending}
            onClick={(e) => {
              e.stopPropagation();
              void actions[next.action](order.id);
            }}
          >
            {next.label}
          </Button>
        </div>
      )}
    </article>
  );
}
