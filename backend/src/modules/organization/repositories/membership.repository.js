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
}

export const membershipRepository = new MembershipRepository();
export default membershipRepository;
