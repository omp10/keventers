
import {
  APPLICATION_STATUS,
  BRANCH_STATUS,
  MEMBERSHIP_SCOPE,
  MEMBERSHIP_STATUS,
  ORGANIZATION_STATUS,
  ORG_ROLES,
  RESTAURANT_STATUS,
  RESTAURANT_TYPE,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS,
} from '../constants/organization.constants.js';
import { branchRepository } from '../repositories/branch.repository.js';
import { membershipRepository } from '../repositories/membership.repository.js';
import { onboardingApplicationRepository } from '../repositories/onboarding-application.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { restaurantRepository } from '../repositories/restaurant.repository.js';

import { logger as baseLogger } from '#core/logging/logger.js';
import { BaseSeeder } from '#database/seeds/base.seeder.js';
import { USER_STATUS, USER_TYPE } from '#modules/identity/constants/identity.constants.js';
import { userRepository } from '#modules/identity/repositories/user.repository.js';
import { passwordService } from '#platform/auth/index.js';

const DEMO_PASSWORD = 'DemoOwner123!';

const OWNER_FIXTURES = [
  {
    key: 'brewmist',
    email: 'owner+brewmist@keventers.demo',
    phone: '+919800000101',
    firstName: 'Aarav',
    lastName: 'Mehta',
    status: USER_STATUS.ACTIVE,
    roles: [ORG_ROLES.ORGANIZATION_ADMIN],
    lastLoginAt: new Date('2026-07-12T10:15:00.000Z'),
  },
  {
    key: 'midnight',
    email: 'owner+midnight@keventers.demo',
    phone: '+919800000102',
    firstName: 'Siya',
    lastName: 'Kapoor',
    status: USER_STATUS.ACTIVE,
    roles: [ORG_ROLES.ORGANIZATION_ADMIN],
    lastLoginAt: new Date('2026-07-10T08:45:00.000Z'),
  },
  {
    key: 'express',
    email: 'owner+express@keventers.demo',
    phone: '+919800000103',
    firstName: 'Kabir',
    lastName: 'Shah',
    status: USER_STATUS.ACTIVE,
    roles: [ORG_ROLES.ORGANIZATION_ADMIN],
    lastLoginAt: new Date('2026-07-08T14:20:00.000Z'),
  },
];

const APPLICATION_FIXTURES = [
  {
    restaurantName: 'Keventers Skyline Cafe',
    brandName: 'Skyline Cafe',
    ownerName: 'Rhea Malhotra',
    email: 'apply+skyline@keventers.demo',
    phone: '+919811111101',
    city: 'Bengaluru',
    restaurantType: RESTAURANT_TYPE.CAFE,
    cuisines: ['Cafe', 'Desserts'],
    numberOfBranches: 2,
    status: APPLICATION_STATUS.PENDING,
    submittedAt: new Date('2026-07-14T09:00:00.000Z'),
    documents: [
      { type: 'license', key: 'demo/license-skyline.pdf', url: 'https://example.com/license-skyline.pdf', name: 'Trade License.pdf' },
    ],
  },
  {
    restaurantName: 'Smoky Route Kitchen',
    brandName: 'Smoky Route',
    ownerName: 'Dev Arora',
    email: 'apply+smokyroute@keventers.demo',
    phone: '+919811111102',
    city: 'Pune',
    restaurantType: RESTAURANT_TYPE.CLOUD_KITCHEN,
    cuisines: ['North Indian', 'Biryani'],
    numberOfBranches: 1,
    status: APPLICATION_STATUS.UNDER_REVIEW,
    submittedAt: new Date('2026-07-11T12:30:00.000Z'),
    reviewNotes: 'Need a clearer FSSAI certificate upload before approval.',
    requestedInformation: ['Upload higher-resolution FSSAI certificate', 'Share kitchen fire safety NOC'],
    documents: [
      { type: 'fssai', key: 'demo/fssai-smokyroute.pdf', url: 'https://example.com/fssai-smokyroute.pdf', name: 'FSSAI Certificate.pdf' },
    ],
  },
  {
    restaurantName: 'Lotus Table Dining',
    brandName: 'Lotus Table',
    ownerName: 'Mira Sen',
    email: 'apply+lotustable@keventers.demo',
    phone: '+919811111103',
    city: 'Mumbai',
    restaurantType: RESTAURANT_TYPE.CASUAL_DINING,
    cuisines: ['Pan Asian', 'Thai'],
    numberOfBranches: 1,
    status: APPLICATION_STATUS.REJECTED,
    submittedAt: new Date('2026-07-05T16:00:00.000Z'),
    rejectionReason: 'Submitted registration document did not match the legal entity name.',
    documents: [
      { type: 'registration', key: 'demo/registration-lotustable.pdf', url: 'https://example.com/registration-lotustable.pdf', name: 'Business Registration.pdf' },
    ],
  },
];

