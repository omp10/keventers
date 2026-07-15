/**
 * Module-local DI tokens for the catalog module. Registered by the composition
 * root; other modules resolve catalog services through these tokens (never via
 * `new`) so future POS / ordering modules stay decoupled.
 */
export const CATALOG_TOKENS = Object.freeze({
  // Repositories
  MenuRepository: Symbol('catalog.MenuRepository'),
  CategoryRepository: Symbol('catalog.CategoryRepository'),
  ProductRepository: Symbol('catalog.ProductRepository'),
  VariantRepository: Symbol('catalog.VariantRepository'),
  ModifierGroupRepository: Symbol('catalog.ModifierGroupRepository'),
  ModifierRepository: Symbol('catalog.ModifierRepository'),
  AddonRepository: Symbol('catalog.AddonRepository'),
  ProductAvailabilityRepository: Symbol('catalog.ProductAvailabilityRepository'),

  // Services
  MenuService: Symbol('catalog.MenuService'),
  CategoryService: Symbol('catalog.CategoryService'),
  ProductService: Symbol('catalog.ProductService'),
  VariantService: Symbol('catalog.VariantService'),
  ModifierService: Symbol('catalog.ModifierService'),
  AddonService: Symbol('catalog.AddonService'),
  PricingService: Symbol('catalog.PricingService'),
  AvailabilityService: Symbol('catalog.AvailabilityService'),
  CatalogService: Symbol('catalog.CatalogService'),
  ImportExportService: Symbol('catalog.ImportExportService'),
});

export default CATALOG_TOKENS;
