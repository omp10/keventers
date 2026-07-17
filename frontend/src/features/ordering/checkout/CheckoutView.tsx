import { useState } from 'react';

import { Button, Checkbox, Icon, Spinner, Textarea, toast } from '@/design-system';
import { cn } from '@/lib/cn';
import { useCart, useCheckout } from '../hooks';
import { PriceBreakdown } from '../cart/PriceBreakdown';
import type { Order, PaymentProvider } from '../types';

// Per the client: UPI, debit/credit cards, and cash ONLY — no wallets,
// netbanking or COD variants in the list. UPI rides PhonePe; cards ride
// Razorpay (its checkout is card-first when opened this way).
const PROVIDERS: { id: PaymentProvider; label: string; hint: string; icon: 'payment' | 'store' }[] = [
  { id: 'phonepe', label: 'UPI', hint: 'Pay with any UPI app', icon: 'payment' },
  { id: 'razorpay', label: 'Debit / credit card', hint: 'Secure card checkout', icon: 'payment' },
  { id: 'cash', label: 'Cash', hint: 'Pay at the counter', icon: 'store' },
];

/**
 * CheckoutView — the order summary + payment-method selection. Guest and linked
 * customers share this flow (the session carries identity). Placing the order locks
 * the cart and creates an immutable order via the backend; then the page proceeds
 * to payment. All amounts are read-only from the Pricing Engine.
 */
export function CheckoutView({ onPlaced }: { onPlaced: (order: Order, provider: PaymentProvider) => void }) {
  const cart = useCart();
  const { checkout, isPending } = useCheckout();
  const [provider, setProvider] = useState<PaymentProvider>('razorpay');
  const [notes, setNotes] = useState('');
  const [accepted, setAccepted] = useState(true);

  if (cart.isLoading) {
    return (
      <div className="grid h-40 place-items-center">
        <Spinner />
      </div>
    );
  }

  const place = async () => {
    if (!accepted) {
      toast.error('Please accept the terms to continue');
      return;
    }
    try {
      const order = await checkout({ notes: notes.trim() || undefined, acceptedTerms: accepted });
      onPlaced(order, provider);
    } catch (e) {
      toast.error('Could not place your order', { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Summary */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Order summary</h2>
        <div className="rounded-xl border border-border bg-surface p-3 text-sm">
          {cart.items.map((i) => (
            <div key={i.id} className="flex justify-between py-1">
              <span className="text-foreground-muted">
                {i.quantity} × {i.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Payment method */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Payment method</h2>
        <div className="space-y-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvider(p.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
                provider === p.id ? 'border-primary ring-2 ring-primary/25' : 'border-border hover:border-border-strong',
              )}
            >
              <Icon name={p.icon} className="h-5 w-5 text-primary" />
              <span className="flex-1">
                <span className="block text-sm font-medium text-foreground">{p.label}</span>
                <span className="block text-xs text-foreground-muted">{p.hint}</span>
              </span>
              <span className={cn('grid h-5 w-5 place-items-center rounded-full border-2', provider === p.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                {provider === p.id && <Icon name="check" className="h-3 w-3" />}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Notes */}
      <section>
        <label className="mb-1 block text-sm font-medium text-foreground">Order notes</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any instructions for this order?" rows={2} maxLength={240} />
      </section>

      {/* Pricing */}
      {cart.pricing && <PriceBreakdown pricing={cart.pricing} />}

      {/* Terms */}
      <label className="flex items-start gap-2 text-sm text-foreground-muted">
        <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(Boolean(v))} />
        <span>I agree to the Terms of Service and understand my order details.</span>
      </label>

      {/* Place order */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-3 backdrop-blur" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto max-w-2xl">
          <Button size="lg" fullWidth loading={isPending} disabled={cart.isEmpty} onClick={place}>
            {provider === 'cash' ? 'Place order' : 'Place order & pay'}
          </Button>
        </div>
      </div>
    </div>
  );
}
