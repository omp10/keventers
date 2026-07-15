import { describe, expect, it } from 'vitest';

import { StationRouterService } from '../services/station-router.service.js';

const router = new StationRouterService();

const stations = [
  { _id: 'grill', isActive: true, routing: { productIds: ['burger'], categoryIds: [], isDefault: false } },
  { _id: 'beverage', isActive: true, routing: { productIds: [], categoryIds: ['drinks'], isDefault: false } },
  { _id: 'general', isActive: true, routing: { productIds: [], categoryIds: [], isDefault: true } },
];

describe('StationRouterService', () => {
  it('routes by productId', () => {
    expect(router.resolveForItem(stations, { productId: 'burger', categoryId: null })).toEqual(['grill']);
  });

  it('routes by categoryId', () => {
    expect(router.resolveForItem(stations, { productId: 'x', categoryId: 'drinks' })).toEqual(['beverage']);
  });

  it('falls back to the default station', () => {
    expect(router.resolveForItem(stations, { productId: 'z', categoryId: 'unknown' })).toEqual(['general']);
  });

  it('builds kitchen items with the station union', () => {
    const { items, stationIds } = router.buildItems(stations, [
      { id: 'i1', productId: 'burger', product: { name: 'Burger', categoryId: 'food' }, quantity: 2, modifiers: [{ name: 'Extra cheese' }], addons: [] },
      { id: 'i2', productId: 'x', product: { name: 'Cola', categoryId: 'drinks' }, quantity: 1, modifiers: [], addons: [] },
    ]);
    expect(items[0]).toMatchObject({ name: 'Burger', quantity: 2, stationIds: ['grill'], modifiers: ['Extra cheese'] });
    expect(items[1].stationIds).toEqual(['beverage']);
    expect(new Set(stationIds)).toEqual(new Set(['grill', 'beverage']));
  });
});
