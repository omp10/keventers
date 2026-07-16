import { Router } from 'express';

import adminCatalogRoutes from './admin-catalog.routes.js';
import addonRoutes from './addon.routes.js';
import catalogRoutes from './catalog.routes.js';
import categoryRoutes from './category.routes.js';
import menuRoutes from './menu.routes.js';
import modifierRoutes from './modifier.routes.js';
import productRoutes from './product.routes.js';
import publicMenuRoutes from './public-menu.routes.js';
import variantRoutes from './variant.routes.js';

/**
 * Catalog module router. Mounted at the API v1 root (basePath '/') using
 * SPECIFIC full-path sub-mounts so it composes cleanly with the organization
 * module's broad `/restaurant` router: a request that does not match one of
 * these exact prefixes falls through to the organization module. The catalog
 * module is registered BEFORE organization so its specific catalog paths win.
 *
 *   /api/v1/restaurant/menus/...
 *   /api/v1/restaurant/categories/...
 *   /api/v1/restaurant/products/...      (+ nested /:productId/variants)
 *   /api/v1/restaurant/variants/...
 *   /api/v1/restaurant/modifiers/...
 *   /api/v1/restaurant/addons/...
 *   /api/v1/restaurant/catalog/...       (aggregated + import/export)
 *   /api/v1/admin/catalog/...            (super-admin inspection)
 *   /api/v1/public/branches/:slug/menu   (customer menu — see note below)
 */
const router = Router();

// Customer-facing menu. Mounted on the same `/public/branches` prefix the
// organization module uses for branch detail; because catalog is registered
// first, these deeper paths match here and anything else falls through to it.
router.use('/public/branches', publicMenuRoutes);

router.use('/restaurant/menus', menuRoutes);
router.use('/restaurant/categories', categoryRoutes);
router.use('/restaurant/products', productRoutes);
router.use('/restaurant/variants', variantRoutes);
router.use('/restaurant/modifiers', modifierRoutes);
router.use('/restaurant/addons', addonRoutes);
router.use('/restaurant/catalog', catalogRoutes);
router.use('/admin/catalog', adminCatalogRoutes);

export default router;
