import { api, type Paginated } from '@/platform/api';
import type { LoyaltyAccount, LoyaltyLedgerEntry, LoyaltyReward, RedemptionPreview } from '../types';

/**
 * LOYALTY SERVICE — reads the customer's points/tier/rewards and previews/redeems.
 * The BACKEND owns all points math (earn/redeem/tier); the frontend only displays
 * and previews. Requires a linked customer account.
 */
/** `/customer/loyalty` answers with the account AND its points ledger. */
type LoyaltyWire = { account: LoyaltyAccount; ledger?: { items?: LoyaltyLedgerEntry[] } | LoyaltyLedgerEntry[] };

class LoyaltyService {
  /**
   * The points account. The endpoint returns `{ account, ledger }` — reading it
   * as a bare account (as the types used to claim) left every balance `undefined`
   * and the panel silently showed nothing.
   */
  async account(): Promise<LoyaltyAccount> {
    return (await api.get<LoyaltyWire>('/customer/loyalty')).account;
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
