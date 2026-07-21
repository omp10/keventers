import { useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Icon } from '@/design-system';
import { useAuth } from '@/platform/auth';
import { qk, useQueryResource } from '@/platform/query';
import { useRealtimeQuery } from '@/platform/socket';
import { cn } from '@/lib/cn';
import { formatMoney } from '../format';
import { useCart } from '../hooks';
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
 * The one active-order query, shared. MenuScreen reads it too (same cache
 * entry, no extra request) to decide whether its own FloatingCart bar should
 * yield to the dock.
 */
export function useActiveLiveOrder(enabled: boolean) {
  return useQueryResource<Order | null>(
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
}

/**
 * LiveOrderTracker — the floating DOCK pinned above the customer tab bar.
 *
 * It used to be a single track-order pill; now it is a swipeable carousel of
 * every floating surface that wants that slot (live order, cart), because two
 * fixed pills stacked on a phone ate half the viewport. One slot, swipe to
 * switch, with the same dot language as the promo banner so the affordance is
 * already familiar.
 *
 * Swiping is native scroll-snap (not a gesture library): it inherits momentum,
 * rubber-banding and accessibility from the platform, and the active dot is
 * derived from scroll position so it stays honest however the user scrolls.
 */
export function LiveOrderTracker() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { status } = useAuth();
  const cart = useCart();

  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Without a guest session or account the list call can only 401 (which would
  // bounce the visitor to the entry screen) — so don't even ask.
  const enabled = status === 'guest' || status === 'authenticated';

  const query = useActiveLiveOrder(enabled);

  useRealtimeQuery({
    queryKey: qk('ordering', 'active-order'),
    // The backend's real socket vocabulary — one entry per status transition.
    events: ['order:placed', 'order:confirmed', 'order:preparing', 'order:ready', 'order:served', 'order:completed', 'order:cancelled'],
  });

  const order = query.data ?? null;
  const isMenuPage = pathname.includes('/menu');
  const onOrderPage = pathname.startsWith('/order/');
  const onCartSurface = pathname === '/cart' || pathname === '/checkout';

  /* ── Which cards want the slot ─────────────────────────────────────────── */

  const slides: { key: string; node: ReactNode }[] = [];

  // The tracking page IS the expanded view of the order pill — showing both is noise.
  if (order && !onOrderPage) {
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

    slides.push({
      key: 'order',
      node: (
        <Pill
          onClick={() => navigate(`/order/${order.id}`)}
          ariaLabel={`Track order ${order.orderNumber}`}
          icon={
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10">
              <span className="absolute h-3 w-3 animate-ping rounded-full bg-primary/50" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
          }
          title={line}
          detail={detail}
          cta="Track"
        />
      ),
    });
  }

  // The cart card. /cart and /checkout ARE the cart — never duplicate there.
  // On the MENU page the full-width FloatingCart bar owns the cart CTA, so the
  // dock only absorbs the cart when a live order is ALSO on screen — two
  // stacked pop-ups was exactly the complaint; MenuScreen hides its bar then.
  if (cart.itemCount > 0 && !onCartSurface && (order && !onOrderPage ? true : !isMenuPage)) {
    slides.push({
      key: 'cart',
      node: (
        <Pill
          onClick={() => navigate('/cart')}
          ariaLabel={`View cart, ${cart.itemCount} items`}
          icon={
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/15">
              <Icon name="cart" className="h-5 w-5 text-accent" />
              <span className="absolute -right-1 -top-1 grid h-4.5 min-w-[1.125rem] place-items-center rounded-full bg-primary px-1 text-[0.625rem] font-bold text-primary-foreground">
                {cart.itemCount}
              </span>
            </span>
          }
          title={`${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'} in your cart`}
          detail={cart.pricing?.total ? formatMoney(cart.pricing.total) : 'Ready when you are'}
          cta="View"
        />
      ),
    });
  }

  if (!enabled || slides.length === 0) return null;

  // Sit above the FloatingCart bar only when it is actually rendered — the
  // menu page hides it while the dock carries the cart slide itself.
  const lifted = isMenuPage && cart.itemCount > 0 && !slides.some((s2) => s2.key === 'cart');

  return (
    <div
      className="fixed inset-x-3 z-[110] mx-auto w-auto max-w-xl lg:hidden"
      style={{
        bottom: lifted
          ? 'calc(8.5rem + max(env(safe-area-inset-bottom), 1.25rem) + 0.625rem)'
          : 'calc(4.5rem + max(env(safe-area-inset-bottom), 1.25rem) + 0.625rem)',
      }}
    >
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          // Which slide the viewport is (mostly) resting on.
          setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className={cn(
          'flex snap-x snap-mandatory overflow-x-auto scroll-smooth',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          slides.length > 1 ? 'gap-2' : '',
        )}
      >
        {slides.map((s) => (
          <div key={s.key} className="w-full shrink-0 snap-center">
            {s.node}
          </div>
        ))}
      </div>

      {/* Dots — the promo carousel's exact language, so the affordance reads. */}
      {slides.length > 1 && (
        <div className="mt-1.5 flex justify-center gap-1.5" role="tablist" aria-label="Floating cards">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Card ${i + 1} of ${slides.length}`}
              onClick={() => scroller.current?.scrollTo({ left: i * scroller.current.clientWidth, behavior: 'smooth' })}
              className={cn(
                'h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                i === active ? 'w-5 bg-primary' : 'w-1.5 bg-border-strong hover:bg-foreground-subtle',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** One dock card: icon · two lines · CTA. Shared by every slide. */
function Pill({ onClick, ariaLabel, icon, title, detail, cta }: {
  onClick: () => void;
  ariaLabel: string;
  icon: ReactNode;
  title: string;
  detail: string;
  cta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border border-border',
        'bg-surface/95 p-3 text-left shadow-xl backdrop-blur transition active:scale-[0.99]',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
        <span className="block truncate text-xs text-foreground-subtle">{detail}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
        {cta}
        <Icon name="chevronRight" className="h-4 w-4" />
      </span>
    </button>
  );
}
