import { logger as baseLogger } from '#core/logging/logger.js';
import { BaseSeeder } from '#database/seeds/base.seeder.js';
import { USER_STATUS, USER_TYPE } from '#modules/identity/constants/identity.constants.js';
import { userRepository } from '#modules/identity/repositories/user.repository.js';
import { passwordService } from '#platform/auth/index.js';

import { MEMBERSHIP_SCOPE, MEMBERSHIP_STATUS, ORG_ROLES } from '../constants/organization.constants.js';
import { membershipRepository } from '../repositories/membership.repository.js';
import { branchRepository } from '../repositories/branch.repository.js';
import { restaurantRepository } from '../repositories/restaurant.repository.js';

/**
 * Demo FLOOR STAFF for the Keventers Connaught Place branch, so the /staff
 * phone app is testable end-to-end: sign in with the phone below (OTP), get
 * assigned an order from the KDS, advance it, see it in history.
 */
const STAFF = [
  { firstName: 'Ravi', lastName: 'Runner', phone: '+919800000201', email: 'staff+ravi@keventers.demo' },
  { firstName: 'Priya', lastName: 'Server', phone: '+919800000202', email: 'staff+priya@keventers.demo' },
];

export class KeventersStaffSeeder extends BaseSeeder {
  constructor({
    users = userRepository,
    memberships = membershipRepository,
    branches = branchRepository,
    restaurants = restaurantRepository,
    passwords = passwordService,
    logger,
  } = {}) {
    super();
    this.name = '018-keventers-staff';
    this.users = users;
    this.memberships = memberships;
    this.branches = branches;
    this.restaurants = restaurants;
    this.passwords = passwords;
    this.logger = logger ?? baseLogger({ module: 'organization', component: 'keventers-staff-seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = { users: { created: 0, skipped: 0 }, memberships: { created: 0, skipped: 0 } };

    const restaurant = await this.restaurants.findOne({ slug: 'keventers' });
    const branch = await this.branches.findOne({ slug: 'keventers-connaught-place' });
    if (!restaurant || !branch) {
      this.logger.warn('Keventers restaurant/branch not found — skipping staff seed');
      return summary;
    }

    // Random unusable password: these accounts sign in by phone OTP only.
    const passwordHash = await this.passwords.hash(`seed-${Math.random().toString(36).slice(2)}-${Date.now()}`);

    for (const s of STAFF) {
      let user = await this.users.findByPhone(s.phone);
      if (!user) {
        user = await this.users.create({
          email: s.email,
          phone: s.phone,
          passwordHash,
          firstName: s.firstName,
          lastName: s.lastName,
          type: USER_TYPE.STAFF,
          status: USER_STATUS.ACTIVE,
          emailVerified: false,
          roles: [ORG_ROLES.STAFF],
          permissions: [],
        });
        summary.users.created += 1;
      } else {
        summary.users.skipped += 1;
      }

      const userId = String(user.id ?? user._id);
      const existing = await this.memberships.findByUserAndOrg(userId, restaurant.organizationId);
      if (existing) {
        summary.memberships.skipped += 1;
        continue;
      }
      await this.memberships.create({
        userId,
        organizationId: restaurant.organizationId,
        restaurantId: restaurant.id ?? restaurant._id,
        branchId: branch.id ?? branch._id,
        scope: MEMBERSHIP_SCOPE.BRANCH,
        role: ORG_ROLES.STAFF,
        isOwner: false,
        status: MEMBERSHIP_STATUS.ACTIVE,
      });
      summary.memberships.created += 1;
    }

    this.logger.info({ summary }, 'Keventers staff seed complete');
    return summary;
  }
}

export const keventersStaffSeeder = new KeventersStaffSeeder();
export default keventersStaffSeeder;
