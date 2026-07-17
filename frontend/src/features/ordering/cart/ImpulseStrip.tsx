import { useMemo } from 'react';

import { Button, Icon } from '@/design-system';
import { getActiveBranchSlug } from '@/features/discovery';
import { JOURNEY, useJourney } from '@/platform/analytics';
import { formatMoney } from '../format';
import { useCart, useMenu } from '../hooks';

/**
 * ImpulseStrip — the client's "small-value items in the cart" ask: dishes under
 * ₹70 from this branch's menu, one tap to add, shown only while the cart has
 * something in it. Customizable products are excluded — an impulse add must be
 * one tap, not a configuration dialog.
 */
const IMPULSE_CEILING_MAJOR = 70;

export function ImpulseStrip() {
  const cart = useCart();
  const journey = useJourney();
  const branchSlug = getActiveBranchSlug() ?? undefined;
  const menu = useMenu(branchSlug);

  const picks = useMemo(() => {
    const inCart = new Set(cart.items.map((i) => i.productId));
    return (menu.data?.products ?? [])
      .filter(
        (p) =>
          p.available !== false &&
          !p.customizable &&
          !(p.variants?.length || p.modifierGroups?.length) &&
          !inCart.has(p.id) &&
          (p.price?.major ?? Infinity) <= IMPULSE_CEILING_MAJOR,
      )
      .slice(0, 8);
  }, [menu.data, cart.items]);

  if (picks.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Icon name="star" className="h-4 w-4 text-primary" /> Little extras
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {picks.map((p) => (
          <div key={p.id} className="w-36 shrink-0 rounded-xl border border-border bg-surface p-2.5">
            {p.imageUrl && <img src={p.imageUrl} alt="" className="mb-2 h-16 w-full rounded-lg object-cover" />}
            <p className="truncate text-xs font-medium text-foreground">{p.name}</p>
            <div className="mt-1.5 flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-foreground">{formatMoney(p.price)}</span>
              <Button
                size="sm"
                variant="secondary"
                disabled={cart.isMutating}
                onClick={async () => {
                  await cart.add({ productId: p.id, quantity: 1 });
                  journey(JOURNEY.IMPULSE_ITEM_ADDED, { productId: p.id, productSlug: p.slug, value: p.price?.amount });
                }}
              >
                Add
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
