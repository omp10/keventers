import { useState } from 'react';

import { Badge, Button, Card, EmptyState, Icon, Input, Spinner, Textarea, toast } from '@/design-system';
import { qk, queryClient, useQueryResource } from '@/platform/query';
import { useRestaurantScope, useScopedApi } from '../RestaurantScope';

type Sapi = ReturnType<typeof useScopedApi>;

/**
 * Customer Subscriptions (/dashboard/subscriptions) — the admin-managed
 * subscription CMS the client asked for: create/edit/archive plans ("5
 * Milkshakes Monthly", "Office Subscription"…) and manage subscribers
 * (activate on counter payment, cancel). Everything is data — no deploy to
 * launch a new plan.
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
  status: 'active' | 'archived';
  subscribers: number;
};

type Subscriber = {
  id: string;
  planName: string;
  status: string;
  pricePaid: number;
  startedAt?: string;
  expiresAt?: string;
  customer?: { name?: string; phone?: string; email?: string };
  createdAt: string;
};

const rupees = (minor: number) => `₹${(minor / 100).toLocaleString('en-IN')}`;

const invalidate = () => {
  void queryClient.invalidateQueries({ queryKey: qk('restaurant', 'sub-plans') });
  void queryClient.invalidateQueries({ queryKey: qk('restaurant', 'subscribers') });
};

function PlanForm({ plan, onDone, sapi }: { plan: Plan | null; onDone: () => void; sapi: Sapi }) {
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [priceMajor, setPriceMajor] = useState(plan ? String(plan.price / 100) : '');
  const [periodDays, setPeriodDays] = useState(String(plan?.periodDays ?? 30));
  const [itemQuota, setItemQuota] = useState(String(plan?.itemQuota ?? 0));
  const [perks, setPerks] = useState((plan?.perks ?? []).join('\n'));
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: Math.round(Number(priceMajor || 0) * 100),
      periodDays: Number(periodDays) || 30,
      itemQuota: Number(itemQuota) || 0,
      perks: perks.split('\n').map((p) => p.trim()).filter(Boolean),
    };
    try {
      if (plan) await sapi.patch(`/restaurant/subscriptions/plans/${plan.id}`, body);
      else await sapi.post('/restaurant/subscriptions/plans', body);
      toast.success(plan ? 'Plan updated' : 'Plan created');
      invalidate();
      onDone();
    } catch (err) {
      toast.error('Could not save the plan', { description: (err as Error).message });
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Plan name (e.g. 5 Milkshakes Monthly)" autoFocus />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description customers see" rows={2} maxLength={500} />
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs font-medium text-foreground-muted">
          Price (₹)
          <Input type="number" min={0} value={priceMajor} onChange={(e) => setPriceMajor(e.target.value)} className="mt-1" />
        </label>
        <label className="text-xs font-medium text-foreground-muted">
          Period (days)
          <Input type="number" min={1} max={365} value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} className="mt-1" />
        </label>
        <label className="text-xs font-medium text-foreground-muted">
          Items included
          <Input type="number" min={0} value={itemQuota} onChange={(e) => setItemQuota(e.target.value)} className="mt-1" />
        </label>
      </div>
      <label className="block text-xs font-medium text-foreground-muted">
        Perks — one per line
        <Textarea value={perks} onChange={(e) => setPerks(e.target.value)} rows={3} placeholder={'Priority ordering\nBirthday rewards'} className="mt-1" />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={busy}>{plan ? 'Save changes' : 'Create plan'}</Button>
      </div>
    </form>
  );
}

export function SubscriptionsPage() {
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const sapi = useScopedApi();
  const scope = useRestaurantScope();

  const plans = useQueryResource<Plan[]>(qk('restaurant', 'sub-plans', scope ?? null), () => sapi.get('/restaurant/subscriptions/plans'));
  const subs = useQueryResource<Subscriber[]>(qk('restaurant', 'subscribers', scope ?? null), () => sapi.get('/restaurant/subscriptions', { query: { limit: 50 } }), {
    refetchInterval: 30_000,
  });

  const act = async (id: string, action: 'activate' | 'cancel') => {
    try {
      await sapi.patch(`/restaurant/subscriptions/${id}/${action}`);
      toast.success(action === 'activate' ? 'Subscription activated' : 'Subscription cancelled');
      invalidate();
    } catch (e) {
      toast.error('Action failed', { description: (e as Error).message });
    }
  };

  const archive = async (p: Plan) => {
    try {
      await sapi.patch(`/restaurant/subscriptions/plans/${p.id}`, { status: p.status === 'archived' ? 'active' : 'archived' });
      invalidate();
    } catch (e) {
      toast.error('Action failed', { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Subscriptions</h1>
          <p className="text-sm text-foreground-muted">Create the plans customers see after ordering; activate them when they pay at the counter.</p>
        </div>
        <Button leftIcon="add" onClick={() => { setCreating(true); setEditing(null); }}>New plan</Button>
      </div>

      {(creating || editing) && (
        <Card padding="md">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{editing ? `Edit — ${editing.name}` : 'New plan'}</h2>
          <PlanForm plan={editing} sapi={sapi} onDone={() => { setCreating(false); setEditing(null); }} />
        </Card>
      )}

      {plans.isLoading ? (
        <div className="grid min-h-32 place-items-center"><Spinner /></div>
      ) : (plans.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Icon name="gift" className="h-8 w-8" />}
          title="No plans yet"
          description="Create your first subscription plan — customers see it right after they order."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(plans.data ?? []).map((p) => (
            <Card key={p.id} padding="md" className={p.status === 'archived' ? 'opacity-60' : ''}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground">{p.name}</h3>
                  <p className="text-xs text-foreground-muted">{rupees(p.price)} / {p.periodDays} days{p.itemQuota ? ` · ${p.itemQuota} items` : ''}</p>
                </div>
                <Badge tone={p.status === 'active' ? 'success' : 'neutral'} variant="soft">{p.status}</Badge>
              </div>
              {p.description && <p className="mt-2 text-sm text-foreground-muted">{p.description}</p>}
              {p.perks.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-foreground-subtle">
                  {p.perks.map((perk) => <li key={perk} className="flex items-center gap-1.5"><Icon name="check" className="h-3 w-3 text-success" />{perk}</li>)}
                </ul>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                <span className="text-xs text-foreground-subtle">{p.subscribers} subscriber{p.subscribers === 1 ? '' : 's'}</span>
                <span className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setCreating(false); }}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => void archive(p)}>{p.status === 'archived' ? 'Restore' : 'Archive'}</Button>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Subscribers</h2>
        {subs.isLoading ? (
          <Spinner size="sm" />
        ) : (subs.data ?? []).length === 0 ? (
          <p className="text-sm text-foreground-muted">No one has subscribed yet.</p>
        ) : (
          <div className="space-y-2">
            {(subs.data ?? []).map((s) => (
              <Card key={s.id} padding="sm" className="flex flex-wrap items-center gap-3">
                <Badge
                  tone={s.status === 'active' ? 'success' : s.status === 'pending_payment' ? 'warning' : 'neutral'}
                  variant="soft"
                >
                  {s.status.replace('_', ' ')}
                </Badge>
                <span className="text-sm font-medium text-foreground">{s.customer?.name || s.customer?.phone || 'Customer'}</span>
                <span className="text-xs text-foreground-subtle">{s.planName} · {rupees(s.pricePaid)}</span>
                <span className="ml-auto flex items-center gap-2 text-xs text-foreground-subtle">
                  {s.expiresAt ? `Expires ${new Date(s.expiresAt).toLocaleDateString()}` : new Date(s.createdAt).toLocaleDateString()}
                  {s.status === 'pending_payment' && <Button size="sm" onClick={() => void act(s.id, 'activate')}>Mark paid</Button>}
                  {(s.status === 'pending_payment' || s.status === 'active') && (
                    <Button size="sm" variant="ghost" onClick={() => void act(s.id, 'cancel')}>Cancel</Button>
                  )}
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
