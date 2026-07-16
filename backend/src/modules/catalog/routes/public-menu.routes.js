import { Router } from 'express';

import { PublicMenuController } from '../controllers/public-menu.controller.js';

/**
 * Public menu router — mounted at `/public/branches` so it composes with the
 * organization module's `/public/branches/:slug` detail route. Registered from
 * the catalog module, which owns the catalog data.
 *
 * @openapi
 * /api/v1/public/branches/{slug}/menu:
 *   get: { tags: [Public/Menu], summary: A branch's full menu (categories → subcategories → products), responses: { 200: { description: BranchMenu }, 404: { description: Branch not found } } }
 * /api/v1/public/branches/{slug}/menu/search:
 *   get: { tags: [Public/Menu], summary: Search products within a branch's menu, responses: { 200: { description: Products } } }
 * /api/v1/public/branches/{slug}/menu/recent:
 *   get: { tags: [Public/Menu], summary: Recently-ordered products for the caller, responses: { 200: { description: Products } } }
 * /api/v1/public/branches/{slug}/products/{productSlug}:
 *   get: { tags: [Public/Menu], summary: Full product detail (variants/modifiers/add-ons/related), responses: { 200: { description: ProductDetail }, 404: { description: Not found } } }
 */
const router = Router();

// Static sub-paths BEFORE the product wildcard so they're never swallowed.
router.get('/:slug/menu/search', PublicMenuController.search);
router.get('/:slug/menu/recent', PublicMenuController.recent);
router.get('/:slug/menu', PublicMenuController.branchMenu);
router.get('/:slug/products/:productSlug', PublicMenuController.product);

export default router;
