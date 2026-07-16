import { Icon } from '@/design-system';
import { cn } from '@/lib/cn';

/**
 * QuantityStepper — reusable +/− quantity control. At quantity 1 the minus turns
 * into a remove (trash) affordance when `removable`. Accessible + token-driven.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  removable = false,
  disabled = false,
  size = 'md',
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  removable?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const dec = () => onChange(Math.max(min - (removable ? 1 : 0), value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const btn = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';

  return (
    <div className={cn('inline-flex items-center rounded-lg border border-primary/40 bg-primary-soft', className)}>
      <button
        type="button"
        aria-label={removable && value <= min ? 'Remove item' : 'Decrease quantity'}
        onClick={dec}
        disabled={disabled}
        className={cn('grid place-items-center rounded-l-lg text-primary transition hover:bg-primary/10 disabled:opacity-50', btn)}
      >
        <Icon name={removable && value <= min ? 'delete' : 'remove'} className="h-4 w-4" />
      </button>
      <span className={cn('min-w-6 text-center text-sm font-semibold text-primary', size === 'sm' && 'min-w-5')} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={inc}
        disabled={disabled || value >= max}
        className={cn('grid place-items-center rounded-r-lg text-primary transition hover:bg-primary/10 disabled:opacity-50', btn)}
      >
        <Icon name="add" className="h-4 w-4" />
      </button>
    </div>
  );
}
