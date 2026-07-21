import { useEffect, useRef, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useReducedMotion } from 'framer-motion';

import { Button, Icon, Spinner, Textarea, EmptyState } from '@/design-system';
import { formatMinutes, formatMoney } from '../format';
import { useCart, useLoyalty } from '../hooks';
import { useAuth } from '@/platform/auth';
import { CartItemRow } from './CartItemRow';
import { CouponCelebration } from './CouponCelebration';
import { CouponInput } from './CouponInput';
import { CouponsSheet } from './CouponsSheet';
import { ImpulseStrip } from './ImpulseStrip';
import { PriceBreakdown } from './PriceBreakdown';

/**
 * CartView — the full cart surface (used by the cart page/drawer). Self-contained:
 * reads the server-authoritative cart via `useCart` and renders items, coupon,
 * notes, estimated time, and the read-only Pricing-Engine breakdown, with a
 * checkout CTA. No price math happens here.
 */
export function CartView({
  onCheckout,
  onBrowse,
  onEditItem,
}: {
  onCheckout: () => void;
  onBrowse: () => void;
  onEditItem?: (productId: string) => void;
}) {
  const cart = useCart();
  const { isAuthenticated } = useAuth();
  const loyalty = useLoyalty();
  const [sheetOpen, setSheetOpen] = useState(false);
  const reduced = Boolean(useReducedMotion());
  // One celebration owner for BOTH the code field and the sheet: fire whenever a
  // coupon goes from none → applied. A ref of the previous code detects it
  // without re-firing on every render.
  const [celebrate, setCelebrate] = useState<{ token: number; code: string } | null>(null);
  const prevCoupon = useRef<string | null | undefined>(cart.coupon?.code ?? null);
  useEffect(() => {
    const now = cart.coupon?.code ?? null;
    if (now && now !== prevCoupon.current) {
      setCelebrate({ token: Date.now(), code: now });
      setSheetOpen(false);
    }
    prevCoupon.current = now;
  }, [cart.coupon?.code]);

  if (cart.isLoading) {
    return (
      <div className="grid h-40 place-items-center">
        <Spinner />
      </div>
    );
  }

  if (cart.isEmpty) {
    return (
      <EmptyState
        // An ILLUSTRATED empty state (self-hosted dotLottie), not a grey icon —
        // the moment the cart empties is exactly when the app looks deadest.
        icon={
          <div className="mx-auto mb-2 h-40 w-40">
            <DotLottieReact src="/animations/empty-cart.lottie" loop={!reduced} autoplay={!reduced} className="h-full w-full" />
          </div>
        }
        title="Your cart is empty"
        description="Add items from the menu to get started."
        action={<Button onClick={onBrowse}>Browse menu</Button>}
        size="sm"
      />
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Items */}
      <div>
        {cart.items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            disabled={cart.isMutating}
            onQuantity={(qty) => (qty <= 0 ? cart.removeItem(item.id) : cart.setQuantity(item.id, qty))}
            onRemove={() => cart.removeItem(item.id)}
            onEdit={onEditItem ? () => onEditItem(item.productId) : undefined}
          />
        ))}
      </div>

      {cart.estimatedMinutes != null && (
        <p className="flex items-center gap-1.5 text-sm text-foreground-muted">
          <Icon name="clock" className="h-4 w-4" /> Estimated {formatMinutes(cart.estimatedMinutes)}
        </p>
      )}

      {/* Small-value one-tap adds (client ask: items under ₹70 live in the cart). */}
      <ImpulseStrip />

      {/* Coupon */}
      <CouponInput
        applied={cart.coupon}
        onApply={async (code) => { await cart.applyCoupon(code); }}
        onRemove={async () => { await cart.removeCoupon(); }}
        onBrowse={cart.coupon ? undefined : () => setSheetOpen(true)}
        applying={cart.isMutating}
        error={cart.couponError ? cart.couponError.message : null}
      />

      {celebrate && (
        <CouponCelebration
          token={celebrate.token}
          code={celebrate.code}
          savedLabel={cart.pricing?.savings && cart.pricing.savings.amount > 0 ? formatMoney(cart.pricing.savings) : null}
        />
      )}

      <CouponsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        appliedCode={cart.coupon?.code ?? null}
        applying={cart.isMutating}
        // No catch: the sheet displays the rejection reason next to the coupon.
        onApply={async (code) => { await cart.applyCoupon(code); }}
      />

      {/* Notes */}
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Cart note</label>
        <Textarea
          defaultValue={cart.cart?.notes}
          onBlur={(e) => e.target.value !== (cart.cart?.notes ?? '') && cart.setNotes(e.target.value)}
          placeholder="Add a note for the restaurant"
          rows={2}
          maxLength={200}
        />
      </div>

      {/* Pricing (read-only) */}
      {cart.pricing && <PriceBreakdown pricing={cart.pricing} />}

      {/* Loyalty (client ask): repeat customers see their points; guests see
          what they'd gain by signing in. */}
      {isAuthenticated && loyalty.isLinked && loyalty.account ? (
        <p className="flex items-center gap-1.5 rounded-xl bg-primary-soft px-3 py-2 text-sm text-primary">
          <Icon name="star" className="h-4 w-4" /> You have {loyalty.account.balance} loyalty points — this order earns you more.
        </p>
      ) : (
        <p className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-sm text-foreground-muted">
          <Icon name="star" className="h-4 w-4" /> Sign in with your phone number to earn loyalty points on this order.
        </p>
      )}

      {/* Checkout CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-3 backdrop-blur" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-foreground-muted">Total</p>
            <p className="truncate text-base font-bold text-foreground">{cart.pricing ? formatMoney(cart.pricing.total) : ''}</p>
          </div>
          <Button size="lg" fullWidth className="flex-[2]" onClick={onCheckout} disabled={cart.isMutating}>
            Proceed to checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
