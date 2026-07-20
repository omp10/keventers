import { cn } from '@/lib/cn';
import { formatMoney } from '../format';
import type { PricingBreakdown } from '../types';

function Row({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between py-1 text-sm', strong && 'text-base font-bold', muted && 'text-foreground-muted')}>
      <span>{label}</span>
      <span className={cn(strong ? 'text-foreground' : 'text-foreground')}>{value}</span>
    </div>
  );
}

/**
 * PriceBreakdown — a strictly READ-ONLY render of the Pricing Engine's breakdown.
 * The frontend performs NO arithmetic: subtotal, discount, coupon, each tax line,
 * service charge, total, and savings all come from the backend Money DTOs.
 */
export function PriceBreakdown({ pricing, className }: { pricing: PricingBreakdown; className?: string }) {
  const hasDiscount = pricing.discount && pricing.discount.amount > 0;
  const hasCoupon = pricing.couponDiscount && pricing.couponDiscount.amount > 0;

  return (
    <div className={cn('rounded-xl border border-border bg-surface p-4', className)}>
      <Row label="Item total" value={formatMoney(pricing.subtotal)} />
      {hasDiscount && <Row label="Discount" value={`− ${formatMoney(pricing.discount!)}`} muted />}
      {hasCoupon && <Row label="Coupon" value={`− ${formatMoney(pricing.couponDiscount!)}`} muted />}
      {/* `taxes` is absent on some order snapshots (and on any order priced
          before taxes were itemised). This component is shared with the STAFF
          order drawer, where one missing array was blanking the whole panel. */}
      {(pricing.taxes ?? []).map((t) => (
        <Row key={t.label} label={t.label} value={formatMoney(t.amount)} muted />
      ))}
      {pricing.serviceCharge && pricing.serviceCharge.amount > 0 && <Row label="Service charge" value={formatMoney(pricing.serviceCharge)} muted />}
      <div className="my-2 border-t border-dashed border-border" />
      <Row label="To pay" value={formatMoney(pricing.total)} strong />
      {pricing.savings && pricing.savings.amount > 0 && (
        <div className="mt-2 rounded-lg bg-success-soft px-3 py-1.5 text-center text-xs font-medium text-success">
          You save {formatMoney(pricing.savings)}
        </div>
      )}
    </div>
  );
}
