import { Button, Icon, Spinner, Textarea, EmptyState } from '@/design-system';
import { formatMinutes, formatMoney } from '../format';
import { useCart } from '../hooks';
import { CartItemRow } from './CartItemRow';
import { CouponInput } from './CouponInput';
import { PriceBreakdown } from './PriceBreakdown';

/**
 * CartView — the full cart surface (used by the cart page/drawer). Self-contained:
 * reads the server-authoritative cart via `useCart` and renders items, coupon,
 * notes, estimated time, and the read-only Pricing-Engine breakdown, with a
 * checkout CTA. No price math happens here.
 */
export function CartView({
  branchSlug,
  onCheckout,
  onBrowse,
  onEditItem,
}: {
  branchSlug: string;
  onCheckout: () => void;
  onBrowse: () => void;
  onEditItem?: (productId: string) => void;
}) {
  const cart = useCart(branchSlug);

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
        icon={<Icon name="cart" className="mb-3 h-8 w-8 text-muted-foreground" />}
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

      {/* Coupon */}
      <CouponInput
        applied={cart.coupon}
        onApply={async (code) => { await cart.applyCoupon(code); }}
        onRemove={async () => { await cart.removeCoupon(); }}
        applying={cart.isMutating}
        error={cart.couponError ? cart.couponError.message : null}
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
