import { useState } from 'react';

import { Button, Checkbox, Icon, Spinner, Textarea, toast, type IconName } from '@/design-system';
import { cn } from '@/lib/cn';
import { useCart, useCheckout } from '../hooks';
import { PriceBreakdown } from '../cart/PriceBreakdown';
import { PaymentPanel } from '../payment';
import { formatMoney } from '../format';
import type { Order, PaymentMethod, PaymentProvider } from '../types';

/**
 * Per the client: UPI, debit/credit cards, and cash ONLY. Both online options
 * ride Razorpay's unified checkout — one set of platform keys covers UPI, cards,
 * netbanking and wallets — so `method` just tells the sheet which to preselect.
 * (The old design routed UPI to PhonePe, which needs separate PhonePe merchant
 * keys nobody has; a single gateway makes both work.)
 */
type Option = {
  id: string;
  provider: PaymentProvider;
  method?: PaymentMethod;
  label: string;
  hint: string;
  icon: IconName;
};
const OPTIONS: Option[] = [
  { id: 'upi', provider: 'razorpay', method: 'upi', label: 'UPI', hint: 'GPay, PhonePe, Paytm & any UPI app', icon: 'qrCode' },
  { id: 'card', provider: 'razorpay', method: 'card', label: 'Debit / credit card', hint: 'Visa, Mastercard, RuPay, Amex', icon: 'payment' },
  { id: 'cash', provider: 'cash', label: 'Cash', hint: 'Pay at the counter', icon: 'store' },
];

/**
 * CheckoutView — order summary + payment-method selection. Guest and linked
 * customers share this flow (the session carries identity). Placing the order
 * locks the cart and creates an immutable order; then the page proceeds to
 * payment. All amounts are read-only from the Pricing Engine.
 */
export function CheckoutView({ onPlaced, onPaymentStep }: { onPlaced: (order: Order, provider: PaymentProvider, method?: PaymentMethod) => void; onPaymentStep?: (order: Order | null) => void }) {
  const cart = useCart();
  const { checkout, isPending } = useCheckout();
  const [optionId, setOptionId] = useState<string>('upi');
  const [notes, setNotes] = useState('');
  const [accepted, setAccepted] = useState(true);
  // Set once an ONLINE order is placed: we then stay on this screen and run the
  // payment inline, only advancing to tracking once the money is captured.
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const option = OPTIONS.find((o) => o.id === optionId) ?? OPTIONS[0];

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
      // Cash: nothing to collect now — go straight to tracking. Online: hold on
      // this screen and pay first; only success moves us forward.
      if (option.provider === 'cash') {
        onPlaced(order, 'cash');
        return;
      }
      setPlacedOrder(order);
      // Tell the page we're on the payment step so its back button targets the
      // placed order, not the now-empty cart.
      onPaymentStep?.(order);
    } catch (e) {
      toast.error('Could not place your order', { description: (e as Error).message });
    }
  };

  // ── Inline payment step: shown after an online order is placed. The order
  // already exists (the cart is locked), so we don't return to the form; the
  // only ways out are a captured payment (→ tracking) or the user choosing to
  // finish paying later on the order screen. ──
  if (placedOrder) {
    return (
      <div className="mx-auto max-w-lg space-y-5 px-1 py-4">
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground">Complete your payment</h2>
          <p className="mt-1 text-sm text-foreground-muted">Order #{placedOrder.orderNumber} is placed — pay now to send it to the kitchen.</p>
        </div>
        <PaymentPanel
          order={placedOrder}
          provider={option.provider}
          method={option.method === 'card' || option.method === 'upi' ? option.method : undefined}
          onCaptured={() => onPlaced(placedOrder, option.provider, option.method)}
          // The cart is already consumed, so "back" can't return to the form.
          // Send them to the live order, where they can retry payment or track.
          onBack={() => onPlaced(placedOrder, option.provider, option.method)}
        />
      </div>
    );
  }

  const total = cart.pricing?.total;
  const isCash = option.provider === 'cash';

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-1 pb-28">
      {/* Order summary — now WITH images */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">Order summary</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {cart.items.map((i, idx) => (
            <div key={i.id} className={cn('flex items-center gap-3 p-3', idx > 0 && 'border-t border-border/70')}>
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                {i.imageUrl ? (
                  <img src={i.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary-soft to-muted">
                    <Icon name="utensils" className="h-5 w-5 text-primary/50" />
                  </div>
                )}
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.6875rem] font-bold text-primary-foreground shadow">
                  {i.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{i.name}</p>
                {i.variantName && <p className="truncate text-xs text-foreground-muted">{i.variantName}</p>}
                {i.addons?.length > 0 && (
                  <p className="truncate text-xs text-foreground-subtle">{i.addons.map((a) => a.name).join(', ')}</p>
                )}
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatMoney(i.lineTotal)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Payment method */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">Payment method</h2>
        <div className="space-y-2.5">
          {OPTIONS.map((o) => {
            const selected = o.id === optionId;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setOptionId(o.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition',
                  selected
                    ? 'border-primary bg-primary-soft/40 ring-2 ring-primary/25'
                    : 'border-border bg-surface hover:border-border-strong',
                )}
              >
                <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-primary')}>
                  <Icon name={o.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{o.label}</span>
                  <span className="block truncate text-xs text-foreground-muted">{o.hint}</span>
                </span>
                <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                  {selected && <Icon name="check" className="h-3 w-3" />}
                </span>
              </button>
            );
          })}
        </div>
        {!isCash && (
          <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-foreground-subtle">
            <Icon name="shield" className="h-3.5 w-3.5 text-success" />
            Secured by Razorpay · your card and UPI details never touch our servers.
          </p>
        )}
      </section>

      {/* Notes */}
      <section>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Order notes</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any instructions for this order? (e.g. less spicy)" rows={2} maxLength={240} />
      </section>

      {/* Pricing */}
      {cart.pricing && <PriceBreakdown pricing={cart.pricing} />}

      {/* Terms */}
      <label className="flex items-start gap-2.5 px-1 text-sm text-foreground-muted">
        <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(Boolean(v))} className="mt-0.5" />
        <span>I agree to the Terms of Service and understand my order details.</span>
      </label>

      {/* Sticky place-order bar — now shows the amount on the button itself */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-3 backdrop-blur" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="shrink-0 pl-1">
            <p className="text-[0.6875rem] uppercase tracking-wide text-foreground-subtle">To pay</p>
            <p className="text-lg font-bold leading-none tabular-nums text-foreground">{total ? formatMoney(total) : '—'}</p>
          </div>
          <Button size="lg" className="flex-1" loading={isPending} disabled={cart.isEmpty} onClick={place}>
            {isCash ? 'Place order' : 'Place order & pay'}
          </Button>
        </div>
      </div>
    </div>
  );
}
