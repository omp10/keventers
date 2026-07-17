import { useState } from 'react';

import { Badge, Button, Icon, Spinner, EmptyState, toast } from '@/design-system';
import { cn } from '@/lib/cn';
import { useLoyalty, useRedemptionPreview } from '../hooks';

/**
 * LoyaltyPanel — points, tier, and reward redemption. The BACKEND owns all points
 * math; the frontend only displays balances/tiers and shows the backend-computed
 * redemption preview before confirming. Guests without a linked account see a
 * prompt instead.
 */
export function LoyaltyPanel() {
  const { account, rewards, isLoading, isLinked, redeem, redeeming } = useLoyalty();
  const [selected, setSelected] = useState<string | undefined>();
  const preview = useRedemptionPreview(selected);

  if (isLoading) {
    return (
      <div className="grid h-32 place-items-center">
        <Spinner />
      </div>
    );
  }

  if (!isLinked || !account) {
    return (
      <EmptyState
        icon={<Icon name="gift" className="mb-3 h-8 w-8 text-muted-foreground" />}
        title="Earn rewards on every order"
        description="Sign in to collect points, unlock tiers, and redeem rewards."
        size="sm"
      />
    );
  }

  const doRedeem = async () => {
    if (!selected) return;
    try {
      await redeem(selected);
      toast.success('Reward redeemed');
      setSelected(undefined);
    } catch (e) {
      toast.error('Could not redeem', { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-5">
      {/* Points + tier */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-accent p-5 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-85">Available points</p>
            <p className="text-3xl font-bold">{account.balance.toLocaleString()}</p>
          </div>
          <Badge tone="neutral" variant="solid" className="bg-white/20">
            <Icon name="star" className="mr-1 h-3 w-3" /> <span className="capitalize">{account.tier}</span>
          </Badge>
        </div>
        {account.nextTier && (
          <p className="mt-3 text-xs opacity-85">
            {account.nextTier.pointsNeeded.toLocaleString()} points to {account.nextTier.name}
          </p>
        )}
      </div>

      {/* Rewards */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Available rewards</h2>
        {rewards.length === 0 ? (
          <p className="text-sm text-foreground-muted">No rewards available right now.</p>
        ) : (
          <div className="space-y-2">
            {rewards.map((r) => {
              const affordable = account.balance >= r.pointsCost;
              const isSel = selected === r.id;
              return (
                <div key={r.id} className={cn('rounded-xl border p-3', isSel ? 'border-primary ring-2 ring-primary/25' : 'border-border')}>
                  <div className="flex items-center gap-3">
                    <Icon name="gift" className="h-5 w-5 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{r.name}</p>
                      {r.description && <p className="truncate text-xs text-foreground-muted">{r.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{r.pointsCost.toLocaleString()} pts</p>
                      <Button size="sm" variant={isSel ? 'primary' : 'secondary'} disabled={!affordable} onClick={() => setSelected(isSel ? undefined : r.id)}>
                        {isSel ? 'Selected' : affordable ? 'Redeem' : 'Not enough'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Redemption preview + confirm */}
      {selected && (
        <div className="rounded-xl border border-border bg-surface p-4">
          {preview.isLoading ? (
            <div className="flex justify-center py-2"><Spinner /></div>
          ) : preview.data ? (
            <>
              <p className="text-sm text-foreground">
                Redeeming <span className="font-medium">{preview.data.reward.name}</span>.
                {' '}You’ll have <span className="font-semibold">{preview.data.pointsAfter.toLocaleString()}</span> points left.
              </p>
              {!preview.data.canRedeem && preview.data.reason && <p className="mt-1 text-xs text-danger">{preview.data.reason}</p>}
              <div className="mt-3 flex gap-2">
                <Button size="sm" loading={redeeming} disabled={!preview.data.canRedeem} onClick={doRedeem}>
                  Confirm redemption
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(undefined)}>Cancel</Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-foreground-muted">Preview unavailable.</p>
          )}
        </div>
      )}
    </div>
  );
}
