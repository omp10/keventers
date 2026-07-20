import { useState } from 'react';

import { Button, Icon, Spinner, Textarea, toast } from '@/design-system';
import { JOURNEY, useJourney } from '@/platform/analytics';
import { qk, queryClient, useQueryResource } from '@/platform/query';
import { cn } from '@/lib/cn';
import { feedbackService, type ItemRating } from '../services/feedback.service';
import type { Order } from '../types';

/** A 1–5 star picker. Tapping the current value clears it. */
export function StarRating({
  value,
  onChange,
  size = 'md',
  label,
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
  size?: 'sm' | 'md';
  label?: string;
}) {
  const readOnly = !onChange;
  const px = size === 'sm' ? 'h-4 w-4' : 'h-7 w-7';
  return (
    <div className="flex items-center gap-0.5" role={readOnly ? 'img' : 'radiogroup'} aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          onClick={() => onChange?.(value === n ? null : n)}
          className={cn('touch-manipulation p-0.5 transition', !readOnly && 'active:scale-90')}
        >
          <Icon
            name="star"
            className={cn(px, (value ?? 0) >= n ? 'text-warning' : 'text-foreground-subtle/40')}
          />
        </button>
      ))}
    </div>
  );
}

/**
 * RateOrderSheet — rate the DISHES and the RESTAURANT separately for one order.
 *
 * Both scores feed the backend's feedback record, which is the single source of
 * truth: it recomputes each dish's rating and the outlet's rating from these
 * submissions. Re-opening shows what was already submitted (reviews are
 * editable — one per order).
 */
export function RateOrderSheet({ order, onClose }: { order: Order; onClose: () => void }) {
  const journey = useJourney();
  const existing = useQueryResource(qk('ordering', 'feedback', order.id), () => feedbackService.forOrder(order.id), { retry: false });

  const [storeRating, setStoreRating] = useState<number | null>(null);
  const [items, setItems] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Seed once from any existing review so editing starts where they left off.
  if (!seeded && existing.data) {
    setStoreRating(existing.data.storeRating ?? null);
    setItems(Object.fromEntries((existing.data.itemRatings ?? []).map((i) => [i.productId, i.rating])));
    setComment(existing.data.comment ?? '');
    setSeeded(true);
  }

  // One row per distinct product in the order (an order can repeat a product).
  const products = Array.from(new Map(order.items.map((i) => [i.productId, i])).values());

  const submit = async () => {
    const itemRatings: ItemRating[] = Object.entries(items)
      .filter(([, r]) => r > 0)
      .map(([productId, rating]) => ({ productId, rating }));
    if (!storeRating && itemRatings.length === 0 && !comment.trim()) {
      toast.error('Add a rating first');
      return;
    }
    setBusy(true);
    try {
      await feedbackService.submit({
        orderId: order.id,
        storeRating,
        serviceRating: storeRating,
        // Overall food score = the average of the dishes actually rated.
        foodRating: itemRatings.length
          ? Math.round(itemRatings.reduce((s, i) => s + i.rating, 0) / itemRatings.length)
          : null,
        comment: comment.trim() || undefined,
        itemRatings,
      });
      journey(JOURNEY.FEEDBACK_SUBMITTED, { orderId: order.id });
      void queryClient.invalidateQueries({ queryKey: qk('ordering', 'feedback', order.id) });
      toast.success('Thanks for the feedback!');
      onClose();
    } catch (e) {
      toast.error('Could not save your review', { description: (e as Error).message });
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-4 rounded-xl border border-border bg-surface p-3">
      {existing.isLoading ? (
        <div className="grid place-items-center py-4"><Spinner size="sm" /></div>
      ) : (
        <>
          <section>
            <h4 className="text-sm font-semibold text-foreground">Rate the restaurant</h4>
            <p className="mb-1.5 text-xs text-foreground-muted">{order.branch.name} — service, ambience, overall.</p>
            <StarRating value={storeRating} onChange={setStoreRating} label="Restaurant rating" />
          </section>

          <section>
            <h4 className="text-sm font-semibold text-foreground">Rate the dishes</h4>
            <p className="mb-1.5 text-xs text-foreground-muted">Each dish is scored separately.</p>
            <div className="space-y-2">
              {products.map((it) => (
                <div key={it.productId} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{it.name}</span>
                  <StarRating
                    value={items[it.productId] ?? null}
                    onChange={(v) => setItems((m) => ({ ...m, [it.productId]: v ?? 0 }))}
                    size="sm"
                    label={`${it.name} rating`}
                  />
                </div>
              ))}
            </div>
          </section>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Anything else you'd like to tell them? (optional)"
          />

          <div className="flex gap-2">
            <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
            <Button fullWidth loading={busy} onClick={() => void submit()}>
              {existing.data ? 'Update review' : 'Submit review'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
