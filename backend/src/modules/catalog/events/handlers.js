import { logger } from '#core/logging/logger.js';
import { cacheInvalidation } from '#core/cache/cache-invalidation.js';

import { CATALOG_CACHE } from '../constants/catalog.constants.js';

import { CATALOG_EVENTS } from './catalog.events.js';

/**
 * Intra-module event subscribers. These are cross-cutting reactions to catalog
 * lifecycle events WITHOUT coupling — a future KDS/inventory/analytics module
 * would subscribe to the same events independently. Kept light (observability +
 * public-catalog cache invalidation); transactional side effects live in the
 * services themselves.
 *
 * @param {import('#core/eventbus/event-bus.interface.js').IEventBus} eventBus
 * @param {{ cacheInvalidation?: object }} [deps]
 */
export function registerCatalogEventHandlers(eventBus, deps = {}) {
  const log = logger({ module: 'catalog', component: 'event-handlers' });
  const invalidation = deps.cacheInvalidation ?? cacheInvalidation;

  const observe = (event, msg) =>
    eventBus.subscribe(event, async (payload) => log.info({ payload }, msg), {
      name: `catalog.log.${event}`,
    });

  // Observability for the key lifecycle transitions.
  observe(CATALOG_EVENTS.MENU_PUBLISHED, 'menu published');
  observe(CATALOG_EVENTS.MENU_ARCHIVED, 'menu archived');
  observe(CATALOG_EVENTS.PRODUCT_CREATED, 'product created');
  observe(CATALOG_EVENTS.PRODUCT_DELETED, 'product deleted');
  observe(CATALOG_EVENTS.PRODUCT_AVAILABILITY_CHANGED, 'product availability changed');
  observe(CATALOG_EVENTS.PRODUCT_PRICE_CHANGED, 'product price changed');

  // Public-catalog cache invalidation: any change to a restaurant's catalog
  // clears its cached public menu/catalog projections so customers see fresh
  // data. Administrative (tenant-sensitive) data is never cached.
  const invalidateForRestaurant = async (payload) => {
    const restaurantId = payload?.restaurantId;
    if (!restaurantId) return;
    try {
      await invalidation.invalidateByPattern(
        `${CATALOG_CACHE.PUBLIC_CATALOG_PREFIX}:${restaurantId}*`,
      );
      await invalidation.invalidateByPattern(
        `${CATALOG_CACHE.PUBLIC_MENU_PREFIX}:${restaurantId}*`,
      );
      await invalidation.invalidateByPattern(
        `${CATALOG_CACHE.PUBLIC_PRODUCT_PREFIX}:${restaurantId}*`,
      );
    } catch (err) {
      log.warn({ err }, 'Public catalog cache invalidation failed (continuing)');
    }
  };

  const mutationEvents = [
    CATALOG_EVENTS.MENU_CREATED,
    CATALOG_EVENTS.MENU_UPDATED,
    CATALOG_EVENTS.MENU_DELETED,
    CATALOG_EVENTS.MENU_PUBLISHED,
    CATALOG_EVENTS.MENU_ARCHIVED,
    CATALOG_EVENTS.CATEGORY_CREATED,
    CATALOG_EVENTS.CATEGORY_UPDATED,
    CATALOG_EVENTS.CATEGORY_DELETED,
    CATALOG_EVENTS.PRODUCT_CREATED,
    CATALOG_EVENTS.PRODUCT_UPDATED,
    CATALOG_EVENTS.PRODUCT_DELETED,
    CATALOG_EVENTS.PRODUCT_AVAILABILITY_CHANGED,
    CATALOG_EVENTS.PRODUCT_PRICE_CHANGED,
    CATALOG_EVENTS.VARIANT_CREATED,
    CATALOG_EVENTS.VARIANT_UPDATED,
    CATALOG_EVENTS.VARIANT_DELETED,
    CATALOG_EVENTS.MODIFIER_GROUP_UPDATED,
    CATALOG_EVENTS.MODIFIER_ADDED,
    CATALOG_EVENTS.MODIFIER_REMOVED,
    CATALOG_EVENTS.ADDON_UPDATED,
  ];

  for (const event of mutationEvents) {
    eventBus.subscribe(event, invalidateForRestaurant, {
      name: `catalog.cache-invalidate.${event}`,
    });
  }
}

export default registerCatalogEventHandlers;
