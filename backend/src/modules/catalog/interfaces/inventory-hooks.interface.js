import { CATALOG_EVENTS } from '../events/catalog.events.js';

/**
 * Inventory extension points. Per the phase scope, NO inventory logic is
 * implemented here — the catalog only exposes the seams a future Inventory
 * module plugs into:
 *
 *  1. Product/variant carry `trackInventory` + `inventoryRef` fields.
 *  2. These well-known event names let the inventory module publish stock
 *     signals the catalog (and KDS/ordering) can react to WITHOUT the catalog
 *     depending on inventory.
 *
 * A future InventoryProvider implementation is resolved via DI and publishes
 * these events; the catalog's availability service already listens for
 * availability changes.
 */
export const INVENTORY_HOOK_EVENTS = Object.freeze({
  INVENTORY_LOW: CATALOG_EVENTS.INVENTORY_LOW,
  INVENTORY_UPDATED: CATALOG_EVENTS.INVENTORY_UPDATED,
  INVENTORY_UNAVAILABLE: CATALOG_EVENTS.INVENTORY_UNAVAILABLE,
  PRODUCT_STOCK_CHANGED: CATALOG_EVENTS.PRODUCT_STOCK_CHANGED,
});

/**
 * Contract a future Inventory module implements. Declared here so catalog code
 * can be typed/tested against the seam today; there is no concrete binding yet.
 */
export class InventoryProvider {
  /* eslint-disable no-unused-vars, class-methods-use-this */
  /** @returns {Promise<{ available: boolean, quantity: number|null }>} */
  async getStock(scope, productId, variantId = null) {
    throw new Error('InventoryProvider.getStock() not implemented');
  }

  /** @returns {Promise<void>} */
  async reserve(scope, productId, quantity, variantId = null) {
    throw new Error('InventoryProvider.reserve() not implemented');
  }
  /* eslint-enable no-unused-vars, class-methods-use-this */
}

export default InventoryProvider;
