import { Icon, type IconName } from '@/design-system';
import { ProductCard } from '../components';
import type { Product } from '../types';

/**
 * ProductRail — a titled horizontal carousel of products (Popular / Recommended /
 * Recently ordered). Reuses the one ProductCard; renders nothing when empty.
 */
export function ProductRail({
  title,
  icon,
  products,
  onAdd,
  onDecrement,
  onOpen,
  onPrefetch,
  cartQuantities,
}: {
  title: string;
  icon: IconName;
  products: Product[];
  onAdd: (p: Product) => void;
  onDecrement?: (p: Product) => void;
  onOpen: (p: Product) => void;
  onPrefetch?: (slug: string) => void;
  cartQuantities?: Record<string, number>;
}) {
  if (!products || products.length === 0) return null;
  return (
    <section className="pt-4">
      <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground">
        <Icon name={icon} className="h-4 w-4 text-primary" />
        {title}
      </h2>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((p) => (
          <div key={p.id} className="w-44 shrink-0 snap-start">
            <ProductCard product={p} variant="grid" onAdd={onAdd} onDecrement={onDecrement} onOpen={onOpen} onPrefetch={onPrefetch} inCartQty={cartQuantities?.[p.id]} className="h-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
