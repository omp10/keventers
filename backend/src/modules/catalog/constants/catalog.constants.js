/**
 * Restaurant Catalog Management constants. This module owns these. The catalog
 * is the foundation every ordering operation (cart, orders, KDS, inventory)
 * depends on, so the enums here are deliberately stable and namespaced.
 */

/** Menu categorisation (breakfast/lunch/…); free-form label lives in `name`. */
export const MENU_TYPE = Object.freeze({
  REGULAR: 'regular',
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  KIDS: 'kids',
  SEASONAL: 'seasonal',
  FESTIVAL: 'festival',
  BEVERAGES: 'beverages',
  SPECIAL: 'special',
});

/** Menu lifecycle. Only ACTIVE + published menus are visible to customers. */
export const MENU_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  SCHEDULED: 'scheduled',
  ARCHIVED: 'archived',
});

/** Menu audience visibility. */
export const MENU_VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  PRIVATE: 'private',
  HIDDEN: 'hidden',
});

/** Category lifecycle. A category with parentId=null is a MAIN category; a
 * category with a parentId is a SUBCATEGORY. Max hierarchy depth is 2 —
 * enforced by the service layer (a subcategory cannot itself be a parent). */
export const CATEGORY_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

/** Maximum category nesting depth (main → subcategory). Never exceeded. */
export const MAX_CATEGORY_DEPTH = 2;

/** Product lifecycle. */
export const PRODUCT_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
});

/** Coarse product availability flag (independent of scheduled/branch rules). */
export const AVAILABILITY_STATUS = Object.freeze({
  AVAILABLE: 'available',
  OUT_OF_STOCK: 'out_of_stock',
  TEMPORARILY_DISABLED: 'temporarily_disabled',
});

/** Dietary classification tags. */
export const DIETARY_TAG = Object.freeze({
  VEGETARIAN: 'vegetarian',
  VEGAN: 'vegan',
  NON_VEGETARIAN: 'non_vegetarian',
  EGGETARIAN: 'eggetarian',
  GLUTEN_FREE: 'gluten_free',
  DAIRY_FREE: 'dairy_free',
  JAIN: 'jain',
  HALAL: 'halal',
});

/** Common allergen tags (informational; not an exhaustive medical list). */
export const ALLERGEN = Object.freeze({
  MILK: 'milk',
  EGGS: 'eggs',
  FISH: 'fish',
  SHELLFISH: 'shellfish',
  TREE_NUTS: 'tree_nuts',
  PEANUTS: 'peanuts',
  WHEAT: 'wheat',
  SOYBEANS: 'soybeans',
  GLUTEN: 'gluten',
  SESAME: 'sesame',
});

/** Spice levels for products/variants. */
export const SPICE_LEVEL = Object.freeze({
  NONE: 'none',
  MILD: 'mild',
  MEDIUM: 'medium',
  HOT: 'hot',
  EXTRA_HOT: 'extra_hot',
});

/** Product image roles within a gallery. */
export const IMAGE_ROLE = Object.freeze({
  THUMBNAIL: 'thumbnail',
  HERO: 'hero',
  GALLERY: 'gallery',
});

/** Modifier group selection semantics. */
export const MODIFIER_GROUP_TYPE = Object.freeze({
  SINGLE: 'single', // radio — exactly one
  MULTIPLE: 'multiple', // checkbox — many within min/max
});

/** Shared enable/disable status for reusable catalog entities. */
export const ENTITY_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

