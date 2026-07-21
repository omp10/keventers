import { useCallback, useEffect, useRef, useState } from 'react';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';

import { Button, Icon, Spinner } from '@/design-system';
import { formatMoney } from '../format';
import { usePayment } from '../hooks';
import type { Order, PaymentIntent, PaymentProvider } from '../types';
import { launchPayment } from './provider-launch';

type Phase = 'initiating' | 'awaiting' | 'processing' | 'success' | 'failed' | 'cancelled' | 'unavailable';

/**
 * PaymentPanel — orchestrates a single payment attempt over the Payment Platform:
 * create intent → hand off to the provider → confirm → reflect status.
 *
 * `onCaptured` lets a caller (checkout) GATE the next screen on a completed
 * payment: it fires only once the confirm call reports the money captured (or
 * authorized). Callers that don't pass it — the order page, where the panel is
 * just a pay-now widget — keep relying on the realtime payment status to hide
 * the panel, so the extra success beat is harmless there.
 */
export function PaymentPanel({ order, provider, method, onBack, onCaptured }: { order: Order; provider: PaymentProvider; method?: 'upi' | 'card'; onBack: () => void; onCaptured?: () => void }) {
  const { createIntent, confirm } = usePayment();
  const [phase, setPhase] = useState<Phase>('initiating');
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  const begin = useCallback(async () => {
    setPhase('initiating');
    setMessage(null);
    try {
      // Backend method is a strict enum with no bare 'card' (it splits
      // credit_card/debit_card). Only 'upi' is safe to constrain the intent to;
      // for card we leave it open and let Razorpay's sheet handle credit vs
      // debit. `method` still drives the sheet's preselect below either way.
      const apiMethod = method === 'upi' ? 'upi' : undefined;
      const it = await createIntent(order.id, provider, apiMethod);
      setIntent(it);
      setPhase('awaiting');
      await launchPayment(
        it,
        {
          onSuccess: async (payload) => {
            setPhase('processing');
            try {
              const res = await confirm(it.id, payload);
              // Synchronous capture is the normal path (our confirm verifies the
              // signature AND captures). Show success and let the gate fire. If
              // it somehow returns not-yet-captured, stay in 'processing' and let
              // the realtime status finish.
              if (res.status === 'captured' || res.status === 'authorized') {
                setPhase('success');
                onCaptured?.();
              }
            } catch {
              /* server reconciles via webhook; parent reflects final status */
            }
          },
          onCancel: () => setPhase('cancelled'),
          onError: (m) => {
            setMessage(m);
            setPhase('failed');
          },
          onUnavailable: () => setPhase('unavailable'),
        },
        {
          name: order.branch.restaurantName ?? order.branch.name,
          description: `Order #${order.orderNumber}`,
          method,
        },
      );
    } catch (e) {
      setMessage((e as Error).message);
      setPhase('failed');
    }
  }, [order.id, order.branch.name, order.branch.restaurantName, order.orderNumber, provider, method, createIntent, confirm, onCaptured]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void begin();
  }, [begin]);

  const retry = () => {
    started.current = true;
    void begin();
  };

  const amount = intent?.amount ?? order.pricing.total;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 text-center">
      {phase === 'success' && (
        <div className="flex flex-col items-center gap-2 py-3">
          {/* One-shot celebratory tick (loop=false) — a looping success reads
              as the app being stuck, not as a celebration. */}
          <div className="h-28 w-28">
            <DotLottieReact src="/animations/payment-success.lottie" loop={false} autoplay className="h-full w-full" />
          </div>
          <p className="text-base font-semibold text-foreground">Payment successful</p>
          <p className="text-sm text-foreground-muted">Taking you to your order…</p>
        </div>
      )}

      {(phase === 'initiating' || phase === 'processing') && (
        <div className="flex flex-col items-center gap-3 py-4">
          <Spinner />
          <p className="text-sm text-foreground-muted">{phase === 'initiating' ? 'Setting up secure payment…' : 'Confirming your payment…'}</p>
        </div>
      )}

      {phase === 'awaiting' && (
        <div className="space-y-3 py-2">
          <Icon name="payment" className="mx-auto h-9 w-9 text-primary" />
          <p className="text-sm text-foreground">Complete the payment of {formatMoney(amount)} in the payment window.</p>
          <Button variant="ghost" size="sm" leftIcon="refresh" onClick={retry}>
            Reopen payment
          </Button>
        </div>
      )}

      {phase === 'unavailable' && (
        <div className="space-y-3 py-2">
          <Icon name="warning" className="mx-auto h-9 w-9 text-warning" />
          <p className="text-sm text-foreground">Payment couldn’t start on this device.</p>
          <div className="flex justify-center gap-2">
            <Button size="sm" leftIcon="refresh" onClick={retry}>Try again</Button>
            <Button size="sm" variant="ghost" onClick={onBack}>Change method</Button>
          </div>
        </div>
      )}

      {(phase === 'failed' || phase === 'cancelled') && (
        <div className="space-y-3 py-2">
          <Icon name={phase === 'cancelled' ? 'info' : 'error'} className={`mx-auto h-9 w-9 ${phase === 'cancelled' ? 'text-foreground-muted' : 'text-danger'}`} />
          <p className="text-sm text-foreground">{phase === 'cancelled' ? 'Payment was cancelled.' : message ?? 'Payment failed.'}</p>
          <div className="flex justify-center gap-2">
            <Button size="sm" leftIcon="refresh" onClick={retry}>Retry payment</Button>
            <Button size="sm" variant="ghost" onClick={onBack}>Change method</Button>
          </div>
        </div>
      )}
    </div>
  );
}
