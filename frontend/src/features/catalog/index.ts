/**
 * RESTAURANT CATALOG MANAGEMENT (Phase F4.2) — menus, categories, products (+ full
 * editor), variants, modifier groups, add-ons, availability, bulk operations, media,
 * and a live customer-menu preview. Built into the F4.1 dashboard shell (no new
 * shell); reuses the Design System, Platform Layer, and the customer ordering menu
 * components for preview. Everything consumes the backend Catalog module.
 */
export { catalogRoutes, type CatalogRoute } from './routes';
export { CatalogLayout } from './CatalogLayout';

export * from './types';
export * from './hooks';
export * from './components';
export * from './bulk';
export * from './filters';
export * from './media';
export {
  productService,
  menuService,
  categoryService,
  modifierGroupService,
  addonService,
  variantService,
  mediaService,
  type BulkAction,
} from './services';
