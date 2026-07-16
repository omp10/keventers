import { cn } from '@/lib/cn';
import { formatMoney } from '../format';
import type { Money } from '../types';

/**
 * PriceTag — displays a catalog price, with an optional discounted price shown as
 * the primary value and the original struck through. Pure display of backend Money
 * values — no arithmetic.
 */
export function PriceTag({ price, discounted, className }: { price: Money; discounted?: Money | null; className?: string }) {
  const hasDiscount = discounted && discounted.amount < price.amount;
  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      <span className="font-semibold text-foreground">{formatMoney(hasDiscount ? discounted : price)}</span>
      {hasDiscount && <span className="text-xs text-foreground-subtle line-through">{formatMoney(price)}</span>}
    </span>
  );
}
