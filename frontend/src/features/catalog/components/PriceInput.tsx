import { Input } from '@/design-system';
import type { Money } from '../types';

const SYMBOLS: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };

/**
 * PriceInput — edits a price and emits a Money DTO. The user enters the major value;
 * we convert to minor units for storage (input handling, not order pricing — the
 * backend validates + owns all pricing rules). Currency comes from a prop.
 */
export function PriceInput({
  value,
  onChange,
  currency = 'INR',
  placeholder = '0.00',
  id,
}: {
  value?: Money | null;
  onChange: (money: Money) => void;
  currency?: string;
  placeholder?: string;
  id?: string;
}) {
  const cur = value?.currency ?? currency;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted">{SYMBOLS[cur] ?? cur}</span>
      <Input
        id={id}
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={value?.major ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const major = e.target.value === '' ? 0 : Number(e.target.value);
          onChange({ major, amount: Math.round(major * 100), currency: cur });
        }}
        className="pl-8"
      />
    </div>
  );
}
