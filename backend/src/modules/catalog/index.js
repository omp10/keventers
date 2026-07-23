/**
 * Catalog module — PUBLIC BARREL. Other modules (cart, order, KDS, inventory,
 * QR, analytics, loyalty, POS) import ONLY from here: the module's service
 * interfaces, domain events, constants and DI tokens. Controllers, repositories,
 * models and validators are private to the module.
 */
export { catalogModule } from './catalog.module.js';

// Service singletons (behaviour other modules compose via DI tokens).
export { menuService } from './services/menu.service.js';
export { categoryService } from './services/category.service.js';
export { productService } from './services/product.service.js';
export { variantService } from './services/variant.service.js';
export { modifierService } from './services/modifier.service.js';
export { addonService } from './services/addon.service.js';
export { pricingService } from './services/pricing.service.js';
export { availabilityService, describeWindows } from './services/availability.service.js';
export { catalogService } from './services/catalog.service.js';
export { importExportService } from './services/import-export.service.js';

// DI tokens for container-based resolution.
export { CATALOG_TOKENS } from './constants/catalog.tokens.js';

// Domain events + names other modules can subscribe to.
export * from './events/catalog.events.js';

// Inventory + import/export extension-point contracts (for future modules).
export {
  InventoryProvider,
  INVENTORY_HOOK_EVENTS,
} from './interfaces/inventory-hooks.interface.js';
export { CatalogImporter, CatalogExporter } from './interfaces/import-export.interface.js';

// Public constants.
export {
  MENU_TYPE,
  MENU_STATUS,
  MENU_VISIBILITY,
  CATEGORY_STATUS,
  MAX_CATEGORY_DEPTH,
  PRODUCT_STATUS,
  AVAILABILITY_STATUS,
  DIETARY_TAG,
  ALLERGEN,
  SPICE_LEVEL,
  MODIFIER_GROUP_TYPE,
  ENTITY_STATUS,
  CATALOG_PERMISSIONS,
} from './constants/catalog.constants.js';

// Seeder (registered with the platform seed runner).
export { catalogSeeder, CatalogSeeder } from './seeds/catalog.seeder.js';
