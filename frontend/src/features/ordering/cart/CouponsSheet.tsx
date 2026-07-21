import { Badge, Button, Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, Icon, Spinner } from '@/design-system';
import { qk, useQueryResource } from '@/platform/query';
import { formatMoney } from '../format';
import { cartService } from '../services';
import type { PublicCoupon } from '../types';

/** Human label for a coupon's benefit. */
function benefit(c: PublicCoupon): string {
  if (c.type === 'percentage') return `${Math.round((c.value ?? 0) / 100)}% OFF${c.maxDiscount ? ` up to ${formatMoney({ amount: c.maxDiscount, currency: 'INR', major: c.maxDiscount / 100 })}` : ''}`;
  if (c.type === 'fixed') return `${formatMoney({ amount: c.value ?? 0, currency: 'INR', major: (c.value ?? 0) / 100 })} OFF`;
  if (c.type === 'free_item') return 'FREE item';
  return 'Special offer';
}

/**
 * CouponsSheet — the Zomato-style "see all coupons" sheet: every public coupon
 * for this restaurant, tap APPLY to use one. Applying runs the same cart path as
 * typing the code, so the balloon celebration and eligibility checks still apply.
 */
export function CouponsSheet({ open, onClose, onApply, appliedCode, applying }: {
  open: boolean;
  onClose: () => void;
  onApply: (code: string) => void | Promise<void>;
  appliedCode?: string | null;
  applying?: boolean;
}) {
  const q = useQueryResource(qk('ordering', 'coupons'), () => cartService.availableCoupons(), { enabled: open });
  const coupons = q.data ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Available coupons</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {q.isLoading ? (
            <div className="grid place-items-center py-8"><Spinner /></div>
          ) : coupons.length === 0 ? (
            <p className="py-8 text-center text-sm text-foreground-muted">No coupons available right now.</p>
          ) : (
            coupons.map((c) => {
              const isApplied = appliedCode?.toUpperCase() === c.code.toUpperCase();
              return (
                <div key={c.id} className="rounded-xl border border-dashed border-primary/40 bg-primary-soft/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon name="gift" className="h-4 w-4 shrink-0 text-primary" />
                        <span className="font-bold text-primary">{benefit(c)}</span>
                        {c.audience === 'new_customers' && <Badge tone="info" variant="soft" className="text-[0.625rem]">New users</Badge>}
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wide text-foreground">
                        {c.code}
                      </div>
                      {c.description && <p className="mt-1 text-xs text-foreground-muted">{c.description}</p>}
                      {c.minSubtotal ? (
                        <p className="mt-0.5 text-[0.6875rem] text-foreground-subtle">
                          Min order {formatMoney({ amount: c.minSubtotal, currency: 'INR', major: c.minSubtotal / 100 })}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant={isApplied ? 'ghost' : 'secondary'}
                      disabled={isApplied || applying}
                      onClick={() => void onApply(c.code)}
                    >
                      {isApplied ? 'Applied' : 'Apply'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
