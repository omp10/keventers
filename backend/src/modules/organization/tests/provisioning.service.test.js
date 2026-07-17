import { describe, it, expect, beforeEach } from 'vitest';

import { ProvisioningService } from '../services/provisioning.service.js';
import { ORG_ROLES } from '../constants/organization.constants.js';

import {
  FakeApplicationRepository,
  FakeOrganizationRepository,
  FakeRestaurantRepository,
  FakeBranchRepository,
  FakeMembershipRepository,
  createFakeUserService,
  createFakeEventBus,
  fakeSubscriptions,
} from './_helpers.js';

async function seededApp(applications) {
  return applications.create({
    email: 'owner@k.test',
    ownerName: 'Asha Rao',
    phone: '9999999999',
    restaurantName: 'Keventers CP',
    brandName: 'Keventers',
    restaurantType: 'qsr',
    cuisines: ['desserts'],
    address: { city: 'Delhi' },
    logo: { url: 'u', key: 'k' },
    status: 'pending',
  });
}

function build() {
  const applications = new FakeApplicationRepository();
  const organizations = new FakeOrganizationRepository();
  const restaurants = new FakeRestaurantRepository();
  const branches = new FakeBranchRepository();
  const memberships = new FakeMembershipRepository();
  const users = createFakeUserService();
  const service = new ProvisioningService({
    users,
    organizations,
    restaurants,
    branches,
    memberships,
    applications,
    subscriptions: fakeSubscriptions,
    eventBus: createFakeEventBus(),
  });
  return { service, applications, organizations, restaurants, branches, memberships, users };
}

describe('ProvisioningService', () => {
  let ctx;
  beforeEach(() => {
    ctx = build();
  });

  it('provisions org + restaurant + branch + membership and creates the owner with roles', async () => {
    const app = await seededApp(ctx.applications);
    const result = await ctx.service.provisionFromApplication(app, {}, 'admin-1');

    expect(result.createdUser).toBe(true);
    expect(ctx.users.created).toHaveLength(1);
    expect(ctx.users.created[0].roles).toEqual(
      expect.arrayContaining([ORG_ROLES.ORGANIZATION_ADMIN, ORG_ROLES.RESTAURANT_MANAGER]),
    );
    expect(ctx.organizations.docs.size).toBe(1);
    expect(ctx.restaurants.docs.size).toBe(1);
    expect(ctx.branches.docs.size).toBe(1);
    expect(ctx.memberships.docs.size).toBe(1);

    // Membership binds the owner to the new organization (tenancy foundation).
    const membership = [...ctx.memberships.docs.values()][0];
    expect(membership.isOwner).toBe(true);
    expect(membership.role).toBe(ORG_ROLES.ORGANIZATION_ADMIN);
  });

  it('links an existing phone owner when the application email is different', async () => {
    const existing = await ctx.users.createUser({
      email: 'customer@k.test',
      phone: '9999999999',
      roles: [],
      type: 'customer',
    });
    const app = await seededApp(ctx.applications);

    const result = await ctx.service.provisionFromApplication(app, {}, 'admin-1');

    expect(result.createdUser).toBe(false);
    expect(result.owner.id).toBe(existing.id);
    expect(ctx.users.created).toHaveLength(1);
    expect(result.owner.roles).toEqual(
      expect.arrayContaining([ORG_ROLES.ORGANIZATION_ADMIN, ORG_ROLES.RESTAURANT_MANAGER]),
    );
    const membership = [...ctx.memberships.docs.values()][0];
    expect(membership.userId).toBe(existing.id);
    expect(membership.isOwner).toBe(true);
  });

  it('compensates (rolls back) when a later step fails', async () => {
    const app = await seededApp(ctx.applications);
    // Force branch creation to fail after org + restaurant are created.
    ctx.branches.create = async () => {
      throw new Error('branch failure');
    };

    await expect(ctx.service.provisionFromApplication(app, {}, 'admin-1')).rejects.toThrow('branch failure');

    // Org and restaurant were soft-deleted; the created user was removed.
    expect(await ctx.organizations.count()).toBe(0);
    expect(await ctx.restaurants.count()).toBe(0);
    expect(await ctx.users.getUserByEmail('owner@k.test')).toBeNull();
  });
});