const ORGANIZATION_FIXTURES = [
  {
    slug: 'brewmist-coffee',
    name: 'Brewmist Coffee Co.',
    brandName: 'Brewmist',
    ownerKey: 'brewmist',
    status: ORGANIZATION_STATUS.ACTIVE,
    subscription: {
      plan: SUBSCRIPTION_PLAN.PRO,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      trialStartedAt: new Date('2026-06-01T00:00:00.000Z'),
      trialEndsAt: new Date('2026-06-14T23:59:59.000Z'),
      currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-07-31T23:59:59.000Z'),
      maxRestaurants: 3,
      maxBranches: 8,
    },
    contact: { email: 'ops@brewmist.demo', phone: '+918800000201' },
    restaurants: [
      {
        slug: 'brewmist-indiranagar',
        name: 'Brewmist Indiranagar',
        type: RESTAURANT_TYPE.CAFE,
        cuisines: ['Coffee', 'Desserts'],
        status: RESTAURANT_STATUS.ACTIVE,
        branches: [
          { name: 'Indiranagar Main', code: 'BRW-IND-01', isPrimary: true, status: BRANCH_STATUS.ACTIVE, tableCount: 18 },
          { name: 'Indiranagar Courtyard', code: 'BRW-IND-02', isPrimary: false, status: BRANCH_STATUS.ACTIVE, tableCount: 10 },
        ],
      },
      {
        slug: 'brewmist-koramangala',
        name: 'Brewmist Koramangala',
        type: RESTAURANT_TYPE.CAFE,
        cuisines: ['Coffee', 'Bakery'],
        status: RESTAURANT_STATUS.ACTIVE,
        branches: [
          { name: 'Koramangala 5th Block', code: 'BRW-KOR-01', isPrimary: true, status: BRANCH_STATUS.ACTIVE, tableCount: 14 },
        ],
      },
    ],
  },
  {
    slug: 'midnight-bites',
    name: 'Midnight Bites Foods',
    brandName: 'Midnight Bites',
    ownerKey: 'midnight',
    status: ORGANIZATION_STATUS.SUSPENDED,
    subscription: {
      plan: SUBSCRIPTION_PLAN.BASIC,
      status: SUBSCRIPTION_STATUS.SUSPENDED,
      trialStartedAt: new Date('2026-05-12T00:00:00.000Z'),
      trialEndsAt: new Date('2026-05-26T23:59:59.000Z'),
      currentPeriodStart: new Date('2026-06-27T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-07-26T23:59:59.000Z'),
      maxRestaurants: 1,
      maxBranches: 3,
    },
    suspendedAt: new Date('2026-07-09T06:15:00.000Z'),
    suspensionReason: 'Billing follow-up pending.',
    contact: { email: 'admin@midnightbites.demo', phone: '+918800000202' },
    restaurants: [
      {
        slug: 'midnight-bites-central',
        name: 'Midnight Bites Central Kitchen',
        type: RESTAURANT_TYPE.CLOUD_KITCHEN,
        cuisines: ['Fast Food', 'Wraps'],
        status: RESTAURANT_STATUS.SUSPENDED,
        branches: [
          { name: 'Central Kitchen', code: 'MDB-CEN-01', isPrimary: true, status: BRANCH_STATUS.SUSPENDED, tableCount: 0 },
        ],
      },
    ],
  },
  {
    slug: 'express-thali',
    name: 'Express Thali Ventures',
    brandName: 'Express Thali',
    ownerKey: 'express',
    status: ORGANIZATION_STATUS.ONBOARDING,
    subscription: {
      plan: SUBSCRIPTION_PLAN.TRIAL,
      status: SUBSCRIPTION_STATUS.TRIAL,
      trialStartedAt: new Date('2026-07-13T00:00:00.000Z'),
      trialEndsAt: new Date('2026-07-27T23:59:59.000Z'),
      currentPeriodStart: new Date('2026-07-13T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-07-27T23:59:59.000Z'),
      maxRestaurants: 1,
      maxBranches: 2,
    },
    contact: { email: 'founder@expressthali.demo', phone: '+918800000203' },
    restaurants: [
      {
        slug: 'express-thali-hsr',
        name: 'Express Thali HSR',
        type: RESTAURANT_TYPE.QSR,
        cuisines: ['North Indian', 'Meals'],
        status: RESTAURANT_STATUS.ONBOARDING,
        branches: [
          { name: 'HSR Launch Outlet', code: 'EXP-HSR-01', isPrimary: true, status: BRANCH_STATUS.ACTIVE, tableCount: 12 },
        ],
      },
    ],
  },
];

