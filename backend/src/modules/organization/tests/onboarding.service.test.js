import { describe, it, expect, beforeEach } from 'vitest';

import { OnboardingService } from '../services/onboarding.service.js';
import { APPLICATION_STATUS } from '../constants/organization.constants.js';
import { ORG_EVENTS } from '../events/organization.events.js';

import {
  FakeApplicationRepository,
  fakeStorage,
  createFakeNotifications,
  createFakeEventBus,
  createFakeUserService,
} from './_helpers.js';

function build(provisioning) {
  const applications = new FakeApplicationRepository();
  const notifications = createFakeNotifications();
  const events = createFakeEventBus();
  const users = createFakeUserService();
  const service = new OnboardingService({
    applications,
    provisioning,
    users,
    storage: fakeStorage,
    notifications,
    eventBus: events,
  });
  return { service, applications, notifications, events, users };
}

const payload = {
  restaurantName: 'Keventers CP',
  brandName: 'Keventers',
  ownerName: 'Asha Rao',
  email: 'owner@keventers.test',
  phone: '9999999999',
  address: { city: 'Delhi', state: 'Delhi', pincode: '110001' },
  restaurantType: 'qsr',
  cuisines: ['desserts'],
  numberOfBranches: 2,
};

describe('OnboardingService', () => {
  let ctx;
  beforeEach(() => {
    ctx = build({ provisionFromApplication: async () => ({}) });
  });

  it('registers a PENDING application, uploads the logo, and publishes an event', async () => {
    const files = { logo: { buffer: Buffer.from('x'), originalname: 'logo.png', mimetype: 'image/png' } };
    const dto = await ctx.service.registerRestaurant(payload, files);

    expect(dto.status).toBe(APPLICATION_STATUS.PENDING);
    expect(dto.logo.url).toContain('https://cdn.test/');
    expect(ctx.events.published.map((e) => e.name)).toContain(ORG_EVENTS.ORGANIZATION_REGISTERED);
    expect(ctx.notifications.sent.some((n) => n.message.templateId === 'registration_received')).toBe(true);
  });

  it('rejects a duplicate active application for the same email', async () => {
    await ctx.service.registerRestaurant(payload, {});
    await expect(ctx.service.registerRestaurant(payload, {})).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects an application and notifies the applicant', async () => {
    const app = await ctx.service.registerRestaurant(payload, {});
    const rejected = await ctx.service.reject(app.id, { reason: 'Incomplete documents' }, 'admin-1');
    expect(rejected.status).toBe(APPLICATION_STATUS.REJECTED);
    expect(ctx.events.published.map((e) => e.name)).toContain(ORG_EVENTS.ORGANIZATION_REJECTED);
    expect(ctx.notifications.sent.some((n) => n.message.templateId === 'application_rejected')).toBe(true);
  });

  it('approves via provisioning, publishes lifecycle events, and sends a set-password link', async () => {
    const provisioning = {
      provisionFromApplication: async () => ({
        organization: { _id: 'org-1', name: 'Keventers' },
        restaurant: { _id: 'rest-1' },
        branch: { _id: 'br-1' },
        owner: { id: 'user-1', email: payload.email },
        createdUser: true,
      }),
    };
    const c = build(provisioning);
    const app = await c.service.registerRestaurant(payload, {});

    const result = await c.service.approve(app.id, {}, 'admin-1');

    expect(result.organization.id).toBe('org-1');
    const names = c.events.published.map((e) => e.name);
    expect(names).toContain(ORG_EVENTS.ORGANIZATION_APPROVED);
    expect(names).toContain(ORG_EVENTS.RESTAURANT_CREATED);
    expect(names).toContain(ORG_EVENTS.BRANCH_CREATED);
    expect(c.users.resets).toContain(payload.email);
  });
});
