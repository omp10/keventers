import { Badge, Button, Icon } from '@/design-system';
import { cn } from '@/lib/cn';
import { formatMinutes } from '../format';
import type { Product } from '../types';
import { PriceTag } from './PriceTag';
import { VegMark } from './VegMark';

export type ProductCardVariant = 'grid' | 'list' | 'carousel';

export type ProductCardProps = {
  product: Product;
  variant?: ProductCardVariant;
  /** ADD / increment pressed — parent decides open-detail (customizable) vs quick-add. */
  onAdd: (product: Product) => void;
  /** Decrement pressed. Only wired where a stepper makes sense (the menu). */
  onDecrement?: (product: Product) => void;
  /** Open the product detail drawer. */
  onOpen?: (product: Product) => void;
  onPrefetch?: (slug: string) => void;
  inCartQty?: number;
  className?: string;
};

/**
 * ProductCard — the ONE reusable product card. Same component in grid, list,
 * carousel, category, search, recommendations, and favorites — only layout changes.
 * Fully theme-driven (white-label). Prices come from backend Money DTOs (never
 * computed). The ADD affordance defers customization/pricing to the detail drawer +
 * cart.
 */
export function ProductCard({ product, variant = 'list', onAdd, onDecrement, onOpen, onPrefetch, inCartQty, className }: ProductCardProps) {
  const horizontal = variant === 'list';
  const unavailable = !product.available;
  const optionCount = (product.variants?.length ?? 0) + (product.modifierGroups?.length ?? 0);

  const open = () => onOpen?.(product);
  const prefetch = () => onPrefetch?.(product.slug);

  const image = (
    <div className={cn('relative shrink-0 overflow-hidden rounded-xl bg-muted', horizontal ? 'h-28 w-28' : 'aspect-[4/3] w-full')}>
      {product.imageUrl ? (
        <img src={product.imageUrl} alt="" loading="lazy" className={cn('h-full w-full object-cover', unavailable && 'grayscale')} />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary-soft to-muted">
          <Icon name="utensils" className="h-6 w-6 text-primary/50" />
        </div>
      )}
    </div>
  );

  // In the cart → a stepper, not an Add button. A stepper is only meaningful
  // when the parent can actually change quantity, so it needs onDecrement wired;
  // where it isn't (search overlay), we fall back to the plain Add button and a
  // count. For CUSTOMIZABLE products "+" opens the drawer (a new line may be a
  // different size/modifier), while "-" removes one via the parent — it drops
  // the most recently added line.
  const stepper = (
    <div className="relative z-10 flex flex-col items-center">
      <div className="flex h-11 min-w-24 items-center justify-between rounded-md bg-primary px-1 font-semibold text-primary-foreground shadow-sm">
        <button
          type="button"
          aria-label={`Remove one ${product.name}`}
          onClick={(e) => { e.stopPropagation(); onDecrement?.(product); }}
          className="grid h-9 w-9 touch-manipulation place-items-center rounded active:scale-95"
        >
          <Icon name={inCartQty === 1 ? 'delete' : 'remove'} className="h-4 w-4" />
        </button>
        <span className="min-w-6 text-center tabular-nums" aria-live="polite">{inCartQty}</span>
        <button
          type="button"
          aria-label={`Add one ${product.name}`}
          onClick={(e) => { e.stopPropagation(); onAdd(product); }}
          className="grid h-9 w-9 touch-manipulation place-items-center rounded active:scale-95"
        >
          <Icon name="add" className="h-4 w-4" />
        </button>
      </div>
      {product.customizable && <span className="mt-0.5 text-[0.625rem] text-foreground-subtle">Customizable</span>}
    </div>
  );

  const addButton = (
    <div className="relative z-10 flex flex-col items-center">
      {inCartQty && onDecrement ? stepper : (
        <Button
          size="sm"
          variant={unavailable ? 'ghost' : 'secondary'}
          disabled={unavailable}
          onClick={(e) => {
            e.stopPropagation();
            onAdd(product);
          }}
          className="h-11 min-w-24 touch-manipulation font-semibold uppercase"
        >
          {unavailable ? 'Unavailable' : inCartQty ? `Add +${inCartQty > 1 ? ` (${inCartQty})` : ''}` : 'Add'}
        </Button>
      )}
      {product.customizable && !unavailable && !(inCartQty && onDecrement) && <span className="mt-0.5 text-[0.625rem] text-foreground-subtle">Customizable</span>}
    </div>
  );

  const body = (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {/* WRAPS. A no-wrap row pushed "Recommended" past the card edge in the
          narrow grid/carousel tiles — the badges are supplementary, so they
          should stack rather than overflow. `min-w-0` lets the row shrink
          inside the flex parent at all. */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <VegMark veg={product.veg} />
        {product.popular && <Badge tone="warning" variant="soft" className="max-w-full shrink-0 text-[0.625rem]">Popular</Badge>}
        {product.recommended && (
          <Badge tone="success" variant="soft" className="max-w-full shrink-0 text-[0.625rem]">
            {/* The word alone is wider than a 176px carousel tile once a Veg
                mark and Popular sit beside it; the short form still reads. */}
            <span className="hidden sm:inline">Recommended</span>
            <span className="sm:hidden">Top pick</span>
          </Badge>
        )}
      </div>
      <h3 className="font-semibold leading-tight text-foreground">{product.name}</h3>
      <div className="flex items-center gap-2 text-xs text-foreground-muted">
        <PriceTag price={product.price} discounted={product.discountedPrice} />
        {product.rating != null && (
          <span className="inline-flex items-center gap-0.5">
            <Icon name="star" className="h-3 w-3 text-warning" /> {product.rating.toFixed(1)}
          </span>
        )}
        {product.prepTimeMinutes != null && <span className="inline-flex items-center gap-0.5"><Icon name="clock" className="h-3 w-3" /> {formatMinutes(product.prepTimeMinutes)}</span>}
      </div>
      {product.description && <p className="line-clamp-2 text-xs text-foreground-subtle">{product.description}</p>}
      {optionCount > 0 && <span className="text-[0.6875rem] text-foreground-subtle">{optionCount} option{optionCount === 1 ? '' : 's'}</span>}
    </div>
  );

  if (horizontal) {
    return (
      <article
        onMouseEnter={prefetch}
        onFocus={prefetch}
        className={cn('flex items-start justify-between gap-3 border-b border-border py-4', className)}
      >
        <button type="button" onClick={open} className="flex min-w-0 flex-1 text-left focus-visible:outline-none">
          {body}
        </button>
        <div className="flex w-28 flex-col items-center gap-2">
          <button type="button" onClick={open} className="w-full focus-visible:outline-none">
            {image}
          </button>
          <div className="relative z-10 -mt-4">{addButton}</div>
        </div>
      </article>
    );
  }

  // grid / carousel
  return (
    <article
      onMouseEnter={prefetch}
      onFocus={prefetch}
      className={cn('flex h-full flex-col gap-2 rounded-2xl border border-border bg-surface p-3', className)}
    >
      <button type="button" onClick={open} className="focus-visible:outline-none">
        {image}
      </button>
      <div className="mt-1">{body}</div>
      <div className="mt-auto pt-1">{addButton}</div>
    </article>
  );
}
