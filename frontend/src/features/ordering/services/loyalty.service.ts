import { api, type Paginated } from '@/platform/api';
import type { LoyaltyAccount, LoyaltyLedgerEntry, LoyaltyReward, RedemptionPreview } from '../types';

/**
 * LOYALTY SERVICE — reads the customer's points/tier/rewards and previews/redeems.
 * The BACKEND owns all points math (earn/redeem/tier); the frontend only displays
 * and previews. Requires a linked customer account.
 */
class LoyaltyService {
  account() {
    return api.get<LoyaltyAccount>('/customer/loyalty');
  }

  rewards() {
    return api.get<LoyaltyReward[]>('/customer/rewards');
  }

  /** Backend-computed redemption preview (points after, eligibility). */
  redeemPreview(rewardId: string) {
    return api.get<RedemptionPreview>(`/customer/rewards/${rewardId}/preview`);
  }

  redeem(rewardId: string) {
    return api.post<{ voucherCode?: string }>('/customer/redeem', { rewardId });
  }

  ledger(page = 1, limit = 20) {
    return api.paginate<LoyaltyLedgerEntry>('/customer/loyalty/ledger', { query: { page, limit } });
  }
}

export const loyaltyService = new LoyaltyService();
export type { Paginated };
