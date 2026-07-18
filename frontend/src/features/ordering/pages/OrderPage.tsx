import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { JOURNEY, useJourney } from '@/platform/analytics';
import { Button, Spinner, ErrorState } from '@/design-system';
import { PriceBreakdown } from '../cart';
import { SubscriptionOffer } from '../components';
import { OrderStatusTimeline, OrderTrackingHero } from '../order';
import { PaymentPanel } from '../payment';
import { useOrder } from '../hooks';
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

  const q = useOrder(orderId);
  const order = q.data;
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
        <PaymentPanel order={order} provider={provider} onBack={() => navigate('/checkout')} />
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

      {/* SOW step 10 — the subscription pitch, once the order is in. */}
      <SubscriptionOffer />

      <div className="flex gap-2">
        <Button variant="secondary" fullWidth onClick={() => navigate(branchMenu)}>Add more items</Button>
        <Button variant="ghost" fullWidth onClick={() => navigate('/discover')}>Continue browsing</Button>
      </div>
    </div>
  );
}
