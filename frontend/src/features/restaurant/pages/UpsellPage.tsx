import { useState } from 'react';

import { Badge, Button, Card, EmptyState, Icon, Input, Spinner, toast } from '@/design-system';
import { qk, queryClient, useQueryResource } from '@/platform/query';
import { useRestaurantScope, useScopedApi } from '../RestaurantScope';

/**
 * Upsell rules (/dashboard/upsell) — the SOW's configurable upselling CMS.
 * Two halves:
 *   · what the ENGINE LEARNED (top frequently-bought-together pairs from real
 *     orders) — so rules are authored with evidence, not guesses;
 *   · the RULES the business adds on top (trigger → suggestion, weight, daily
 *     time window) that blend into every recommendation.
 */
type Sapi = ReturnType<typeof useScopedApi>;
type ProductLite = { id: string; name: string };
type Rule = {
  id: string;
  triggers: ProductLite[];
  suggest: ProductLite | null;
  weight: number;
  startHour: number | null;
  endHour: number | null;
  label: string | null;
  isActive: boolean;
};
type Pair = { a: string; b: string; togetherCount: number; basis: number };

const invalidate = () => void queryClient.invalidateQueries({ queryKey: qk('restaurant', 'upsell') });

function RuleForm({ products, onDone, sapi }: { products: ProductLite[]; onDone: () => void; sapi: Sapi }) {
  const [triggerIds, setTriggerIds] = useState<string[]>([]);
  const [suggestId, setSuggestId] = useState('');
  const [weight, setWeight] = useState('60');
  const [label, setLabel] = useState('');
  const [startHour, setStartHour] = useState('');
  const [endHour, setEndHour] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestId || busy) return;
    setBusy(true);
    try {
      await sapi.post('/restaurant/upsell/rules', {
        triggerProductIds: triggerIds,
        suggestProductId: suggestId,
        weight: Number(weight) || 60,
        label: label.trim() || null,
        startHour: startHour === '' ? null : Number(startHour),
        endHour: endHour === '' ? null : Number(endHour),
      });
      toast.success('Rule created');
      invalidate();
      onDone();
    } catch (err) {
      toast.error('Could not create the rule', { description: (err as Error).message });
      setBusy(false);
    }
  };

  const selectClass = 'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary';

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-xs font-medium text-foreground-muted">
        When the customer has… <span className="font-normal">(none selected = any order)</span>
        <select
          multiple
          value={triggerIds}
          onChange={(e) => setTriggerIds([...e.target.selectedOptions].map((o) => o.value))}
          className={`${selectClass} mt-1 h-28`}
        >
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="block text-xs font-medium text-foreground-muted">
        …suggest
        <select value={suggestId} onChange={(e) => setSuggestId(e.target.value)} className={`${selectClass} mt-1`}>
          <option value="">Choose a product</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-4 gap-2">
        <label className="text-xs font-medium text-foreground-muted">
          Strength (1–100)
          <Input type="number" min={1} max={100} value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1" />
        </label>
        <label className="text-xs font-medium text-foreground-muted">
          From hour
          <Input type="number" min={0} max={23} value={startHour} onChange={(e) => setStartHour(e.target.value)} placeholder="—" className="mt-1" />
        </label>
        <label className="text-xs font-medium text-foreground-muted">
          To hour
          <Input type="number" min={0} max={23} value={endHour} onChange={(e) => setEndHour(e.target.value)} placeholder="—" className="mt-1" />
        </label>
        <label className="text-xs font-medium text-foreground-muted">
          Label
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Seasonal special" maxLength={60} className="mt-1" />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={busy} disabled={!suggestId}>Create rule</Button>
      </div>
    </form>
  );
}

export function UpsellPage() {
  const [creating, setCreating] = useState(false);
  const sapi = useScopedApi();
  const scope = useRestaurantScope();

  const rules = useQueryResource<Rule[]>(qk('restaurant', 'upsell', 'rules', scope ?? null), () => sapi.get('/restaurant/upsell/rules'));
  const learned = useQueryResource<Pair[]>(qk('restaurant', 'upsell', 'learned', scope ?? null), () => sapi.get('/restaurant/upsell/learned'));
  const products = useQueryResource<ProductLite[]>(qk('restaurant', 'upsell', 'products', scope ?? null), async () => {
    const page = await sapi.paginate<{ id: string; name: string }>('/restaurant/products', { query: { page: 1, limit: 100 } });
    return page.items.map((p) => ({ id: p.id, name: p.name }));
  });

  const toggle = async (r: Rule) => {
    try {
      await sapi.patch(`/restaurant/upsell/rules/${r.id}`, { isActive: !r.isActive });
      invalidate();
    } catch (e) {
      toast.error('Action failed', { description: (e as Error).message });
    }
  };
  const remove = async (r: Rule) => {
    try {
      await sapi.delete(`/restaurant/upsell/rules/${r.id}`);
      invalidate();
    } catch (e) {
      toast.error('Action failed', { description: (e as Error).message });
    }
  };

  const hourLabel = (r: Rule) => (r.startHour == null || r.endHour == null ? 'All day' : `${r.startHour}:00–${r.endHour}:00`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Upsell rules</h1>
          <p className="text-sm text-foreground-muted">The engine learns pairings from your real orders; your rules steer it. Both blend into every suggestion.</p>
        </div>
        <Button leftIcon="add" onClick={() => setCreating(true)}>New rule</Button>
      </div>

      {creating && (
        <Card padding="md">
          <h2 className="mb-3 text-sm font-semibold text-foreground">New rule</h2>
          {products.isLoading ? <Spinner size="sm" /> : <RuleForm products={products.data ?? []} sapi={sapi} onDone={() => setCreating(false)} />}
        </Card>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Your rules</h2>
        {rules.isLoading ? (
          <Spinner size="sm" />
        ) : (rules.data ?? []).length === 0 ? (
          <p className="text-sm text-foreground-muted">No rules yet — the engine runs purely on learned pairings until you add some.</p>
        ) : (
          <div className="space-y-2">
            {(rules.data ?? []).map((r) => (
              <Card key={r.id} padding="sm" className="flex flex-wrap items-center gap-3">
                <Badge tone={r.isActive ? 'success' : 'neutral'} variant="soft">{r.isActive ? 'Active' : 'Paused'}</Badge>
                <span className="text-sm text-foreground">
                  {r.triggers.length ? r.triggers.map((t) => t.name).join(', ') : 'Any order'}
                  <Icon name="arrowRight" className="mx-1.5 inline h-3.5 w-3.5 text-foreground-subtle" />
                  <strong>{r.suggest?.name ?? '—'}</strong>
                </span>
                <span className="text-xs text-foreground-subtle">{hourLabel(r)} · strength {r.weight}{r.label ? ` · "${r.label}"` : ''}</span>
                <span className="ml-auto flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => void toggle(r)}>{r.isActive ? 'Pause' : 'Resume'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => void remove(r)}>Delete</Button>
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">What the engine learned</h2>
        {learned.isLoading ? (
          <Spinner size="sm" />
        ) : (learned.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Icon name="trend" className="h-8 w-8" />}
            title="Not enough orders yet"
            description="As orders come in, the strongest 'bought together' pairs appear here."
          />
        ) : (
          <Card padding="sm">
            <table className="w-full text-sm">
              <tbody>
                {(learned.data ?? []).map((p, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 text-foreground">{p.a} <span className="text-foreground-subtle">+</span> {p.b}</td>
                    <td className="py-2 text-right text-xs text-foreground-subtle">together in {p.togetherCount} of {p.basis} orders</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
