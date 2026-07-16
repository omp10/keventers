import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, Icon, Spinner } from '@/design-system';
import { formatMoney } from '../format';
import { usePayment } from '../hooks';
import type { Order, PaymentIntent, PaymentProvider } from '../types';
import { launchPayment } from './provider-launch';

type Phase = 'initiating' | 'awaiting' | 'processing' | 'failed' | 'cancelled' | 'unavailable';

/**
 * PaymentPanel — orchestrates a single payment attempt over the Payment Platform:
 * create intent → hand off to the provider → reflect status. Final success is
 * driven by the parent from the order's realtime payment status (webhook
 * reconciliation), so this only needs to run the handshake and offer retry.
 */
export function PaymentPanel({ order, provider, onBack }: { order: Order; provider: PaymentProvider; onBack: () => void }) {
  const { createIntent, confirm } = usePayment();
  const [phase, setPhase] = useState<Phase>('initiating');
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  const begin = useCallback(async () => {
    setPhase('initiating');
    setMessage(null);
    try {
      const it = await createIntent(order.id, provider);
      setIntent(it);
      setPhase('awaiting');
      launchPayment(it, {
        onSuccess: async (payload) => {
          setPhase('processing');
          try {
            await confirm(it.id, payload);
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
      });
    } catch (e) {
      setMessage((e as Error).message);
      setPhase('failed');
    }
  }, [order.id, provider, createIntent, confirm]);

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
