import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { MenuController } from '../controllers/menu.controller.js';
import { idParamSchema } from '../validators/common.validators.js';
import {
  createMenuSchema,
  listMenusQuerySchema,
  updateMenuSchema,
} from '../validators/menu.validators.js';

import { restaurantGuards } from './_guards.js';

const router = Router();

// Restaurant Manager / Organization Admin, tenant-scoped.
router.use(...restaurantGuards);

/**
 * @openapi
 * /api/v1/restaurant/menus:
 *   get: { tags: [Catalog/Menus], security: [{ bearerAuth: [] }], summary: List menus (pagination/filter/search), responses: { 200: { description: Paginated menus } } }
 *   post: { tags: [Catalog/Menus], security: [{ bearerAuth: [] }], summary: Create a menu, responses: { 201: { description: Created } } }
 */
router
  .route('/')
  .get(validate({ query: listMenusQuerySchema }), MenuController.list)
  .post(validate({ body: createMenuSchema }), MenuController.create);

/**
 * @openapi
 * /api/v1/restaurant/menus/{id}:
 *   get: { tags: [Catalog/Menus], security: [{ bearerAuth: [] }], summary: Get a menu, responses: { 200: { description: Menu } } }
 *   patch: { tags: [Catalog/Menus], security: [{ bearerAuth: [] }], summary: Update a menu, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Catalog/Menus], security: [{ bearerAuth: [] }], summary: Soft-delete a menu, responses: { 200: { description: Deleted } } }
 */
router
  .route('/:id')
  .get(validate({ params: idParamSchema }), MenuController.getById)
  .patch(validate({ params: idParamSchema, body: updateMenuSchema }), MenuController.update)
  .delete(validate({ params: idParamSchema }), MenuController.remove);

/**
 * @openapi
 * /api/v1/restaurant/menus/{id}/publish:
 *   post: { tags: [Catalog/Menus], security: [{ bearerAuth: [] }], summary: Publish a menu (ACTIVE + bump version), responses: { 200: { description: Published } } }
 * /api/v1/restaurant/menus/{id}/archive:
 *   post: { tags: [Catalog/Menus], security: [{ bearerAuth: [] }], summary: Archive a menu, responses: { 200: { description: Archived } } }
 */
router.post('/:id/publish', validate({ params: idParamSchema }), MenuController.publish);
router.post('/:id/archive', validate({ params: idParamSchema }), MenuController.archive);

export default router;
