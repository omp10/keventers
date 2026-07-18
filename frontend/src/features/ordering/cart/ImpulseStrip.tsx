import { Button, Icon } from '@/design-system';
import { getActiveBranchSlug } from '@/features/discovery';
import { JOURNEY, useJourney } from '@/platform/analytics';
import { api } from '@/platform/api';
import { qk, useQueryResource } from '@/platform/query';
import { formatMoney } from '../format';
import { useCart } from '../hooks';
import type { Money } from '../types';

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
                onClick={async () => {
                  await cart.add({ productId: p.id, quantity: 1 });
                  journey(JOURNEY.IMPULSE_ITEM_ADDED, { productId: p.id, productSlug: p.slug, value: p.price, reason: p.reason });
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
