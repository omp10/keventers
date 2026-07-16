import { Badge, Icon } from '@/design-system';
import { ORDER_STATUS_PRESENTATION, PAYMENT_STATUS_PRESENTATION } from '@/features/ordering';
import type { OrderStatus, PaymentStatus } from '../types';

/** Order status badge — theme-driven, backend-status-mapped (reused across views). */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const p = ORDER_STATUS_PRESENTATION[status];
  return <Badge tone={p.tone} variant="soft">{p.label}</Badge>;
}

/** Compact payment status pill. */
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const p = PAYMENT_STATUS_PRESENTATION[status];
  return (
    <Badge tone={p.tone} variant="soft">
      <Icon name="payment" className="mr-1 h-3 w-3" />
      {p.label}
    </Badge>
  );
}
