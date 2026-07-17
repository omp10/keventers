import { useLocation, useNavigate } from 'react-router-dom';

import { Icon } from '@/design-system';
import { useAuth } from '@/platform/auth';
import { qk, useQueryResource } from '@/platform/query';
import { useRealtimeQuery } from '@/platform/socket';
import { cn } from '@/lib/cn';
import { orderService } from '../services';
import type { Order, OrderStatus } from '../types';

/** Statuses during which food is actually moving toward the customer. */
const LIVE: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'ready'];

const STATUS_LINE: Record<string, string> = {
  placed: 'Order placed — waiting for the kitchen',
  confirmed: 'Kitchen has accepted your order',
  preparing: 'Your food is being prepared',
  ready: 'Ready! It’s on its way to you',
};

/**
 * LiveOrderTracker — the Zomato-style floating pill pinned above the customer
 * tab bar on every tabbed page. While an order is in flight it shows the live
 * status (socket-driven, with a slow poll as the resilience net) and tapping it
 * opens the full tracking page. It renders nothing when there's no active order,
 * no session, or the user is already on the tracking page.
 */
export function LiveOrderTracker() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { status } = useAuth();

  // Without a guest session or account the list call can only 401 (which would
  // bounce the visitor to the entry screen) — so don't even ask.
  const enabled = status === 'guest' || status === 'authenticated';

  const query = useQueryResource<Order | null>(
    qk('ordering', 'active-order'),
    async () => {
      const page = await orderService.list(1, 10);
      return page.items.find((o) => LIVE.includes(o.status)) ?? null;
    },
    {
      enabled,
      // Poll only while something is actually live; the socket is primary.
      refetchInterval: (q) => (q.state.data ? 15_000 : 60_000),
    },
  );

  useRealtimeQuery({
    queryKey: qk('ordering', 'active-order'),
    // The backend's real socket vocabulary — one entry per status transition.
    events: ['order:placed', 'order:confirmed', 'order:preparing', 'order:ready', 'order:served', 'order:completed', 'order:cancelled'],
  });

  const order = query.data;
  // The tracking page IS the expanded view of this pill — showing both is noise.
  if (!enabled || !order || pathname.startsWith('/order/')) return null;

  const line = STATUS_LINE[order.status] ?? 'Order in progress';
  const eta = order.status !== 'ready' && order.estimatedMinutes ? `~${order.estimatedMinutes} min` : null;
  // The LIST endpoint returns slim rows — items/branch may be absent, and
  // "0 items" from an empty array is a lie. Fall back to the order number.
  const count = (order.items ?? []).reduce((n, i) => n + i.quantity, 0);
  const detail = [
    order.branch?.name || order.orderNumber,
    count > 0 ? `${count} item${count === 1 ? '' : 's'}` : null,
    eta,
  ].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={() => navigate(`/order/${order.id}`)}
      aria-label={`Track order ${order.orderNumber}`}
      className={cn(
        'fixed inset-x-3 z-[110] mx-auto flex w-auto max-w-xl items-center gap-3 rounded-2xl border border-border',
        'bg-surface/95 p-3 text-left shadow-xl backdrop-blur transition active:scale-[0.99] lg:hidden',
      )}
      style={{ bottom: 'calc(4.5rem + max(env(safe-area-inset-bottom), 1.25rem) + 0.625rem)' }}
    >
      {/* Pulsing live dot */}
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10">
        <span className="absolute h-3 w-3 animate-ping rounded-full bg-primary/50" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{line}</span>
        <span className="block truncate text-xs text-foreground-subtle">{detail}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
        Track
        <Icon name="chevronRight" className="h-4 w-4" />
      </span>
    </button>
  );
}
