import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { AdminCatalogController } from '../controllers/admin-catalog.controller.js';
import { idParamSchema, listQuerySchema } from '../validators/common.validators.js';
import { listProductsQuerySchema } from '../validators/product.validators.js';

import { adminGuards } from './_guards.js';

const router = Router();

// Platform Super-Admin, inspection/troubleshooting only. A restaurantId query
// param is REQUIRED (a super admin has no primary restaurant); tenant isolation
// is still enforced when the scope is resolved.
router.use(...adminGuards);

/**
 * @openapi
 * /api/v1/admin/catalog/stats:
 *   get: { tags: [Catalog/Admin], security: [{ bearerAuth: [] }], summary: Inspect a restaurant's catalog counts (?restaurantId=), responses: { 200: { description: Stats } } }
 * /api/v1/admin/catalog:
 *   get: { tags: [Catalog/Admin], security: [{ bearerAuth: [] }], summary: Inspect a restaurant's full catalog (?restaurantId=), responses: { 200: { description: Catalog } } }
 */
router.get('/', validate({ query: listQuerySchema }), AdminCatalogController.fullCatalog);
router.get('/stats', validate({ query: listQuerySchema }), AdminCatalogController.stats);

/**
 * @openapi
 * /api/v1/admin/catalog/menus:
 *   get: { tags: [Catalog/Admin], security: [{ bearerAuth: [] }], summary: Inspect a restaurant's menus (?restaurantId=), responses: { 200: { description: Menus } } }
 * /api/v1/admin/catalog/products:
 *   get: { tags: [Catalog/Admin], security: [{ bearerAuth: [] }], summary: Inspect a restaurant's products (?restaurantId=), responses: { 200: { description: Products } } }
 */
router.get('/menus', validate({ query: listQuerySchema }), AdminCatalogController.listMenus);
router.get('/products', validate({ query: listProductsQuerySchema }), AdminCatalogController.listProducts);

/**
 * @openapi
 * /api/v1/admin/catalog/products/{id}:
 *   get: { tags: [Catalog/Admin], security: [{ bearerAuth: [] }], summary: Inspect a product's full detail, responses: { 200: { description: Product detail } } }
 */
router.get('/products/:id', validate({ params: idParamSchema }), AdminCatalogController.productDetail);

export default router;
