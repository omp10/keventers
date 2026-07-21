import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge, Button, Card, Icon, toast } from '@/design-system';
import { useAuth } from '@/platform/auth';
import { api } from '@/platform/api';
import { qk, useQueryResource } from '@/platform/query';
import { formatMoney } from '../format';
import { launchPayment } from '../payment';
import { paymentService } from '../services';
import type { Money } from '../types';

/**
 * SubscriptionOffer — the SOW's "before exiting, offer subscription plans"
 * step, shown on the order page once food is on its way. Plans come straight
 * from the dashboard CMS. Subscribing is paid ON THE SPOT: we create the
 * subscription, immediately open the payment sheet for the plan price, and the
 * backend ACTIVATES the plan when the payment captures. Nothing is left pending
 * for staff to settle. Guests see a sign-in nudge instead — a subscription needs
 * an account to belong to.
 */
type Plan = {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  periodDays: number;
  itemQuota: number;
  perks: string[];
};

type Mine = { id: string; planId: string; status: string };

const money = (minor: number, currency: string): Money => ({ amount: minor, currency, major: minor / 100 });

export function SubscriptionOffer() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  const plans = useQueryResource<Plan[]>(qk('ordering', 'sub-plans'), () => api.get('/customer/subscription-plans'), {
    enabled: isAuthenticated,
    retry: false,
  });
  const mine = useQueryResource<Mine[]>(qk('ordering', 'my-subs'), () => api.get('/customer/subscriptions'), {
    enabled: isAuthenticated,
    retry: false,
  });

  if (!isAuthenticated) return null; // the sign-in nudge already lives in the cart
  if (plans.isError || (plans.data ?? []).length === 0) return null;

  const owned = new Set((mine.data ?? []).filter((m) => m.status === 'active' || m.status === 'pending_payment').map((m) => m.planId));
  const offers = (plans.data ?? []).filter((p) => !owned.has(p.id));
  const pending = (mine.data ?? []).some((m) => m.status === 'pending_payment');
  if (offers.length === 0 && !pending) return null;

  /**
   * Create the subscription, then collect payment immediately. The plan only
   * becomes active once the gateway captures — the server does that, so we just
   * reflect the result. Abandoning the sheet leaves an unpaid subscription the
   * customer can retry, and never a silently-activated plan.
   */
  const subscribe = async (p: Plan) => {
    setBusy(p.id);
    try {
      const sub = await api.post<{ id: string }>('/customer/subscriptions', { planId: p.id });
      const intent = await paymentService.createSubscriptionIntent(sub.id);
      await launchPayment(
        intent,
        {
          onSuccess: async (payload) => {
            try {
              const res = await paymentService.confirm(intent.id, payload);
              if (res.status === 'captured' || res.status === 'authorized') {
                toast.success(`${p.name} is active!`, { description: 'Your membership starts now.' });
              } else {
                toast.info('Payment received', { description: 'Activating your plan…' });
              }
            } catch (err) {
              toast.error('Could not confirm the payment', { description: (err as Error).message });
            } finally {
              void mine.refetch();
              setBusy(null);
            }
          },
          onCancel: () => { toast.info('Payment cancelled', { description: 'Your plan is not active yet.' }); void mine.refetch(); setBusy(null); },
          onError: (m) => { toast.error('Payment failed', { description: m }); setBusy(null); },
          onUnavailable: () => { toast.error('Payment could not start on this device'); setBusy(null); },
        },
        { name: p.name, description: `${p.name} membership` },
      );
    } catch (e) {
      toast.error('Could not subscribe', { description: (e as Error).message });
      setBusy(null);
    }
  };

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Members save more</h2>
      {pending && (
        <p className="mb-2 flex items-center gap-1.5 rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
          <Icon name="info" className="h-4 w-4" /> You have a subscription awaiting payment — tap its plan to pay and activate it.
        </p>
      )}
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {offers.map((p) => (
          <Card key={p.id} padding="md" className="w-64 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground">{p.name}</h3>
              <Badge tone="primary" variant="soft">{formatMoney(money(p.price, p.currency))}</Badge>
            </div>
            <p className="mt-1 text-xs text-foreground-muted">
              {p.itemQuota ? `${p.itemQuota} items · ` : ''}every {p.periodDays} days
            </p>
            {p.description && <p className="mt-1.5 text-xs text-foreground-muted">{p.description}</p>}
            {p.perks.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-foreground-subtle">
                {p.perks.slice(0, 3).map((perk) => (
                  <li key={perk} className="flex items-center gap-1.5"><Icon name="check" className="h-3 w-3 text-success" />{perk}</li>
                ))}
              </ul>
            )}
            <Button size="sm" fullWidth className="mt-3" loading={busy === p.id} onClick={() => void subscribe(p)}>
              Subscribe
            </Button>
          </Card>
        ))}
        {offers.length === 0 && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/account')}>View my subscriptions</Button>
        )}
      </div>
    </section>
  );
}
