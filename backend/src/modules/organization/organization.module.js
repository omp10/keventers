import { container as sharedContainer } from '#core/di/container.js';
import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';

import { ORG_PERMISSIONS } from './constants/organization.constants.js';
import { ORG_TOKENS } from './constants/organization.tokens.js';
import { registerOrganizationEventHandlers } from './events/handlers.js';
import { bannerRepository } from './repositories/banner.repository.js';
import { branchRepository } from './repositories/branch.repository.js';
import { categoryRepository } from './repositories/category.repository.js';
import { zoneRepository } from './repositories/zone.repository.js';
import { membershipRepository } from './repositories/membership.repository.js';
import { onboardingApplicationRepository } from './repositories/onboarding-application.repository.js';
import { organizationRepository } from './repositories/organization.repository.js';
import { restaurantRepository } from './repositories/restaurant.repository.js';
import organizationRouter from './routes/index.js';
import { adminKitchenService } from './services/admin-kitchen.service.js';
import { bannerService } from './services/banner.service.js';
import { branchService } from './services/branch.service.js';
import { categoryService } from './services/category.service.js';
import { mediaService } from './services/media.service.js';
import { publicDiscoveryService } from './services/public-discovery.service.js';
import { zoneService } from './services/zone.service.js';
import { onboardingService } from './services/onboarding.service.js';
import { organizationService } from './services/organization.service.js';
import { provisioningService } from './services/provisioning.service.js';
import { restaurantOnboardingService } from './services/restaurant-onboarding.service.js';
import { restaurantService } from './services/restaurant.service.js';
import { staffService } from './services/staff.service.js';
import { subscriptionService } from './services/subscription.service.js';
import { tenantService } from './services/tenant.service.js';

/**
 * Organization / Restaurant / Onboarding module composition. Mounted at the API
 * v1 root (basePath '/') so its sub-routers own /public, /admin/onboarding,
 * /admin/organizations and /restaurant. Registered AFTER identity so the more
 * specific /identity mount is matched first.
 */
export const organizationModule = {
  name: 'organization',
  basePath: '/',
  router: organizationRouter,

  registerDependencies(container = sharedContainer) {
    container.register(ORG_TOKENS.OnboardingApplicationRepository, onboardingApplicationRepository);
    container.register(ORG_TOKENS.OrganizationRepository, organizationRepository);
    container.register(ORG_TOKENS.RestaurantRepository, restaurantRepository);
    container.register(ORG_TOKENS.BranchRepository, branchRepository);
    container.register(ORG_TOKENS.MembershipRepository, membershipRepository);
    container.register(ORG_TOKENS.BannerRepository, bannerRepository);
    container.register(ORG_TOKENS.CategoryRepository, categoryRepository);
    container.register(ORG_TOKENS.ZoneRepository, zoneRepository);

    container.register(ORG_TOKENS.OnboardingService, onboardingService);
    container.register(ORG_TOKENS.OrganizationService, organizationService);
    container.register(ORG_TOKENS.RestaurantService, restaurantService);
    container.register(ORG_TOKENS.RestaurantOnboardingService, restaurantOnboardingService);
    container.register(ORG_TOKENS.BranchService, branchService);
    container.register(ORG_TOKENS.SubscriptionService, subscriptionService);
    container.register(ORG_TOKENS.ProvisioningService, provisioningService);
    container.register(ORG_TOKENS.TenantService, tenantService);
    container.register(ORG_TOKENS.StaffService, staffService);
    container.register(ORG_TOKENS.BannerService, bannerService);
    container.register(ORG_TOKENS.PublicDiscoveryService, publicDiscoveryService);
    container.register(ORG_TOKENS.CategoryService, categoryService);
    container.register(ORG_TOKENS.ZoneService, zoneService);
    container.register(ORG_TOKENS.AdminKitchenService, adminKitchenService);
    container.register(ORG_TOKENS.MediaService, mediaService);
  },

  bootstrapRbac() {
    permissionRegistry.registerMany(Object.values(ORG_PERMISSIONS));
  },

  registerEventHandlers(eventBus = sharedEventBus) {
    registerOrganizationEventHandlers(eventBus);
  },

  register({ container = sharedContainer, eventBus = sharedEventBus } = {}) {
    this.registerDependencies(container);
    this.bootstrapRbac();
    this.registerEventHandlers(eventBus);
    logger().info({ module: this.name }, 'Organization module registered');
    return this;
  },
};

export default organizationModule;
