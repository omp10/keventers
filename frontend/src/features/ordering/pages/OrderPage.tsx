import { useEffect, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { JOURNEY, useJourney } from '@/platform/analytics';
import { Button, Spinner, ErrorState, Badge, Icon } from '@/design-system';
import { qk, useQueryResource } from '@/platform/query';
import { useRealtimeQuery } from '@/platform/socket';
import { PriceBreakdown } from '../cart';
import { FeedbackCard, SubscriptionOffer } from '../components';
import { OrderStatusTimeline, OrderTrackingHero } from '../order';
import { LoyaltyEarnBurst } from '../order/LoyaltyEarnBurst';
import { PaymentPanel } from '../payment';
import { useOrder } from '../hooks';
import { orderService } from '../services';
import { formatMoney, PAYMENT_STATUS_PRESENTATION, ORDER_STATUS_PRESENTATION } from '../format';
import type { PaymentProvider } from '../types';

/** One quiet heading style for every block on this page. */
function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="px-0.5 text-xs font-semibold uppercase tracking-wider text-foreground-subtle">{children}</h2>;
}

/**
 * OrderPage (/order/:orderId) — the LIVE order hub: confirmation, payment (when
 * pending), and realtime tracking. The order stays live via the Socket Platform
 * (`useOrder`), so once payment is captured or the kitchen advances, this screen
 * updates itself — no polling, no manual refresh.
 */
export function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const provider = (params.get('provider') as PaymentProvider) || 'razorpay';
  const method = (params.get('method') as 'upi' | 'card' | null) || undefined;

  const q = useOrder(orderId);
  const order = q.data;

  const historyQ = useQueryResource(
    qk('ordering', 'orders-list'),
    () => orderService.list(1, 50),
    {
      enabled: Boolean(order),
    }
  );

  useRealtimeQuery({
    queryKey: qk('ordering', 'orders-list'),
    events: [
      'order:placed', 'order:confirmed', 'order:preparing', 'order:ready',
      'order:served', 'order:completed', 'order:cancelled',
    ],
  });

  const otherOrders = (historyQ.data?.items ?? []).filter((o) => o.id !== orderId);
  const journey = useJourney();

  useEffect(() => {
    if (orderId) journey(JOURNEY.ORDER_TRACKED, { orderId });
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (q.isLoading) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <Spinner />
      </div>
    );
  }
  if (q.isError || !order) {
    return (
      <div className="grid h-[60vh] place-items-center p-6">
        <ErrorState title="Order not found" description="We couldn't load this order." onRetry={() => q.refetch()} />
      </div>
    );
  }

  const showPayment = provider !== 'cash' && order.payment.status !== 'captured' && order.status !== 'cancelled';
  const branchMenu = `/r/${order.branch.slug}/menu`;

  return (
    <div className="mx-auto max-w-lg space-y-6 py-4">
      {/* Live tracking ALWAYS leads. It used to be hidden behind the payment
          panel until payment was captured — which for pay-at-counter is the
          order's whole life, so customers never saw the tracker at all. */}
      <OrderTrackingHero order={order} />
      {/* Points pop once the payment captures and loyalty is awarded. Only worth
          watching for a FRESH order — opening an old one from history would
          otherwise re-poll the balance for nothing. */}
      {order.status !== 'cancelled' && (
        <LoyaltyEarnBurst active={Date.now() - new Date(order.createdAt).getTime() < 10 * 60 * 1000} />
      )}
      {showPayment && (
        <PaymentPanel order={order} provider={provider} method={method} onBack={() => navigate('/checkout')} />
      )}
      <section className="space-y-2">
        <SectionTitle>Order status</SectionTitle>
        <OrderStatusTimeline order={order} />
      </section>

      {/* Items + totals in ONE card. They were two stacked bordered boxes, which
          read as two unrelated things when they are one bill. */}
      <section className="space-y-2">
        <SectionTitle>Summary</SectionTitle>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="divide-y divide-border px-3">
          {order.items.map((i) => (
            <div key={i.id} className="flex items-center gap-3 py-2.5">
              {i.imageUrl ? (
                <img src={i.imageUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-muted">
                  <Icon name="utensils" className="h-5 w-5 text-foreground-subtle" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{i.name}</p>
                {(i.variantName || i.modifiers.length > 0 || i.addons.length > 0) && (
                  <p className="truncate text-xs text-foreground-muted">
                    {[i.variantName, ...i.modifiers.map((m) => m.name), ...i.addons.map((a) => a.name)].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="text-xs text-foreground-subtle">Qty {i.quantity}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-foreground">{formatMoney(i.lineTotal)}</span>
            </div>
          ))}
          </div>
          {/* Same card, no second border — the bill continues from the items. */}
          <PriceBreakdown pricing={order.pricing} className="rounded-none border-0 border-t border-border" />
        </div>
      </section>

      {/* Other Orders placed in this visit */}
      {otherOrders.length > 0 && (
        <section className="space-y-3">
          <SectionTitle>Other orders this visit</SectionTitle>
          <div className="space-y-3">
            {otherOrders.map((other) => {
              const payPres = PAYMENT_STATUS_PRESENTATION[other.payment.status];
              const orderStatusPres = ORDER_STATUS_PRESENTATION[other.status];
              return (
                <div key={other.id} className="rounded-xl border border-border bg-surface p-4 text-sm shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-foreground">
                      #{other.orderNumber}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      {new Date(other.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {/* Items list */}
                  <div className="border-t border-border/50 pt-2 space-y-1">
                    {other.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs text-foreground-muted">
                        <span>{item.quantity} × {item.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Badges + View link */}
                  <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                    <div className="flex gap-1.5">
                      <Badge tone={orderStatusPres.tone} variant="soft">{orderStatusPres.label}</Badge>
                      <Badge tone={payPres.tone} variant="soft">{payPres.label}</Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/order/${other.id}`)}
                      className="font-semibold text-primary hover:underline"
                    >
                      Track Order →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SOW step 11 — feedback once served; step 10 — the subscription pitch. */}
      <FeedbackCard order={order} />
      <SubscriptionOffer />

      <div className="flex gap-2 pt-1">
        <Button fullWidth onClick={() => navigate(branchMenu)}>Add more items</Button>
        <Button variant="ghost" fullWidth onClick={() => navigate('/discover')}>Browse restaurants</Button>
      </div>
    </div>
  );
}
