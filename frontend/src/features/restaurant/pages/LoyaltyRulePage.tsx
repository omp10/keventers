import { useEffect, useState } from 'react';

import { Button, Card, Icon, Spinner, Switch, toast } from '@/design-system';
import { cn } from '@/lib/cn';
import { qk, useQueryResource } from '@/platform/query';
import { useScopedApi } from '../RestaurantScope';

type LoyaltyRule = {
  enabled: boolean;
  mode: 'per_amount' | 'per_order';
  pointsPerCurrencyUnit: number;
  pointsPerOrder: number;
};

const DEFAULTS: LoyaltyRule = { enabled: true, mode: 'per_amount', pointsPerCurrencyUnit: 1, pointsPerOrder: 10 };

/**
 * LoyaltyRulePage — the admin/manager control for how a restaurant awards loyalty
 * points. Two mutually-exclusive earning modes:
 *   • per_amount — N points for every ₹1 the customer spends
 *   • per_order  — a flat N points per paid order, whatever it's worth
 *
 * Reads/writes restaurant.settings.loyalty via the SCOPED API, so it drives the
 * signed-in manager's restaurant on the dashboard and any chosen restaurant under
 * the admin picker. The Pricing/Loyalty engine reads the same rule on payment.
 */
export function LoyaltyRulePage() {
  const scoped = useScopedApi();
  const q = useQueryResource(
    qk('mgmt', 'loyalty-rule', scoped.restaurantId ?? 'self'),
    () => scoped.get<{ loyalty?: Partial<LoyaltyRule> }>('/restaurant/settings'),
  );

  const [rule, setRule] = useState<LoyaltyRule>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.data) setRule({ ...DEFAULTS, ...(q.data.loyalty ?? {}) });
  }, [q.data]);

  const save = async () => {
    setSaving(true);
    try {
      await scoped.patch('/restaurant/settings', {
        loyalty: {
          enabled: rule.enabled,
          mode: rule.mode,
          pointsPerCurrencyUnit: Number(rule.pointsPerCurrencyUnit) || 0,
          pointsPerOrder: Math.trunc(Number(rule.pointsPerOrder) || 0),
        },
      });
      toast.success('Loyalty rule saved');
    } catch (e) {
      toast.error('Could not save the rule', { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (q.isLoading) return <div className="grid min-h-40 place-items-center"><Spinner /></div>;

  // Live example so the operator sees exactly what a customer earns.
  const exampleSpend = 500; // ₹500 order
  const earned = !rule.enabled ? 0 : rule.mode === 'per_order' ? Math.trunc(rule.pointsPerOrder || 0) : Math.floor(exampleSpend * (rule.pointsPerCurrencyUnit || 0));

  return (
    <div className="max-w-xl space-y-5">
      <Card padding="md" className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-foreground">Loyalty points</p>
          <p className="text-sm text-foreground-muted">Reward customers for ordering. Turn off to pause earning.</p>
        </div>
        <Switch checked={rule.enabled} onCheckedChange={(v) => setRule((r) => ({ ...r, enabled: v }))} />
      </Card>

      <div className={cn('space-y-4 transition', !rule.enabled && 'pointer-events-none opacity-50')}>
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">How points are earned</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ModeCard
              active={rule.mode === 'per_amount'}
              onClick={() => setRule((r) => ({ ...r, mode: 'per_amount' }))}
              icon="payment"
              title="By order amount"
              hint="Points scale with how much they spend"
            />
            <ModeCard
              active={rule.mode === 'per_order'}
              onClick={() => setRule((r) => ({ ...r, mode: 'per_order' }))}
              icon="bag"
              title="By number of orders"
              hint="A flat amount per order, any value"
            />
          </div>
        </div>

        {rule.mode === 'per_amount' ? (
          <label className="block text-sm font-medium text-foreground">
            Points per ₹1 spent
            <input
              type="number" min={0} step="0.1"
              value={rule.pointsPerCurrencyUnit}
              onChange={(e) => setRule((r) => ({ ...r, pointsPerCurrencyUnit: Number(e.target.value) }))}
              className="mt-1 block h-10 w-40 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
        ) : (
          <label className="block text-sm font-medium text-foreground">
            Points per order
            <input
              type="number" min={0} step="1"
              value={rule.pointsPerOrder}
              onChange={(e) => setRule((r) => ({ ...r, pointsPerOrder: Number(e.target.value) }))}
              className="mt-1 block h-10 w-40 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
        )}

        <Card padding="md" className="flex items-center gap-3 bg-primary-soft/40">
          <Icon name="gift" className="h-5 w-5 text-primary" />
          <p className="text-sm text-foreground">
            A ₹{exampleSpend} order earns <span className="font-bold text-primary">{earned} points</span>.
          </p>
        </Card>
      </div>

      <Button onClick={() => void save()} loading={saving}>Save loyalty rule</Button>
    </div>
  );
}

function ModeCard({ active, onClick, icon, title, hint }: { active: boolean; onClick: () => void; icon: 'payment' | 'bag'; title: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1 rounded-xl border p-3 text-left transition',
        active ? 'border-primary bg-primary-soft/40 ring-2 ring-primary/25' : 'border-border bg-surface hover:border-border-strong',
      )}
    >
      <span className={cn('grid h-9 w-9 place-items-center rounded-lg', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-primary')}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <span className="text-xs text-foreground-muted">{hint}</span>
    </button>
  );
}