function address(city) {
  return {
    line1: `Demo Street, ${city}`,
    line2: 'Near Central Plaza',
    city,
    state: city === 'Mumbai' ? 'Maharashtra' : city === 'Pune' ? 'Maharashtra' : 'Karnataka',
    country: 'India',
    pincode: city === 'Mumbai' ? '400001' : city === 'Pune' ? '411001' : '560001',
  };
}

function branchHours() {
  return [
    { day: 'monday', open: '09:00', close: '22:00', isOpen: true },
    { day: 'tuesday', open: '09:00', close: '22:00', isOpen: true },
    { day: 'wednesday', open: '09:00', close: '22:00', isOpen: true },
    { day: 'thursday', open: '09:00', close: '22:00', isOpen: true },
    { day: 'friday', open: '09:00', close: '23:00', isOpen: true },
    { day: 'saturday', open: '09:00', close: '23:00', isOpen: true },
    { day: 'sunday', open: '10:00', close: '21:00', isOpen: true },
  ];
}

export class AdminDemoSeeder extends BaseSeeder {
  constructor({
    applications = onboardingApplicationRepository,
    organizations = organizationRepository,
    restaurants = restaurantRepository,
    branches = branchRepository,
    memberships = membershipRepository,
    users = userRepository,
    passwords = passwordService,
    logger,
  } = {}) {
    super();
    this.name = '012-admin-demo-data';
    this.applications = applications;
    this.organizations = organizations;
    this.restaurants = restaurants;
    this.branches = branches;
    this.memberships = memberships;
    this.users = users;
    this.passwords = passwords;
    this.logger = logger ?? baseLogger({ module: 'organization', component: 'admin-demo-seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = {
      applications: { created: 0, skipped: 0 },
      organizations: { created: 0, skipped: 0 },
      restaurants: { created: 0, skipped: 0 },
      branches: { created: 0, skipped: 0 },
      users: { created: 0, skipped: 0 },
      memberships: { created: 0, skipped: 0 },
    };

    const owners = await this.#seedOwners(summary);
    await this.#seedApplications(summary);
    await this.#seedOrganizations(summary, owners);

    this.logger.info({ summary }, 'Admin demo seed complete');
    return summary;
  }

  async #seedOwners(summary) {
    const passwordHash = await this.passwords.hash(DEMO_PASSWORD);
    const owners = new Map();

    for (const fixture of OWNER_FIXTURES) {
      let user = await this.users.findByEmail(fixture.email);
      if (!user) {
        user = await this.users.create({
          email: fixture.email,
          phone: fixture.phone,
          passwordHash,
          firstName: fixture.firstName,
          lastName: fixture.lastName,
          type: USER_TYPE.STAFF,
          status: fixture.status,
          emailVerified: true,
          roles: fixture.roles,
          permissions: [],
          lastLoginAt: fixture.lastLoginAt,
          passwordChangedAt: new Date('2026-07-01T00:00:00.000Z'),
        });
        summary.users.created += 1;
      } else {
        summary.users.skipped += 1;
      }
      owners.set(fixture.key, user);
    }

    return owners;
  }

