import { useState, type FormEvent } from 'react';

import { Badge, Button, Icon, Input } from '@/design-system';
import type { AppliedCoupon } from '../types';
import { CouponCelebration } from './CouponCelebration';

/**
 * CouponInput — apply/remove a coupon. The DISCOUNT is computed by the Pricing
 * Engine and shown in the breakdown; this only submits the code.
 */
export function CouponInput({
  applied,
  onApply,
  onRemove,
  applying,
  error,
  savedLabel,
}: {
  applied?: AppliedCoupon | null;
  onApply: (code: string) => void | Promise<void>;
  onRemove: () => void;
  applying?: boolean;
  error?: string | null;
  /** Formatted savings, shown in the celebration once the backend re-prices. */
  savedLabel?: string | null;
}) {
  const [code, setCode] = useState('');
  // Bumped on each successful apply to replay the balloon-burst celebration.
  const [celebrate, setCelebrate] = useState<{ token: number; code: string } | null>(null);

  if (applied) {
    return (
      <>
        {celebrate && <CouponCelebration token={celebrate.token} code={celebrate.code} savedLabel={savedLabel} />}
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
      </>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = code.trim().toUpperCase();
    if (!v) return;
    try {
      await onApply(v);
      // Success (no throw) → celebrate. The parent flips `applied` on the next
      // render, so the celebration mounts alongside the applied badge.
      setCelebrate({ token: Date.now(), code: v });
    } catch {
      /* error surfaced via the `error` prop */
    }
  };

  return (
    <form onSubmit={submit} className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icon name="gift" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" className="pl-9 uppercase" />
        </div>
        <Button type="submit" variant="secondary" loading={applying} disabled={!code.trim()}>
          Apply
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
