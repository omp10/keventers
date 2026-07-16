import { Icon } from '@/design-system';
import { cn } from '@/lib/cn';
import { formatMoney } from '../format';
import type { CartItem } from '../types';
import { QuantityStepper } from '../components';

/**
 * CartItemRow — one cart line: name, chosen variant/modifiers/add-ons, quantity
 * stepper, and the backend-computed line total. Prices are never recomputed here.
 */
export function CartItemRow({
  item,
  onQuantity,
  onRemove,
  onEdit,
  disabled,
}: {
  item: CartItem;
  onQuantity: (qty: number) => void;
  onRemove: () => void;
  onEdit?: () => void;
  disabled?: boolean;
}) {
  const options = [item.variantName, ...item.modifiers.map((m) => m.name), ...item.addons.map((a) => a.name)].filter(Boolean);

  return (
    <div className="flex items-start gap-3 border-b border-border py-3">
      {item.imageUrl && (
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
          <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{item.name}</p>
        {options.length > 0 && <p className="truncate text-xs text-foreground-muted">{options.join(' · ')}</p>}
        {item.instructions && <p className="mt-0.5 text-xs italic text-foreground-subtle">“{item.instructions}”</p>}
        <div className="mt-1.5 flex items-center gap-3">
          <QuantityStepper value={item.quantity} onChange={onQuantity} min={1} removable disabled={disabled} size="sm" />
          {onEdit && (
            <button type="button" onClick={onEdit} className="text-xs font-medium text-primary hover:underline">
              Edit
            </button>
          )}
          <button type="button" onClick={onRemove} aria-label="Remove" className="text-foreground-subtle hover:text-danger">
            <Icon name="delete" className={cn('h-4 w-4')} />
          </button>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold text-foreground">{formatMoney(item.lineTotal)}</p>
      </div>
    </div>
  );
}
