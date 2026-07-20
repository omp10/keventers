import { Badge, Icon } from '@/design-system';
import { ORDER_STATUS_PRESENTATION, PAYMENT_STATUS_PRESENTATION } from '@/features/ordering';
import type { OrderStatus, PaymentStatus } from '../types';

/**
 * A status the presentation map doesn't cover (a new backend enum value, or a
 * missing/undefined status) used to read `.tone` off `undefined` and throw —
 * taking the entire order drawer down with it. A BADGE must never do that: show
 * the raw value neutrally and let the rest of the screen work.
 */
const fallback = (status: string) => ({ tone: 'neutral' as const, label: String(status ?? '—').replace(/_/g, ' ') });

/** Order status badge — theme-driven, backend-status-mapped (reused across views). */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const p = ORDER_STATUS_PRESENTATION[status] ?? fallback(status);
  return <Badge tone={p.tone} variant="soft">{p.label}</Badge>;
}

/** Compact payment status pill. */
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const p = PAYMENT_STATUS_PRESENTATION[status] ?? fallback(status);
  return (
    <Badge tone={p.tone} variant="soft">
      <Icon name="payment" className="mr-1 h-3 w-3" />
      {p.label}
    </Badge>
  );
}
