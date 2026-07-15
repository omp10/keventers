/**
 * DI tokens for the Customer Platform & Loyalty Engine. Symbols keep the
 * container registrations collision-free across modules.
 */
const t = (name) => Symbol(`customer.${name}`);

export const CUSTOMER_TOKENS = Object.freeze({
  // Repositories
  CustomerRepository: t('CustomerRepository'),
  CustomerAddressRepository: t('CustomerAddressRepository'),
  LoyaltyAccountRepository: t('LoyaltyAccountRepository'),
  LoyaltyLedgerRepository: t('LoyaltyLedgerRepository'),
  RewardRepository: t('RewardRepository'),
  RewardRedemptionRepository: t('RewardRedemptionRepository'),
  ReferralRepository: t('ReferralRepository'),

  // Services
  CustomerService: t('CustomerService'),
  LoyaltyService: t('LoyaltyService'),
  RewardService: t('RewardService'),
  ReferralService: t('ReferralService'),
  CustomerAnalyticsService: t('CustomerAnalyticsService'),

  // Extension points (future)
  WalletProvider: t('WalletProvider'),
  CampaignStrategy: t('CampaignStrategy'),
});

export default CUSTOMER_TOKENS;
