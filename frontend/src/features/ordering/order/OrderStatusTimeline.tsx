import { Icon, type IconName } from '@/design-system';
import { cn } from '@/lib/cn';
import { ORDER_PROGRESSION, ORDER_STATUS_PRESENTATION } from '../format';
import type { Order, OrderStatus } from '../types';

const STEP_ICON: Record<OrderStatus, IconName> = {
  placed: 'checkCircle',
  confirmed: 'check',
  preparing: 'flame',
  ready: 'bag',
  served: 'checkCircle',
  completed: 'checkCircle',
  cancelled: 'close',
  refund_pending: 'clock',
  refunded: 'refresh',
};

/**
 * OrderStatusTimeline — the LIVE progress timeline. It renders the customer-facing
 * progression and marks the current step from the order's status. Updates arrive in
 * realtime via the Socket Platform (the parent's `useOrder` keeps the order live) —
 * there is no polling here.
 */
export function OrderStatusTimeline({ order }: { order: Order }) {
  if (order.status === 'cancelled') {
    // "This order was cancelled." and nothing else left the customer guessing
    // whether they did it, the kitchen did it, or something failed. Show the
    // reason and who ended it whenever the order carries them.
    const { reason, source } = order.cancellation ?? {};
    const by =
      source === 'customer' ? 'You cancelled this order.'
      : source === 'restaurant' ? 'The restaurant cancelled this order.'
      : source === 'system' ? 'This order was cancelled automatically.'
      : 'This order was cancelled.';
    const at = order.cancellation?.at ?? order.cancelledAt;
    return (
      <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft p-4 text-danger">
        <Icon name="close" className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{by}</p>
          {reason ? <p className="mt-1 text-sm opacity-90">Reason: {reason}</p> : null}
          {at ? <p className="mt-1 text-xs opacity-75">{new Date(at).toLocaleString()}</p> : null}
        </div>
      </div>
    );
  }

  // `completed` (and any post-progression status) renders as all-steps-done
  // rather than falling back to step 0.
  const rawIndex = ORDER_PROGRESSION.indexOf(order.status);
  const currentIndex = rawIndex === -1 ? ORDER_PROGRESSION.length : rawIndex;
  const timeAt = (s: OrderStatus) => order.timeline.find((t) => t.status === s)?.at;

  return (
    <ol className="relative ml-2 space-y-6 border-l-2 border-border pl-6">
      {ORDER_PROGRESSION.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const pres = ORDER_STATUS_PRESENTATION[step];
        const at = timeAt(step);
        return (
          <li key={step} className="relative">
            <span
              className={cn(
                'absolute -left-[2.15rem] grid h-8 w-8 place-items-center rounded-full border-2 bg-background transition',
                done && 'border-success bg-success text-success-foreground',
                active && 'border-primary bg-primary text-primary-foreground animate-[kv-pulse_1.6s_ease-in-out_infinite] motion-reduce:animate-none',
                !done && !active && 'border-border text-foreground-subtle',
              )}
            >
              <Icon name={STEP_ICON[step]} className="h-4 w-4" />
            </span>
            <div className="min-h-8">
              <p className={cn('text-sm font-semibold', active ? 'text-foreground' : done ? 'text-foreground' : 'text-foreground-subtle')}>{pres.label}</p>
              {at && <p className="text-xs text-foreground-muted">{new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
              {active && step === 'preparing' && <p className="text-xs text-foreground-muted">The kitchen is preparing your order.</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
