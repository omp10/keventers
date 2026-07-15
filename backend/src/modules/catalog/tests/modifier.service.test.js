import { beforeEach, describe, expect, it } from 'vitest';

import { ModifierService } from '../services/modifier.service.js';
import { CATALOG_EVENTS } from '../events/catalog.events.js';
import { MODIFIER_GROUP_TYPE } from '../constants/catalog.constants.js';

import {
  FakeModifierGroupRepository,
  FakeModifierRepository,
  buildTenant,
  createFakeEventBus,
  fakeScopeResolver,
} from './_helpers.js';

function build() {
  const groups = new FakeModifierGroupRepository();
  const modifiers = new FakeModifierRepository();
  const events = createFakeEventBus();
  const service = new ModifierService({
    groups,
    modifiers,
    resolveScope: fakeScopeResolver(),
    eventBus: events,
  });
  return { service, groups, modifiers, events, tenant: buildTenant() };
}

describe('ModifierService', () => {
  let ctx;
  beforeEach(() => {
    ctx = build();
  });

  it('creates a group and adds modifiers to it', async () => {
    const group = await ctx.service.createGroup(ctx.tenant, 'rest1', {
      name: 'Choose Size',
      type: MODIFIER_GROUP_TYPE.SINGLE,
      isRequired: true,
      minSelection: 1,
      maxSelection: 1,
    });
    const modifier = await ctx.service.addModifier(ctx.tenant, group.id, { name: 'Large', price: 20 });
    expect(modifier.groupId).toBe(group.id);

    const withModifiers = await ctx.service.getGroup(ctx.tenant, group.id);
    expect(withModifiers.modifiers).toHaveLength(1);
    expect(ctx.events.published.map((e) => e.name)).toContain(CATALOG_EVENTS.MODIFIER_ADDED);
  });

  it('rejects incoherent selection bounds (min > max)', async () => {
    await expect(
      ctx.service.createGroup(ctx.tenant, 'rest1', {
        name: 'Bad',
        minSelection: 3,
        maxSelection: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a single-select group with maxSelection > 1', async () => {
    await expect(
      ctx.service.createGroup(ctx.tenant, 'rest1', {
        name: 'Bad Single',
        type: MODIFIER_GROUP_TYPE.SINGLE,
        maxSelection: 3,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('cascades modifier removal when a group is deleted', async () => {
    const group = await ctx.service.createGroup(ctx.tenant, 'rest1', { name: 'Choose Sauce' });
    await ctx.service.addModifier(ctx.tenant, group.id, { name: 'Ketchup' });
    await ctx.service.deleteGroup(ctx.tenant, group.id);
    const remaining = await ctx.modifiers.findByGroup(
      { organizationId: 'org1', restaurantId: 'rest1' },
      group.id,
    );
    expect(remaining).toHaveLength(0);
  });
});
