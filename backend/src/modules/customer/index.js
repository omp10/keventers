/**
 * Customer Platform & Loyalty — PUBLIC BARREL. Future modules (Notifications,
 * Analytics, CRM/Campaigns) CONSUME customer/loyalty EVENTS from here rather than
 * calling the services. Extension-point contracts (Wallet, Campaign) are exported
 * so future capabilities plug in without changing the core.
 */
export { customerModule } from './customer.module.js';

// Service singletons.
export { customerService } from './services/customer.service.js';
export { loyaltyService, computeEarnPoints } from './services/loyalty.service.js';
export { rewardService } from './services/reward.service.js';
export { referralService } from './services/referral.service.js';
export { customerAnalyticsService } from './services/customer-analytics.service.js';

// Extension-point contracts (register future providers here — no service change).
export {
  WalletProvider,
  noopWalletProvider,
  CampaignStrategy,
  noopCampaignStrategy,
} from './interfaces/extension-points.interface.js';

// DI tokens + events + constants.
export { CUSTOMER_TOKENS } from './constants/customer.tokens.js';
export * from './events/customer.events.js';
export {
  ACCOUNT_STATUS,
  CUSTOMER_ORIGIN,
  LOYALTY_TIER,
  LOYALTY_TXN_TYPE,
  REWARD_TYPE,
  CUSTOMER_PERMISSIONS,
} from './constants/customer.constants.js';

// Seeder.
export { customerSeeder, CustomerSeeder } from './seeds/customer.seeder.js';
