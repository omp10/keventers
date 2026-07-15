import { container as sharedContainer } from '#core/di/container.js';
import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';

import { CUSTOMER_PERMISSIONS } from './constants/customer.constants.js';
import { CUSTOMER_TOKENS } from './constants/customer.tokens.js';
import { registerCustomerEventHandlers } from './events/handlers.js';
import { customerRepository } from './repositories/customer.repository.js';
import { customerAddressRepository } from './repositories/customer-address.repository.js';
import { loyaltyAccountRepository } from './repositories/loyalty-account.repository.js';
import { loyaltyLedgerRepository } from './repositories/loyalty-ledger.repository.js';
import { referralRepository } from './repositories/referral.repository.js';
import { rewardRepository } from './repositories/reward.repository.js';
import { rewardRedemptionRepository } from './repositories/reward-redemption.repository.js';
import customerRouter from './routes/index.js';
import { customerAnalyticsService } from './services/customer-analytics.service.js';
import { customerService } from './services/customer.service.js';
import { loyaltyService } from './services/loyalty.service.js';
import { referralService } from './services/referral.service.js';
import { rewardService } from './services/reward.service.js';

/**
 * Customer Platform & Loyalty composition. Manages the customer lifecycle
 * (guest→customer merge, profile, preferences, addresses), the IMMUTABLE loyalty
 * ledger + tiers, the reward catalog/redemptions, and event-driven analytics
 * projections. It CONSUMES Order/Payment/QR events (never calls those services to
 * drive them) and publishes its own provider-independent customer/loyalty events.
 * Registered BEFORE the organization module so its specific `/customer`,
 * `/restaurant/*`, `/admin/*` paths win.
 */
export const customerModule = {
  name: 'customer',
  basePath: '/',
  router: customerRouter,

  registerDependencies(container = sharedContainer) {
    container.register(CUSTOMER_TOKENS.CustomerRepository, customerRepository);
    container.register(CUSTOMER_TOKENS.CustomerAddressRepository, customerAddressRepository);
    container.register(CUSTOMER_TOKENS.LoyaltyAccountRepository, loyaltyAccountRepository);
    container.register(CUSTOMER_TOKENS.LoyaltyLedgerRepository, loyaltyLedgerRepository);
    container.register(CUSTOMER_TOKENS.RewardRepository, rewardRepository);
    container.register(CUSTOMER_TOKENS.RewardRedemptionRepository, rewardRedemptionRepository);
    container.register(CUSTOMER_TOKENS.ReferralRepository, referralRepository);

    container.register(CUSTOMER_TOKENS.CustomerService, customerService);
    container.register(CUSTOMER_TOKENS.LoyaltyService, loyaltyService);
    container.register(CUSTOMER_TOKENS.RewardService, rewardService);
    container.register(CUSTOMER_TOKENS.ReferralService, referralService);
    container.register(CUSTOMER_TOKENS.CustomerAnalyticsService, customerAnalyticsService);

    // Break the customer↔analytics import cycle by wiring at composition time.
    customerService.useAnalytics(customerAnalyticsService);
  },

  bootstrapRbac() {
    permissionRegistry.registerMany(Object.values(CUSTOMER_PERMISSIONS));
  },

  registerEventHandlers(eventBus = sharedEventBus) {
    registerCustomerEventHandlers(eventBus);
  },

  register({ container = sharedContainer, eventBus = sharedEventBus } = {}) {
    this.registerDependencies(container);
    this.bootstrapRbac();
    this.registerEventHandlers(eventBus);
    logger().info({ module: this.name }, 'Customer Platform & Loyalty module registered');
    return this;
  },
};

export default customerModule;
