import { Router } from 'express';

import { publicCache } from '#core/http/public-cache.middleware.js';

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

/**
 * The menu is the hottest public read on the platform and identical for every
 * diner at a branch: let nginx/CDN/browsers serve the repeats so a QR rush never
 * reaches Node.
 *
 * Attached PER ROUTE, not via `router.use('/:slug/menu')` — that matches by
 * prefix, which also tagged `/menu/recent` (a per-caller list) as publicly
 * cacheable and would have let a shared cache serve one diner's recent orders
 * to another.
 */
const cacheable = publicCache({ maxAge: 30, staleWhileRevalidate: 120 });

// Static sub-paths BEFORE the product wildcard so they're never swallowed.
router.get('/:slug/menu/search', PublicMenuController.search);
router.get('/:slug/menu/recent', PublicMenuController.recent);
router.get('/:slug/menu', cacheable, PublicMenuController.branchMenu);
router.get('/:slug/products/:productSlug', cacheable, PublicMenuController.product);

export default router;
