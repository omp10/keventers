import { qk, useInfiniteResource, useMutationResource, useQueryResource } from '@/platform/query';
import { loyaltyService } from '../services';
import type { LoyaltyAccount, LoyaltyLedgerEntry, LoyaltyReward, RedemptionPreview } from '../types';

/**
 * useLoyalty — reads points/tier/rewards and redeems. The BACKEND owns all points
 * math; the frontend only displays and previews. Queries don't retry (a guest with
 * no linked account simply has no loyalty).
 */
export function useLoyalty() {
  const account = useQueryResource<LoyaltyAccount>(qk('loyalty', 'account'), () => loyaltyService.account(), { retry: false });
  const rewards = useQueryResource<LoyaltyReward[]>(qk('loyalty', 'rewards'), () => loyaltyService.rewards(), { retry: false });
  const redeem = useMutationResource<{ voucherCode?: string }, string>((rewardId) => loyaltyService.redeem(rewardId), {
    invalidate: [qk('loyalty', 'account'), qk('loyalty', 'rewards'), qk('loyalty', 'ledger')],
  });

  return {
    account: account.data,
    rewards: rewards.data ?? [],
    isLoading: account.isLoading,
    isLinked: !account.isError,
    redeem: (rewardId: string) => redeem.mutateAsync(rewardId),
    redeeming: redeem.isPending,
  };
}

/** Backend-computed redemption preview for a reward. */
export function useRedemptionPreview(rewardId: string | undefined) {
  return useQueryResource<RedemptionPreview>(
    qk('loyalty', 'preview', rewardId ?? null),
    () => loyaltyService.redeemPreview(rewardId!),
    { enabled: Boolean(rewardId) },
  );
}

/** Points history. */
export function useLoyaltyLedger() {
  return useInfiniteResource<LoyaltyLedgerEntry>(qk('loyalty', 'ledger'), (page) => loyaltyService.ledger(page));
}
