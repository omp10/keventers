import { container as sharedContainer } from '#core/di/container.js';
import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';

import { CATALOG_PERMISSIONS } from './constants/catalog.constants.js';
import { CATALOG_TOKENS } from './constants/catalog.tokens.js';
import { registerCatalogEventHandlers } from './events/handlers.js';
import { addonRepository } from './repositories/addon.repository.js';
import { categoryRepository } from './repositories/category.repository.js';
import { menuRepository } from './repositories/menu.repository.js';
import { modifierGroupRepository } from './repositories/modifier-group.repository.js';
import { modifierRepository } from './repositories/modifier.repository.js';
import { productAvailabilityRepository } from './repositories/product-availability.repository.js';
import { productRepository } from './repositories/product.repository.js';
import { variantRepository } from './repositories/variant.repository.js';
import catalogRouter from './routes/index.js';
import { addonService } from './services/addon.service.js';
import { availabilityService } from './services/availability.service.js';
import { catalogService } from './services/catalog.service.js';
import { categoryService } from './services/category.service.js';
import { importExportService } from './services/import-export.service.js';
import { menuService } from './services/menu.service.js';
import { modifierService } from './services/modifier.service.js';
import { pricingService } from './services/pricing.service.js';
import { productService } from './services/product.service.js';
import { variantService } from './services/variant.service.js';

/**
 * Restaurant Catalog Management module composition. Mounted at the API v1 root
 * (basePath '/') with SPECIFIC catalog sub-paths (see routes/index.js). It is
 * registered BEFORE the organization module so its exact `/restaurant/menus`,
 * `/restaurant/products`, … mounts win, while non-catalog `/restaurant/*` and
 * `/admin/*` requests fall through to the organization module.
 *
 * The catalog INHERITS multi-tenancy from the organization module (Membership +
 * tenant context) rather than re-implementing it.
 */
export const catalogModule = {
  name: 'catalog',
  basePath: '/',
  router: catalogRouter,

  registerDependencies(container = sharedContainer) {
    // Repositories
    container.register(CATALOG_TOKENS.MenuRepository, menuRepository);
    container.register(CATALOG_TOKENS.CategoryRepository, categoryRepository);
    container.register(CATALOG_TOKENS.ProductRepository, productRepository);
    container.register(CATALOG_TOKENS.VariantRepository, variantRepository);
    container.register(CATALOG_TOKENS.ModifierGroupRepository, modifierGroupRepository);
    container.register(CATALOG_TOKENS.ModifierRepository, modifierRepository);
    container.register(CATALOG_TOKENS.AddonRepository, addonRepository);
    container.register(CATALOG_TOKENS.ProductAvailabilityRepository, productAvailabilityRepository);

    // Services
    container.register(CATALOG_TOKENS.MenuService, menuService);
    container.register(CATALOG_TOKENS.CategoryService, categoryService);
    container.register(CATALOG_TOKENS.ProductService, productService);
    container.register(CATALOG_TOKENS.VariantService, variantService);
    container.register(CATALOG_TOKENS.ModifierService, modifierService);
    container.register(CATALOG_TOKENS.AddonService, addonService);
    container.register(CATALOG_TOKENS.PricingService, pricingService);
    container.register(CATALOG_TOKENS.AvailabilityService, availabilityService);
    container.register(CATALOG_TOKENS.CatalogService, catalogService);
    container.register(CATALOG_TOKENS.ImportExportService, importExportService);
  },

  bootstrapRbac() {
    permissionRegistry.registerMany(Object.values(CATALOG_PERMISSIONS));
  },

  registerEventHandlers(eventBus = sharedEventBus) {
    registerCatalogEventHandlers(eventBus);
  },

  register({ container = sharedContainer, eventBus = sharedEventBus } = {}) {
    this.registerDependencies(container);
    this.bootstrapRbac();
    this.registerEventHandlers(eventBus);
    logger().info({ module: this.name }, 'Catalog module registered');
    return this;
  },
};

export default catalogModule;