/** Days of week for time-based availability windows. */
export const DAYS_OF_WEEK = Object.freeze([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

/** Named availability presets (resolved into time windows by the service). */
export const AVAILABILITY_PRESET = Object.freeze({
  ALL_DAY: 'all_day',
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  WEEKDAYS: 'weekdays',
  WEEKENDS: 'weekends',
});

/** Storage folders for catalog imagery (via the Storage Platform). */
export const STORAGE_FOLDERS = Object.freeze({
  PRODUCT_IMAGES: 'catalog/products',
  CATEGORY_IMAGES: 'catalog/categories',
  MENU_IMAGES: 'catalog/menus',
  ADDON_IMAGES: 'catalog/addons',
});

/** Redis cache namespacing for public catalog retrieval. Administrative
 * (tenant-sensitive) data is NEVER cached — only published public catalog. */
export const CATALOG_CACHE = Object.freeze({
  PUBLIC_MENU_PREFIX: 'public-menu',
  PUBLIC_PRODUCT_PREFIX: 'public-product',
  PUBLIC_CATALOG_PREFIX: 'public-catalog',
  TTL_SECONDS: 300,
});

/** Permissions specific to this module (registered with the RBAC platform).
 * `menu/category/product/modifier` CRUD already exist in the identity core
 * catalog; the net-new grants (variant, addon, catalog) are seeded here. */
export const CATALOG_PERMISSIONS = Object.freeze({
  MENU_READ: 'menu:read',
  MENU_CREATE: 'menu:create',
  MENU_UPDATE: 'menu:update',
  MENU_DELETE: 'menu:delete',
  CATEGORY_READ: 'category:read',
  CATEGORY_CREATE: 'category:create',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',
  PRODUCT_READ: 'product:read',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  VARIANT_READ: 'variant:read',
  VARIANT_CREATE: 'variant:create',
  VARIANT_UPDATE: 'variant:update',
  VARIANT_DELETE: 'variant:delete',
  MODIFIER_READ: 'modifier:read',
  MODIFIER_CREATE: 'modifier:create',
  MODIFIER_UPDATE: 'modifier:update',
  MODIFIER_DELETE: 'modifier:delete',
  ADDON_READ: 'addon:read',
  ADDON_CREATE: 'addon:create',
  ADDON_UPDATE: 'addon:update',
  ADDON_DELETE: 'addon:delete',
  CATALOG_READ: 'catalog:read',
  CATALOG_IMPORT: 'catalog:import',
  CATALOG_EXPORT: 'catalog:export',
});

/** Net-new permission catalog rows this module seeds (CRUD already-existing
 * resources are omitted; the identity core seeder created those). */
export const CATALOG_NEW_PERMISSIONS = Object.freeze([
  { resource: 'variant', action: 'create', description: 'Create product variants' },
  { resource: 'variant', action: 'read', description: 'View product variants' },
  { resource: 'variant', action: 'update', description: 'Update product variants' },
  { resource: 'variant', action: 'delete', description: 'Delete product variants' },
  { resource: 'addon', action: 'create', description: 'Create add-ons' },
  { resource: 'addon', action: 'read', description: 'View add-ons' },
  { resource: 'addon', action: 'update', description: 'Update add-ons' },
  { resource: 'addon', action: 'delete', description: 'Delete add-ons' },
  { resource: 'catalog', action: 'read', description: 'Read the aggregated catalog' },
  { resource: 'catalog', action: 'import', description: 'Import catalog data (CSV/Excel)' },
  { resource: 'catalog', action: 'export', description: 'Export catalog data (CSV/Excel)' },
]);

export const CATALOG_ERRORS = Object.freeze({
  MENU_NOT_FOUND: 'Menu not found',
  CATEGORY_NOT_FOUND: 'Category not found',
  PARENT_CATEGORY_NOT_FOUND: 'Parent category not found',
  PRODUCT_NOT_FOUND: 'Product not found',
  VARIANT_NOT_FOUND: 'Variant not found',
  MODIFIER_GROUP_NOT_FOUND: 'Modifier group not found',
  MODIFIER_NOT_FOUND: 'Modifier not found',
  ADDON_NOT_FOUND: 'Add-on not found',
  MAX_DEPTH_EXCEEDED: 'Category hierarchy depth cannot exceed 2 (main → subcategory)',
  SUBCATEGORY_AS_PARENT: 'A subcategory cannot be used as a parent category',
  SELF_PARENT: 'A category cannot be its own parent',
  DUPLICATE_SLUG: 'A catalog entry with this slug already exists in this restaurant',
  DUPLICATE_SKU: 'This SKU is already in use within this restaurant',
  INVALID_MODIFIER_SELECTION: 'Invalid modifier group selection bounds',
  CATEGORY_HAS_CHILDREN: 'Delete or move subcategories before deleting this category',
  CATEGORY_HAS_PRODUCTS: 'Reassign or delete products before deleting this category',
  IMPORT_NOT_IMPLEMENTED: 'Catalog import is not implemented yet (extension point only)',
  EXPORT_NOT_IMPLEMENTED: 'Catalog export is not implemented yet (extension point only)',
  CROSS_TENANT: 'Access to this catalog resource is not allowed',
});
