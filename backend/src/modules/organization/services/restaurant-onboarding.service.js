import { BaseService } from '#core/service/base.service.js';
import { ValidationError } from '#core/errors/app-error.js';

import {
  ONBOARDING_STEPS,
  ORGANIZATION_STATUS,
  RESTAURANT_STATUS,
} from '../constants/organization.constants.js';
import { toRestaurantDTO } from '../dto/organization.dto.js';
import {
  OnboardingCompletedEvent,
  OnboardingStartedEvent,
  OrganizationActivatedEvent,
  RestaurantActivatedEvent,
} from '../events/organization.events.js';
import { branchRepository } from '../repositories/branch.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { restaurantRepository } from '../repositories/restaurant.repository.js';
import { deepMerge } from '../utils/merge.util.js';
import { entityId } from '../utils/id.util.js';

import { restaurantService } from './restaurant.service.js';

/**
 * First-login onboarding wizard. Drives a restaurant from ONBOARDING to ACTIVE
 * once all steps are completed. Steps update the restaurant settings and its
 * primary branch (business hours, table count) via repositories only.
 */
export class RestaurantOnboardingService extends BaseService {
  constructor({
    restaurants = restaurantRepository,
    branches = branchRepository,
    organizations = organizationRepository,
    restaurantResolver = restaurantService,
    eventBus,
  } = {}) {
    super({ name: 'org.restaurant_onboarding', eventBus });
    this.restaurants = restaurants;
    this.branches = branches;
    this.organizations = organizations;
    this.resolver = restaurantResolver;
  }

  #wizardState(restaurant) {
    const onboarding = restaurant.onboarding ?? {};
    const completedSteps = onboarding.completedSteps ?? [];
    return {
      restaurantId: entityId(restaurant),
      status: restaurant.status,
      steps: ONBOARDING_STEPS,
      completedSteps,
      pendingSteps: ONBOARDING_STEPS.filter((s) => !completedSteps.includes(s)),
      started: Boolean(onboarding.started),
      completed: Boolean(onboarding.completed),
    };
  }

  async getWizard(tenant, restaurantId) {
    const restaurant = await this.resolver.resolveForTenant(tenant, restaurantId);
    return this.#wizardState(restaurant);
  }

  async start(tenant, restaurantId, actorId = null) {
    const restaurant = await this.resolver.resolveForTenant(tenant, restaurantId);
    if (!restaurant.onboarding?.started) {
      await this.restaurants.updateById(entityId(restaurant), {
        'onboarding.started': true,
        'onboarding.startedAt': new Date(),
      });
      await this.events.publish(new OnboardingStartedEvent({ restaurantId: entityId(restaurant) }));
      this.audit.success('restaurant.onboarding.started', { actorId, targetId: entityId(restaurant) });
    }
    const fresh = await this.restaurants.findById(entityId(restaurant));
    return this.#wizardState(fresh);
  }

  /** Apply one wizard step, updating restaurant settings and/or the primary branch. */
  async submitStep(tenant, restaurantId, step, data = {}, actorId = null) {
    const restaurant = await this.resolver.resolveForTenant(tenant, restaurantId);
    const rid = entityId(restaurant);
    const settingsPatch = {};

    switch (step) {
      case 'logo':
        settingsPatch.branding = { logoUrl: data.logoUrl ?? null, logoKey: data.logoKey ?? null };
        break;
      case 'currency':
        settingsPatch.currency = data.currency;
        break;
      case 'taxes':
        settingsPatch.tax = data.tax ?? data;
        break;
      case 'timezone':
        settingsPatch.timezone = data.timezone;
        break;
      case 'qr_settings':
        settingsPatch.qr = data.qr ?? data;
        break;
      case 'payment_gateway':
        settingsPatch.payment = { gateway: data.gateway ?? null, codEnabled: data.codEnabled ?? true };
        break;
      case 'notification_settings':
        settingsPatch.notifications = data.notifications ?? data;
        break;
      case 'business_hours':
        await this.#updatePrimaryBranch(rid, { businessHours: data.businessHours ?? [] });
        break;
      case 'table_count':
        await this.#updatePrimaryBranch(rid, { 'settings.tableCount': data.tableCount ?? 0 });
        break;
      case 'staff_invitation':
        // Invitations are recorded; actual member creation is handled by the
        // staff/invite flow (identity) — kept out of the wizard's critical path.
        break;
      default:
        throw new ValidationError(`Unknown onboarding step: ${step}`);
    }

    const merged = deepMerge(restaurant.settings ?? {}, settingsPatch);
    const completedSteps = [...new Set([...(restaurant.onboarding?.completedSteps ?? []), step])];
    const patch = { settings: merged, 'onboarding.completedSteps': completedSteps };
    if (!restaurant.onboarding?.started) {
      patch['onboarding.started'] = true;
      patch['onboarding.startedAt'] = new Date();
    }
    await this.restaurants.updateById(rid, patch);

    this.audit.success('restaurant.onboarding.step_submitted', {
      actorId,
      targetId: rid,
      metadata: { step },
    });
    const fresh = await this.restaurants.findById(rid);
    return this.#wizardState(fresh);
  }

  async #updatePrimaryBranch(restaurantId, patch) {
    const branch = await this.branches.findOne({ restaurantId, isPrimary: true });
    const target = branch ?? (await this.branches.findOne({ restaurantId }));
    if (target) await this.branches.updateById(entityId(target), patch);
  }

  /** Finalize onboarding → restaurant + organization become ACTIVE. */
  async complete(tenant, restaurantId, actorId = null, { force = false } = {}) {
    const restaurant = await this.resolver.resolveForTenant(tenant, restaurantId);
    const rid = entityId(restaurant);
    const completedSteps = restaurant.onboarding?.completedSteps ?? [];
    const missing = ONBOARDING_STEPS.filter((s) => !completedSteps.includes(s));

    if (!force && missing.length > 0) {
      throw new ValidationError(
        'Onboarding is incomplete',
        missing.map((step) => ({ path: step, message: 'step not completed' })),
      );
    }

    const updated = await this.restaurants.updateById(rid, {
      status: RESTAURANT_STATUS.ACTIVE,
      'onboarding.completed': true,
      'onboarding.completedAt': new Date(),
    });
    // Activate the owning organization too.
    await this.organizations.updateById(String(restaurant.organizationId), {
      status: ORGANIZATION_STATUS.ACTIVE,
    });

    await this.events.publishMany([
      new OnboardingCompletedEvent({ restaurantId: rid, organizationId: String(restaurant.organizationId) }),
      new RestaurantActivatedEvent({ restaurantId: rid }),
      new OrganizationActivatedEvent({ organizationId: String(restaurant.organizationId) }),
    ]);
    this.audit.success('restaurant.onboarding.completed', { actorId, targetId: rid });
    return toRestaurantDTO(updated);
  }
}

export const restaurantOnboardingService = new RestaurantOnboardingService();
export default restaurantOnboardingService;
