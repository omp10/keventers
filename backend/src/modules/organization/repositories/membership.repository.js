import { BaseRepository } from '#core/repository/base.repository.js';

import { MEMBERSHIP_STATUS } from '../constants/organization.constants.js';
import { Membership } from '../models/membership.model.js';

export class MembershipRepository extends BaseRepository {
  constructor(model = Membership) {
    super(model, { softDelete: true });
  }

  /** All active memberships for a user (drives tenant resolution). */
  findActiveByUser(userId, options = {}) {
    return this.find({ userId, status: MEMBERSHIP_STATUS.ACTIVE }, options);
  }

  findByUserAndOrg(userId, organizationId, options = {}) {
    return this.findOne({ userId, organizationId }, options);
  }

  findByOrganization(organizationId, options = {}) {
    return this.find({ organizationId }, options);
  }

  /**
   * Everyone whose membership REACHES a given branch — not just those pinned to
   * it. A membership narrows scope by what it sets: branch-scoped rows name the
   * branch, restaurant-scoped rows cover every branch of that restaurant, and
   * org-scoped rows (owners/org admins) cover the whole organization. Matching
   * only on `branchId` would report an outlet as unstaffed while its owner and
   * brand managers plainly run it.
   *
   * `branchId` is OPTIONAL: callers resolve scope from the tenant context, which
   * only pins a branch when one was asked for. Without it the question widens to
   * "everyone who reaches this RESTAURANT" — every branch's staff included.
   * Treating a missing branch as `branchId: null` instead would silently match
   * only the org admins and report a fully staffed restaurant as empty.
   */
  findReachingBranch({ organizationId, restaurantId, branchId }, options = {}) {
    const reaches = branchId
      ? [{ branchId }, { restaurantId, branchId: null }, { restaurantId: null, branchId: null }]
      : [{ restaurantId }, { restaurantId: null, branchId: null }];
    return this.find({ organizationId, $or: reaches }, options);
  }
}

export const membershipRepository = new MembershipRepository();
export default membershipRepository;
