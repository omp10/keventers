/**
 * Organization module — PUBLIC BARREL. Other modules import ONLY from here.
 * The tenancy model (Membership + tenant context) established here is the
 * foundation every future business module inherits.
 */
export { organizationModule } from './organization.module.js';

// Service singletons
export { onboardingService } from './services/onboarding.service.js';
export { organizationService } from './services/organization.service.js';
export { restaurantService } from './services/restaurant.service.js';
export { restaurantOnboardingService } from './services/restaurant-onboarding.service.js';
export { branchService } from './services/branch.service.js';
export { subscriptionService } from './services/subscription.service.js';
export { staffService } from './services/staff.service.js';
export { tenantService } from './services/tenant.service.js';

// Tenancy utilities (reused by future modules for tenant-aware access control).
export {
  buildTenantContext,
  assertOrganizationAccess,
  assertRestaurantAccess,
  requirePrimaryOrganization,
} from './utils/tenant-context.js';
export { resolveTenant, requireTenant } from './middleware/tenant.middleware.js';

// DI tokens, events, constants
export { ORG_TOKENS } from './constants/organization.tokens.js';
export * from './events/organization.events.js';
export {
  APPLICATION_STATUS,
  ORGANIZATION_STATUS,
  RESTAURANT_STATUS,
  BRANCH_STATUS,
  SUBSCRIPTION_STATUS,
  ORG_ROLES,
  ORG_PERMISSIONS,
} from './constants/organization.constants.js';

// Seeder
export { organizationSeeder, OrganizationSeeder } from './seeds/organization.seeder.js';
