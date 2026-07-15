import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { CatalogController } from '../controllers/catalog.controller.js';
import { importFileUpload } from '../middleware/upload.middleware.js';
import { listQuerySchema } from '../validators/common.validators.js';

import { restaurantGuards } from './_guards.js';

const router = Router();

router.use(...restaurantGuards);

/**
 * @openapi
 * /api/v1/restaurant/catalog:
 *   get: { tags: [Catalog], security: [{ bearerAuth: [] }], summary: Full published catalog tree (menu→category→product, cached), responses: { 200: { description: Catalog } } }
 * /api/v1/restaurant/catalog/stats:
 *   get: { tags: [Catalog], security: [{ bearerAuth: [] }], summary: Catalog counts overview (uncached), responses: { 200: { description: Stats } } }
 */
router.get('/', CatalogController.full);
router.get('/stats', CatalogController.stats);

/**
 * @openapi
 * /api/v1/restaurant/catalog/menus/{menuId}:
 *   get: { tags: [Catalog], security: [{ bearerAuth: [] }], summary: One published menu tree (cached), responses: { 200: { description: Menu tree } } }
 */
router.get('/menus/:menuId', CatalogController.menu);

/**
 * @openapi
 * /api/v1/restaurant/catalog/import:
 *   post: { tags: [Catalog], security: [{ bearerAuth: [] }], summary: Import products (CSV/Excel — extension point, 501 until an adapter is bound), responses: { 200: { description: Import result } } }
 * /api/v1/restaurant/catalog/export:
 *   get: { tags: [Catalog], security: [{ bearerAuth: [] }], summary: Export products (CSV/Excel — extension point), responses: { 200: { description: Export payload } } }
 */
router.post('/import', importFileUpload, CatalogController.importProducts);
router.get('/export', validate({ query: listQuerySchema }), CatalogController.exportProducts);

export default router;
