import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { JOURNEY, useJourney } from '@/platform/analytics';
import { Button, Spinner, ErrorState, Badge } from '@/design-system';
import { qk, useQueryResource } from '@/platform/query';
import { useRealtimeQuery } from '@/platform/socket';
import { PriceBreakdown } from '../cart';
import { FeedbackCard, SubscriptionOffer } from '../components';
import { OrderStatusTimeline, OrderTrackingHero } from '../order';
import { PaymentPanel } from '../payment';
import { useOrder } from '../hooks';
import { orderService } from '../services';
import { PAYMENT_STATUS_PRESENTATION, ORDER_STATUS_PRESENTATION } from '../format';
import type { PaymentProvider } from '../types';

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
      {showPayment && (
        <PaymentPanel order={order} provider={provider} method={method} onBack={() => navigate('/checkout')} />
      )}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Order status</h2>
        <OrderStatusTimeline order={order} />
      </section>

      {/* Items + totals */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Summary</h2>
        <div className="mb-3 rounded-xl border border-border bg-surface p-3 text-sm">
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between py-1 text-foreground-muted">
              <span>{i.quantity} × {i.name}</span>
            </div>
          ))}
        </div>
        <PriceBreakdown pricing={order.pricing} />
      </section>

      {/* Other Orders placed in this visit */}
      {otherOrders.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-subtle">
            Other Orders from this Visit
          </h2>
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

      <div className="flex gap-2">
        <Button variant="secondary" fullWidth onClick={() => navigate(branchMenu)}>Add more items</Button>
        <Button variant="ghost" fullWidth onClick={() => navigate('/discover')}>Continue browsing</Button>
      </div>
    </div>
  );
}
