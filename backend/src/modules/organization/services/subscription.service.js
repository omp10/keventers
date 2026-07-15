import { BaseService } from '#core/service/base.service.js';
import { NotFoundError } from '#core/errors/app-error.js';

import {
  ORG_ERRORS,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS,
} from '../constants/organization.constants.js';
import { toSubscriptionDTO } from '../dto/organization.dto.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { assertOrganizationAccess } from '../utils/tenant-context.js';
import { entityId } from '../utils/id.util.js';

const TRIAL_DAYS = 14;

/**
 * Subscription lifecycle (embedded on the Organization). No payment-gateway
 * integration in this phase — pure state management.
 */
export class SubscriptionService extends BaseService {
  constructor({ organizations = organizationRepository, eventBus } = {}) {
    super({ name: 'org.subscription', eventBus });
    this.organizations = organizations;
  }

  /** Build a fresh trial subscription sub-document (used at provisioning). */
  // eslint-disable-next-line class-methods-use-this
  buildTrialSubscription(now = new Date()) {
    return {
      plan: SUBSCRIPTION_PLAN.TRIAL,
      status: SUBSCRIPTION_STATUS.TRIAL,
      trialStartedAt: now,
      trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
      maxRestaurants: 1,
      maxBranches: 3,
    };
  }

  async #getOrgOrThrow(id) {
    const org = await this.organizations.findById(id);
    if (!org) throw new NotFoundError(ORG_ERRORS.ORGANIZATION_NOT_FOUND);
    return org;
  }

  async getSubscription(id, tenant) {
    const org = await this.#getOrgOrThrow(id);
    assertOrganizationAccess(tenant, entityId(org));
    return toSubscriptionDTO(org);
  }

  /**
   * Apply a subscription lifecycle transition.
   * @param {string} id
   * @param {{ action?: string, plan?: string }} change
   */
  async transition(id, change, actorId = null) {
    const org = await this.#getOrgOrThrow(id);
    const subscription = { ...(org.subscription ?? {}) };

    switch (change.action) {
      case 'start_trial':
        Object.assign(subscription, this.buildTrialSubscription());
        break;
      case 'activate':
        subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
        subscription.currentPeriodStart = new Date();
        break;
      case 'suspend':
        subscription.status = SUBSCRIPTION_STATUS.SUSPENDED;
        break;
      case 'expire':
        subscription.status = SUBSCRIPTION_STATUS.EXPIRED;
        break;
      case 'cancel':
        subscription.status = SUBSCRIPTION_STATUS.CANCELLED;
        subscription.cancelledAt = new Date();
        break;
      default:
        break;
    }
    if (change.plan) subscription.plan = change.plan;

    const updated = await this.organizations.updateById(id, { subscription });
    this.audit.success('organization.subscription.updated', {
      actorId,
      targetId: id,
      metadata: { action: change.action, plan: change.plan },
    });
    return toSubscriptionDTO(updated);
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
