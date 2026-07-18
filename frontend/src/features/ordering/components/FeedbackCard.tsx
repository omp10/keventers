import { useState } from 'react';

import { Button, Card, Icon, Textarea, toast } from '@/design-system';
import { JOURNEY, useJourney } from '@/platform/analytics';
import { api } from '@/platform/api';
import { qk, useQueryResource } from '@/platform/query';
import { cn } from '@/lib/cn';
import type { Order } from '../types';

/**
 * FeedbackCard — the SOW's post-delivery capture, dual by design: rate the
 * FOOD and the RESTAURANT (service + store) separately, plus the 0–10 NPS
 * question and a comment. Appears once the order is served; one submission
 * per order (resubmitting updates it).
 */
function Stars({ value, onChange, label }: { value: number | null; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-foreground">{label}</span>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${label} ${n} star`} onClick={() => onChange(n)} className="p-0.5">
            <Icon name="star" className={cn('h-6 w-6', value && n <= value ? 'text-warning' : 'text-border')} />
          </button>
        ))}
      </span>
    </div>
  );
}

export function FeedbackCard({ order }: { order: Order }) {
  const journey = useJourney();
  const existing = useQueryResource<{ id: string } | null>(
    qk('ordering', 'feedback', order.id),
    () => api.get(`/customer/feedback/${order.id}`),
    { retry: false },
  );

  const [food, setFood] = useState<number | null>(null);
  const [service, setService] = useState<number | null>(null);
  const [store, setStore] = useState<number | null>(null);
  const [nps, setNps] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!['served', 'completed'].includes(order.status)) return null;
  if (existing.data || done) {
    return (
      <Card padding="md" className="text-center">
        <Icon name="check" className="mx-auto h-6 w-6 text-success" />
        <p className="mt-1 text-sm font-medium text-foreground">Thanks for your feedback!</p>
      </Card>
    );
  }

  const submit = async () => {
    if (food == null && service == null && store == null && nps == null && !comment.trim()) {
      return toast.error('Tap a rating first');
    }
    setBusy(true);
    try {
      await api.post('/customer/feedback', {
        orderId: order.id,
        npsScore: nps,
        foodRating: food,
        serviceRating: service,
        storeRating: store,
        comment: comment.trim() || undefined,
      });
      journey(JOURNEY.FEEDBACK_SUBMITTED, { orderId: order.id, value: nps ?? undefined });
      setDone(true);
    } catch (e) {
      toast.error('Could not submit feedback', { description: (e as Error).message });
      setBusy(false);
    }
  };

  return (
    <Card padding="md">
      <h2 className="text-sm font-semibold text-foreground">How was everything?</h2>
      <div className="mt-3 space-y-2.5">
        <Stars label="Food" value={food} onChange={setFood} />
        <Stars label="Service" value={service} onChange={setService} />
        <Stars label="Store" value={store} onChange={setStore} />
      </div>

      <p className="mt-4 text-sm text-foreground">How likely are you to recommend us?</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNps(n)}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-lg border text-xs font-semibold transition',
              nps === n ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-foreground-muted',
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Anything else you'd like us to know?"
        rows={2}
        maxLength={1000}
        className="mt-3"
      />
      <Button fullWidth className="mt-3" loading={busy} onClick={() => void submit()}>
        Submit feedback
      </Button>
    </Card>
  );
}
