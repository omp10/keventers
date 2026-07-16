import { Badge, Icon } from '@/design-system';
import { cn } from '@/lib/cn';
import { formatMinutes, PAYMENT_STATUS_PRESENTATION } from '../format';
import type { Order } from '../types';

/**
 * OrderSuccess — the confirmation header shown once the order is placed (and paid,
 * where applicable). Order number, estimate, branch, and payment status. Actions
 * are provided by the page (view order / track / continue browsing).
 */
export function OrderSuccess({ order }: { order: Order }) {
  const paid = order.payment.status === 'captured';
  const payPres = PAYMENT_STATUS_PRESENTATION[order.payment.status];

  return (
    <div className="text-center">
      <div
        className={cn(
          'mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full',
          paid ? 'bg-success-soft text-success' : 'bg-primary-soft text-primary',
          'animate-[kv-pop-in_260ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none',
        )}
      >
        <Icon name="checkCircle" className="h-9 w-9" />
      </div>
      <h1 className="text-xl font-bold text-foreground">{paid ? 'Order confirmed!' : 'Order placed!'}</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        {order.branch.name}
        {order.branch.restaurantName ? ` · ${order.branch.restaurantName}` : ''}
      </p>

      <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2">
        <Badge tone="neutral" variant="soft">#{order.orderNumber}</Badge>
        <Badge tone={payPres.tone} variant="soft">{payPres.label}</Badge>
        {order.estimatedMinutes != null && (
          <Badge tone="info" variant="soft">
            <Icon name="clock" className="mr-1 h-3 w-3" /> ~{formatMinutes(order.estimatedMinutes)}
          </Badge>
        )}
      </div>
    </div>
  );
}