  async #seedApplications(summary) {
    for (const fixture of APPLICATION_FIXTURES) {
      const existing = await this.applications.findByEmail(fixture.email);
      if (existing) {
        summary.applications.skipped += 1;
        continue;
      }

      await this.applications.create({
        restaurantName: fixture.restaurantName,
        brandName: fixture.brandName,
        ownerName: fixture.ownerName,
        email: fixture.email,
        phone: fixture.phone,
        address: address(fixture.city),
        restaurantType: fixture.restaurantType,
        cuisines: fixture.cuisines,
        numberOfBranches: fixture.numberOfBranches,
        documents: fixture.documents,
        status: fixture.status,
        reviewNotes: fixture.reviewNotes ?? '',
        rejectionReason: fixture.rejectionReason ?? '',
        requestedInformation: fixture.requestedInformation ?? [],
        submittedAt: fixture.submittedAt,
      });
      summary.applications.created += 1;
    }
  }

  async #seedOrganizations(summary, owners) {
    for (const fixture of ORGANIZATION_FIXTURES) {
      const owner = owners.get(fixture.ownerKey);
      if (!owner) continue;

      let organization = await this.organizations.findBySlug(fixture.slug);
      if (!organization) {
        organization = await this.organizations.create({
          name: fixture.name,
          slug: fixture.slug,
          brandName: fixture.brandName,
          ownerUserId: owner.id,
          status: fixture.status,
          contact: fixture.contact,
          subscription: fixture.subscription,
          suspendedAt: fixture.suspendedAt ?? null,
          suspensionReason: fixture.suspensionReason ?? '',
        });
        summary.organizations.created += 1;
      } else {
        summary.organizations.skipped += 1;
      }

      const membership = await this.memberships.findByUserAndOrg(owner.id, organization.id);
      if (!membership) {
        await this.memberships.create({
          userId: owner.id,
          organizationId: organization.id,
          scope: MEMBERSHIP_SCOPE.ORGANIZATION,
          role: ORG_ROLES.ORGANIZATION_ADMIN,
          isOwner: true,
          status: MEMBERSHIP_STATUS.ACTIVE,
        });
        summary.memberships.created += 1;
      } else {
        summary.memberships.skipped += 1;
      }

      for (const restaurantFixture of fixture.restaurants) {
        let restaurant = await this.restaurants.findOne({
          organizationId: organization.id,
          slug: restaurantFixture.slug,
        });
        if (!restaurant) {
          restaurant = await this.restaurants.create({
            organizationId: organization.id,
            name: restaurantFixture.name,
            slug: restaurantFixture.slug,
            type: restaurantFixture.type,
            cuisines: restaurantFixture.cuisines,
            address: address('Bengaluru'),
            status: restaurantFixture.status,
            managerUserId: owner.id,
            onboarding: {
              started: true,
              startedAt: new Date('2026-07-13T08:00:00.000Z'),
              completed: restaurantFixture.status !== RESTAURANT_STATUS.ONBOARDING,
              completedAt:
                restaurantFixture.status !== RESTAURANT_STATUS.ONBOARDING
                  ? new Date('2026-07-14T18:00:00.000Z')
                  : null,
              completedSteps:
                restaurantFixture.status !== RESTAURANT_STATUS.ONBOARDING
                  ? ['logo', 'business_hours', 'currency', 'taxes', 'timezone', 'qr_settings']
                  : ['logo', 'business_hours'],
            },
            settings: {
              currency: 'INR',
              timezone: 'Asia/Kolkata',
              contact: fixture.contact,
              delivery: { enabled: true, radiusKm: 6 },
              notifications: { email: true, sms: true, whatsapp: false },
            },
          });
          summary.restaurants.created += 1;
        } else {
          summary.restaurants.skipped += 1;
        }

        for (const branchFixture of restaurantFixture.branches) {
          const existingBranch = await this.branches.findOne({
            restaurantId: restaurant.id,
            code: branchFixture.code,
          });
          if (existingBranch) {
            summary.branches.skipped += 1;
            continue;
          }

          await this.branches.create({
            organizationId: organization.id,
            restaurantId: restaurant.id,
            name: branchFixture.name,
            code: branchFixture.code,
            address: address('Bengaluru'),
            businessHours: branchHours(),
            managerUserId: owner.id,
            isPrimary: branchFixture.isPrimary,
            status: branchFixture.status,
            settings: {
              currency: 'INR',
              timezone: 'Asia/Kolkata',
              acceptsOnlineOrders: true,
              tableCount: branchFixture.tableCount,
            },
          });
          summary.branches.created += 1;
        }
      }
    }
  }

  async rollback(context = {}) {
    if (context.logger) this.logger = context.logger;

    for (const fixture of APPLICATION_FIXTURES) {
      const application = await this.applications.findByEmail(fixture.email);
      if (application) await this.applications.deleteById(application.id);
    }

    for (const organizationFixture of ORGANIZATION_FIXTURES) {
      const organization = await this.organizations.findBySlug(organizationFixture.slug);
      if (!organization) continue;

      const restaurantDocs = await this.restaurants.findByOrganization(organization.id);
      for (const restaurant of restaurantDocs) {
        const branchDocs = await this.branches.findByRestaurant(restaurant.id);
        for (const branch of branchDocs) {
          await this.branches.deleteById(branch.id);
        }
        await this.restaurants.deleteById(restaurant.id);
      }

      const membershipDocs = await this.memberships.findByOrganization(organization.id);
      for (const membership of membershipDocs) {
        await this.memberships.deleteById(membership.id);
      }

      await this.organizations.deleteById(organization.id);
    }

    for (const ownerFixture of OWNER_FIXTURES) {
      const user = await this.users.findByEmail(ownerFixture.email);
      if (user) await this.users.deleteById(user.id);
    }

    this.logger.info('Admin demo seed rolled back');
  }
}

export const adminDemoSeeder = new AdminDemoSeeder();
export default adminDemoSeeder;
