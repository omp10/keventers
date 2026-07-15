import { beforeEach, describe, expect, it } from 'vitest';

import { MenuService } from '../services/menu.service.js';
import { CATALOG_EVENTS } from '../events/catalog.events.js';
import { MENU_STATUS } from '../constants/catalog.constants.js';

import {
  FakeMenuRepository,
  buildTenant,
  createFakeEventBus,
  fakeScopeResolver,
} from './_helpers.js';

function build() {
  const menus = new FakeMenuRepository();
  const events = createFakeEventBus();
  const service = new MenuService({ menus, resolveScope: fakeScopeResolver(), eventBus: events });
  return { service, menus, events, tenant: buildTenant() };
}

describe('MenuService', () => {
  let ctx;
  beforeEach(() => {
    ctx = build();
  });

  it('creates a draft menu with a unique slug', async () => {
    const dto = await ctx.service.createMenu(ctx.tenant, 'rest1', { name: 'Breakfast' });
    expect(dto.status).toBe(MENU_STATUS.DRAFT);
    expect(dto.slug).toBe('breakfast');
    expect(ctx.events.published.map((e) => e.name)).toContain(CATALOG_EVENTS.MENU_CREATED);
  });

  it('de-duplicates slugs within the restaurant', async () => {
    const a = await ctx.service.createMenu(ctx.tenant, 'rest1', { name: 'Lunch' });
    const b = await ctx.service.createMenu(ctx.tenant, 'rest1', { name: 'Lunch' });
    expect(a.slug).toBe('lunch');
    expect(b.slug).not.toBe('lunch');
  });

  it('publishes a menu: ACTIVE, active flag, version bumped, event emitted', async () => {
    const menu = await ctx.service.createMenu(ctx.tenant, 'rest1', { name: 'Dinner' });
    const published = await ctx.service.publishMenu(ctx.tenant, menu.id, 'admin-1');
    expect(published.status).toBe(MENU_STATUS.ACTIVE);
    expect(published.isActive).toBe(true);
    expect(published.version).toBe(2);
    expect(ctx.events.published.map((e) => e.name)).toContain(CATALOG_EVENTS.MENU_PUBLISHED);
  });

  it('archives a menu and clears its active/default flags', async () => {
    const menu = await ctx.service.createMenu(ctx.tenant, 'rest1', { name: 'Festival', isDefault: true });
    const archived = await ctx.service.archiveMenu(ctx.tenant, menu.id);
    expect(archived.status).toBe(MENU_STATUS.ARCHIVED);
    expect(archived.isActive).toBe(false);
    expect(archived.isDefault).toBe(false);
  });
});
