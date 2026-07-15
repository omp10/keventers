import { BaseService } from '#core/service/base.service.js';
import { NotFoundError } from '#core/errors/app-error.js';
import { SecureToken } from '#core/security/secure-token.js';
import { userService, USER_TYPE } from '#modules/identity/index.js';

import { MEMBERSHIP_SCOPE, ORG_ERRORS } from '../constants/organization.constants.js';
import { toMembershipDTO } from '../dto/organization.dto.js';
import { membershipRepository } from '../repositories/membership.repository.js';
import { assertOrganizationAccess } from '../utils/tenant-context.js';
import { entityId } from '../utils/id.util.js';

import { restaurantService } from './restaurant.service.js';
import { tenantService } from './tenant.service.js';

/**
 * Restaurant staff management via memberships. Invites create/link an IAM user
 * and bind them to the tenant's organization/restaurant/branch with a role.
 */
export class StaffService extends BaseService {
  constructor({
    memberships = membershipRepository,
    users = userService,
    restaurants = restaurantService,
    tenants = tenantService,
    eventBus,
  } = {}) {
    super({ name: 'org.staff', eventBus });
    this.memberships = memberships;
    this.users = users;
    this.restaurants = restaurants;
    this.tenants = tenants;
  }

  async listStaff(tenant, restaurantId, query = {}) {
    const restaurant = await this.restaurants.resolveForTenant(tenant, restaurantId);
    const page = await this.memberships.paginate({
      filter: { organizationId: restaurant.organizationId, restaurantId: entityId(restaurant) },
      sort: query.sort,
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toMembershipDTO);
  }

  async inviteStaff(tenant, restaurantId, { email, role, branchId, firstName }, actorId = null) {
    const restaurant = await this.restaurants.resolveForTenant(tenant, restaurantId);
    const orgId = String(restaurant.organizationId);

    let user = await this.users.getUserByEmail(email);
    if (!user) {
      user = await this.users.createUser(
        {
          email,
          firstName: firstName || email.split('@')[0],
          type: USER_TYPE.STAFF,
          roles: [role],
          password: SecureToken.urlSafe(18),
        },
        actorId,
      );
      await this.users.requestPasswordReset(email).catch(() => {});
    } else {
      await this.users.assignRoles(user.id, [role], actorId);
    }

    const membership = await this.memberships.create({
      userId: user.id,
      organizationId: orgId,
      restaurantId: entityId(restaurant),
      branchId: branchId ?? null,
      scope: branchId ? MEMBERSHIP_SCOPE.BRANCH : MEMBERSHIP_SCOPE.RESTAURANT,
      role,
    });
    await this.tenants.invalidate(user.id);

    this.audit.success('restaurant.staff.invited', {
      actorId,
      targetId: entityId(membership),
      metadata: { email, role },
    });
    return toMembershipDTO(membership);
  }

  async removeStaff(tenant, membershipId, actorId = null) {
    const membership = await this.memberships.findById(membershipId);
    if (!membership) throw new NotFoundError(ORG_ERRORS.NO_TENANT);
    assertOrganizationAccess(tenant, String(membership.organizationId));
    await this.memberships.softDeleteById(membershipId);
    await this.tenants.invalidate(String(membership.userId));
    this.audit.success('restaurant.staff.removed', { actorId, targetId: membershipId });
    return { id: membershipId, removed: true };
  }
}

export const staffService = new StaffService();
export default staffService;
