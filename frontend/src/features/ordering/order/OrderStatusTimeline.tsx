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

  // HORIZONTAL stepper. The old layout was a left-rail vertical timeline, which
  // pinned the connector to the far edge and left the card lopsided. Running the
  // track through the middle reads as progress at a glance — the pattern every
  // delivery app uses — and fits five steps on a phone.
  const steps = ORDER_PROGRESSION;
  const last = Math.max(1, steps.length - 1);
  // Icon centres sit at half a column in from each end, so the track spans
  // between the FIRST and LAST icon rather than the full width.
  const half = 100 / (2 * steps.length);
  const span = 100 - 2 * half;
  const filled = (Math.min(currentIndex, last) / last) * span;

  const activeStep = steps[Math.min(currentIndex, last)];
  const activeNote =
    currentIndex >= steps.length ? null
    : activeStep === 'preparing' ? 'The kitchen is preparing your order.'
    : activeStep === 'ready' ? 'Your order is ready — it’s on its way over.'
    : activeStep === 'confirmed' ? 'The restaurant has confirmed your order.'
    : activeStep === 'placed' ? 'Waiting for the restaurant to confirm.'
    : null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <ol className="relative flex items-start">
        {/* connector track + progress, vertically centred on the icon row (h-8 → top-4) */}
        <span aria-hidden className="absolute top-4 h-0.5 -translate-y-1/2 rounded-full bg-border" style={{ left: `${half}%`, right: `${half}%` }} />
        <span
          aria-hidden
          className="absolute top-4 h-0.5 -translate-y-1/2 rounded-full bg-success transition-[width] duration-500"
          style={{ left: `${half}%`, width: `${filled}%` }}
        />
        {steps.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const pres = ORDER_STATUS_PRESENTATION[step];
          const at = timeAt(step);
          return (
            <li key={step} className="relative z-10 flex flex-1 flex-col items-center gap-1.5 text-center">
              <span
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 bg-background transition',
                  done && 'border-success bg-success text-success-foreground',
                  active && 'border-primary bg-primary text-primary-foreground animate-[kv-pulse_1.6s_ease-in-out_infinite] motion-reduce:animate-none',
                  !done && !active && 'border-border text-foreground-subtle',
                )}
              >
                <Icon name={STEP_ICON[step]} className="h-4 w-4" />
              </span>
              <span className={cn('px-0.5 text-[0.6875rem] font-semibold leading-tight', active || done ? 'text-foreground' : 'text-foreground-subtle')}>
                {pres.label}
              </span>
              {at && (
                <span className="text-[0.625rem] leading-none text-foreground-muted">
                  {new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {activeNote && <p className="mt-3 border-t border-border pt-3 text-center text-xs text-foreground-muted">{activeNote}</p>}
    </div>
  );
}
