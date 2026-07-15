/**
 * Customer Platform EXTENSION POINTS. These contracts are declared now so future
 * capabilities plug in WITHOUT changing the core architecture. None is
 * implemented in this phase — the default no-ops keep the platform inert until a
 * real provider/strategy is registered via the DI container.
 */

/**
 * Wallet provider (FUTURE): stored value, cashback, gift cards, promotional
 * credit. The Customer Platform records cashback INTENT (as loyalty/redemption
 * outcomes); actual money movement is the wallet's concern. Kept an interface so
 * a real wallet (or a payment-linked stored-value account) drops in later.
 */
export class WalletProvider {
  /** @returns {Promise<{balance:number, currency:string}>} */
  async getBalance(_customerId) {
    throw new Error('WalletProvider.getBalance not implemented');
  }
  /** Credit promotional/cashback/gift value (minor units). */
  async credit(_customerId, _amount, _meta = {}) {
    throw new Error('WalletProvider.credit not implemented');
  }
  async debit(_customerId, _amount, _meta = {}) {
    throw new Error('WalletProvider.debit not implemented');
  }
}

/** Inert default — signals "no wallet configured". */
export const noopWalletProvider = {
  configured: false,
  async getBalance() {
    return { balance: 0, currency: 'INR' };
  },
  async credit() {
    return { ok: false, reason: 'wallet_not_configured' };
  },
  async debit() {
    return { ok: false, reason: 'wallet_not_configured' };
  },
};

/**
 * CRM campaign strategy (FUTURE): segmentation, personalized offers, birthday
 * rewards, abandoned-cart recovery, win-back. A campaign engine subscribes to
 * customer/loyalty/tier events and calls back into the loyalty service's public
 * `grantBonus` seam — so campaigns compose without touching customer internals.
 */
export class CampaignStrategy {
  /** Decide which customers a campaign applies to. */
  async selectAudience(_scope, _criteria) {
    throw new Error('CampaignStrategy.selectAudience not implemented');
  }
  /** React to a domain event (e.g. TierChanged → grant a perk). */
  async onEvent(_event) {
    throw new Error('CampaignStrategy.onEvent not implemented');
  }
}

export const noopCampaignStrategy = {
  configured: false,
  async selectAudience() {
    return [];
  },
  async onEvent() {
    return { handled: false };
  },
};

export default { WalletProvider, noopWalletProvider, CampaignStrategy, noopCampaignStrategy };
