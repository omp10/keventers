import { useState, type FormEvent } from 'react';

import { Badge, Button, Icon, Input } from '@/design-system';
import type { AppliedCoupon } from '../types';

/**
 * CouponInput — apply/remove a coupon by code. The DISCOUNT is computed by the
 * Pricing Engine and shown in the breakdown; this only submits the code. The
 * apply celebration lives in CartView so it also fires for the "see all coupons"
 * sheet, not just this field.
 */
export function CouponInput({
  applied,
  onApply,
  onRemove,
  onBrowse,
  applying,
  error,
}: {
  applied?: AppliedCoupon | null;
  onApply: (code: string) => void | Promise<void>;
  onRemove: () => void;
  /** Open the "see all coupons" sheet. Hidden when omitted. */
  onBrowse?: () => void;
  applying?: boolean;
  error?: string | null;
}) {
  const [code, setCode] = useState('');

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success-soft px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm font-medium text-success">
          <Icon name="gift" className="h-4 w-4" />
          <Badge tone="success" variant="soft">{applied.code}</Badge>
          {applied.label ?? 'Coupon applied'}
        </span>
        <button type="button" onClick={onRemove} className="text-xs font-medium text-success hover:underline">
          Remove
        </button>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = code.trim().toUpperCase();
    if (v) void onApply(v);
  };

  return (
    <div className="space-y-1.5">
      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icon name="gift" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" className="pl-9 uppercase" />
        </div>
        <Button type="submit" variant="secondary" loading={applying} disabled={!code.trim()}>
          Apply
        </Button>
      </form>
      {error && <p className="text-xs text-danger">{error}</p>}
      {onBrowse && (
        <button type="button" onClick={onBrowse} className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <Icon name="gift" className="h-4 w-4" /> See all coupons
        </button>
      )}
    </div>
  );
}
