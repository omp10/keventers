import { useState } from 'react';

import { Button, Icon, toast } from '@/design-system';
import { getActiveBranchSlug } from '@/features/discovery';
import { JOURNEY, useJourney } from '@/platform/analytics';
import { api } from '@/platform/api';
import { qk, useQueryResource } from '@/platform/query';
import { ProductDetail } from '../components/ProductDetail';
import { formatMoney } from '../format';
import { useCart, useProduct } from '../hooks';
import type { CartItemSelection, Money } from '../types';

/**
 * ImpulseStrip — the pre-checkout upsell, fed by the UPSELL ENGINE: learned
 * frequently-bought-together pairs from this restaurant's own orders, blended
 * with the dashboard's upsell rules and a popularity floor. What's already in
 * the cart is excluded server-side; suggestions are one-tap adds.
 */
type Suggestion = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  reason: string;
  /** Product has variants or modifiers — a blind one-tap add would be rejected. */
  needsChoice?: boolean;
};

const money = (minor: number, currency: string): Money => ({ amount: minor, currency, major: minor / 100 });

export function ImpulseStrip() {
  const cart = useCart();
  const journey = useJourney();
  const branchSlug = getActiveBranchSlug();
  const seedIds = cart.items.map((i) => i.productId);

  const q = useQueryResource<Suggestion[]>(
    qk('ordering', 'upsell', branchSlug, [...seedIds].sort().join(',')),
    () => api.post(`/public/branches/${encodeURIComponent(branchSlug!)}/upsell`, { seedIds }, { skipAuth: true }),
    { enabled: Boolean(branchSlug) && seedIds.length > 0, staleTime: 60_000 },
  );

  // A product with variants/modifiers cannot be added blind — the cart rejects it
  // with VARIANT_REQUIRED. Open the same picker the menu uses instead of dropping
  // the tap on the floor, which is what used to happen: Biryani (one variant) did
  // nothing at all while Gulab Jamun (none) added fine.
  const [pickSlug, setPickSlug] = useState<string>();
  const detail = useProduct(branchSlug ?? undefined, pickSlug);

  const add = async (selection: CartItemSelection, p: Suggestion) => {
    try {
      await cart.add(selection);
      journey(JOURNEY.IMPULSE_ITEM_ADDED, { productId: p.id, productSlug: p.slug, value: p.price, reason: p.reason });
      setPickSlug(undefined);
    } catch (e) {
      // This add was previously unguarded, so a rejection was invisible.
      toast.error(`Could not add ${p.name}`, { description: (e as Error).message });
    }
  };

  const picks = q.data ?? [];
  if (picks.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Icon name="star" className="h-4 w-4 text-primary" /> Goes well with your order
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {picks.map((p) => (
          <div key={p.id} className="w-40 shrink-0 rounded-xl border border-border bg-surface p-2.5">
            {p.imageUrl && <img src={p.imageUrl} alt="" className="mb-2 h-16 w-full rounded-lg object-cover" />}
            <p className="truncate text-xs font-medium text-foreground">{p.name}</p>
            <p className="truncate text-[0.625rem] text-foreground-subtle">{p.reason}</p>
            <div className="mt-1.5 flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-foreground">{formatMoney(money(p.price, p.currency))}</span>
              <Button
                size="sm"
                variant="secondary"
                disabled={cart.isMutating}
                onClick={() => {
                  if (p.needsChoice) { setPickSlug(p.slug); return; }
                  void add({ productId: p.id, quantity: 1 }, p);
                }}
              >
                {p.needsChoice ? 'Choose' : 'Add'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* The menu's own picker, reused verbatim — variants, modifiers, add-ons. */}
      <ProductDetail
        product={detail.data}
        loading={detail.isLoading}
        open={Boolean(pickSlug)}
        onOpenChange={(o) => !o && setPickSlug(undefined)}
        onAddToCart={(selection) => {
          const p = picks.find((x) => x.slug === pickSlug);
          return p ? add(selection, p) : undefined;
        }}
      />
    </section>
  );
}
