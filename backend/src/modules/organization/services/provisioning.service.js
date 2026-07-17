import { BaseService } from '#core/service/base.service.js';
import { SecureToken } from '#core/security/secure-token.js';
import { userService, USER_TYPE } from '#modules/identity/index.js';

import {
  BRANCH_STATUS,
  ORGANIZATION_STATUS,
  ORG_ROLES,
  RESTAURANT_STATUS,
} from '../constants/organization.constants.js';
import { branchRepository } from '../repositories/branch.repository.js';
import { membershipRepository } from '../repositories/membership.repository.js';
import { onboardingApplicationRepository } from '../repositories/onboarding-application.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { restaurantRepository } from '../repositories/restaurant.repository.js';
import { APPLICATION_STATUS } from '../constants/organization.constants.js';
import { entityId } from '../utils/id.util.js';
import { uniqueSlug } from '../utils/slug.util.js';

import { subscriptionService } from './subscription.service.js';

function splitOwnerName(fullName) {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts.shift() || 'Owner', lastName: parts.join(' ') };
}

/**
 * Provisions the tenant graph when an application is approved: owner IAM user,
 * organization, restaurant, first branch, membership, and roles.
 *
 * Uses sequential creation with COMPENSATION (soft-delete created records on
 * failure) rather than a DB transaction — because the owner user is created
 * through the identity service (which can't join this module's session), and to
 * stay consistent with the codebase's compensation pattern. Approval is a
 * low-frequency admin action, so this trade-off is acceptable.
 */
export class ProvisioningService extends BaseService {
  constructor({
    users = userService,
    organizations = organizationRepository,
    restaurants = restaurantRepository,
    branches = branchRepository,
    memberships = membershipRepository,
    applications = onboardingApplicationRepository,
    subscriptions = subscriptionService,
    eventBus,
  } = {}) {
    super({ name: 'org.provisioning', eventBus });
    this.users = users;
    this.organizations = organizations;
    this.restaurants = restaurants;
    this.branches = branches;
    this.memberships = memberships;
    this.applications = applications;
    this.subscriptions = subscriptions;
  }

  /**
   * @param {object} application  The approved application (domain object).
   * @param {{ organizationName?: string, restaurantName?: string }} overrides
   * @param {string|null} actorId
   * @returns {Promise<{ owner, organization, restaurant, branch, membership, createdUser: boolean }>}
   */
  async provisionFromApplication(application, overrides = {}, actorId = null) {
    const created = { owner: null, org: null, restaurant: null, branch: null, membership: null, createdUser: false };

    try {
      // 1. Owner IAM user — create or link, then ensure roles.
      const roles = [ORG_ROLES.ORGANIZATION_ADMIN, ORG_ROLES.RESTAURANT_MANAGER];
      let owner = await this.users.getUserByEmail(application.email);
      if (!owner && application.phone && typeof this.users.getUserByPhone === 'function') {
        owner = await this.users.getUserByPhone(application.phone);
      }
      if (!owner) {
        const { firstName, lastName } = splitOwnerName(application.ownerName);
        owner = await this.users.createUser(
          {
            email: application.email,
            firstName,
            lastName,
            phone: application.phone,
            type: USER_TYPE.STAFF,
            roles,
            password: SecureToken.urlSafe(18),
          },
          actorId,
        );
        created.createdUser = true;
      } else {
        owner = await this.users.assignRoles(owner.id, roles, actorId);
      }
      created.owner = owner;
      const ownerId = owner.id;

      // 2. Organization
      const orgName = overrides.organizationName || application.brandName || application.restaurantName;
      const orgSlug = await uniqueSlug(orgName, (s) => this.organizations.existsBySlug(s));
      const org = await this.organizations.create({
        name: orgName,
        slug: orgSlug,
        brandName: application.brandName || '',
        ownerUserId: ownerId,
        applicationId: entityId(application),
        status: ORGANIZATION_STATUS.ONBOARDING,
        contact: { email: application.email, phone: application.phone },
        subscription: this.subscriptions.buildTrialSubscription(),
      });
      created.org = org;
      const orgId = entityId(org);

      // 3. Restaurant
      const restName = overrides.restaurantName || application.restaurantName;
      const restSlug = await uniqueSlug(restName, (s) => this.restaurants.existsBySlugInOrg(orgId, s));
      const restaurant = await this.restaurants.create({
        organizationId: orgId,
        name: restName,
        slug: restSlug,
        type: application.restaurantType,
        cuisines: application.cuisines ?? [],
        address: application.address ?? {},
        status: RESTAURANT_STATUS.ONBOARDING,
        managerUserId: ownerId,
        settings: {
          branding: { logoUrl: application.logo?.url ?? null, logoKey: application.logo?.key ?? null },
        },
      });
      created.restaurant = restaurant;
      const restaurantId = entityId(restaurant);

      // 4. Primary branch
      const branch = await this.branches.create({
        organizationId: orgId,
        restaurantId,
        name: `${restName} - Main`,
        address: application.address ?? {},
        isPrimary: true,
        status: BRANCH_STATUS.ACTIVE,
        managerUserId: ownerId,
      });
      created.branch = branch;
      const branchId = entityId(branch);

      // 5. Membership (tenancy binding)
      const membership = await this.memberships.create({
        userId: ownerId,
        organizationId: orgId,
        restaurantId,
        branchId,
        scope: 'organization',
        role: ORG_ROLES.ORGANIZATION_ADMIN,
        isOwner: true,
      });
      created.membership = membership;

      // 6. Mark application approved + linked.
      await this.applications.updateById(entityId(application), {
        status: APPLICATION_STATUS.APPROVED,
        organizationId: orgId,
        reviewedBy: actorId,
        reviewedAt: new Date(),
      });

      return { ...created, organization: org };
    } catch (err) {
      await this.#compensate(created);
      throw err;
    }
  }

  async #compensate(created) {
    const safe = (p) => p.catch(() => {});
    if (created.membership) await safe(this.memberships.softDeleteById(entityId(created.membership)));
    if (created.branch) await safe(this.branches.softDeleteById(entityId(created.branch)));
    if (created.restaurant) await safe(this.restaurants.softDeleteById(entityId(created.restaurant)));
    if (created.org) await safe(this.organizations.softDeleteById(entityId(created.org)));
    if (created.createdUser && created.owner) await safe(this.users.deleteUser(created.owner.id));
  }
}

export const provisioningService = new ProvisioningService();
export default provisioningService;
